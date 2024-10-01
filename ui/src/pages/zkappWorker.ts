import { Field, MerkleMap, Mina, Nullifier, PublicKey, fetchAccount } from 'o1js';

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

import type { Experiminal } from '../../../contracts/src/Experiminal';
import { create } from 'domain';
import { get } from 'http';

const state = {
  Experiminal: null as null | typeof Experiminal,
  zkapp: null as null | Experiminal,
  transaction: null as null | Transaction,
};

// ---------------------------------------------------------------------------------------

const functions = {
  setActiveInstanceToDevnet: async (args: {}) => {
    const Network = Mina.Network(
      'https://api.minascan.io/node/devnet/v1/graphql'
    );
    console.log('Devnet network instance configured.');
    Mina.setActiveInstance(Network);
  },
  loadContract: async (args: {}) => {
    const { Experiminal } = await import('../../../contracts/build/src/Experiminal.js');
    state.Experiminal = Experiminal;
  },
  compileContract: async (args: {}) => {
    await state.Experiminal!.compile();
  },
  fetchAccount: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    return await fetchAccount({ publicKey });
  },
  initZkappInstance: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    state.zkapp = new state.Experiminal!(publicKey);
  },
  getParticipantsCount: async (args: {}) => {
    const currentParticipantsCount = await state.zkapp!.participantsCount.get();
    return JSON.stringify(currentParticipantsCount.toJSON());
  },
  getEndTimestamp: async (args: {}) => {
    const endTimestamp = await state.zkapp!.endTimestamp.get();
    return JSON.stringify(endTimestamp.toJSON());
  },
  getIsInitialized: async (args: {}) => {
    const isInitialized = await state.zkapp!.isInitialized.get();
    return JSON.stringify(isInitialized.toJSON());
  },
  createInitStateTransaction: async (args: {initialNullifiersMerkleRoot: Field, initialParticipantsDataRoot: Field, correctKeyAnswers: Field, endTimestamp: Field}) => {
    const transaction = await Mina.transaction(async () => {
      await state.zkapp!.initState(args.initialNullifiersMerkleRoot, args.initialParticipantsDataRoot, args.correctKeyAnswers, args.endTimestamp);
    });
    state.transaction = transaction;
  },
  createAddParticipantTransaction: async (args: {nullifierJson: any, participantData: Field}) => {
    const nullifier = Nullifier.fromJSON(args.nullifierJson);
    const nullifierKey = nullifier.key();
    const nullifierMerkleMap = new MerkleMap();
    const participantDataMerkleMap = new MerkleMap();
    const nullifierWitness = nullifierMerkleMap.getWitness(nullifierKey);
    console.log('participantDataMerkleMap:', participantDataMerkleMap);
    const participantData = args.participantData;
    console.log('participantData:', participantData);
    const participantDataWitness = participantDataMerkleMap.getWitness(participantData);
    const transaction = await Mina.transaction(async () => {
      await state.zkapp!.addParticipantIfEligible(nullifier, nullifierWitness, participantData, participantDataWitness);
    });
    state.transaction = transaction;
  },
  proveTransaction: async (args: {}) => {
    return state.transaction!.prove();
  },
  getTransactionJSON: async (args: {}) => {
    return state.transaction!.toJSON();
  },
};

export type WorkerFunctions = keyof typeof functions;

export type ZkappWorkerRequest = {
  id: number;
  fn: WorkerFunctions;
  args: any;
};

export type ZkappWorkerResponse = {
  id: number;
  data: any;
};

if (typeof window !== 'undefined') {
  addEventListener(
    'message',
    async (event: MessageEvent<ZkappWorkerRequest>) => {
      console.log('Worker received message:', event.data);
      const returnData = await functions[event.data.fn](event.data.args);
      const message: ZkappWorkerResponse = {
        id: event.data.id,
        data: returnData,
      };
      postMessage(message);
    }
  );
}

console.log('Web Worker Successfully Initialized.');
