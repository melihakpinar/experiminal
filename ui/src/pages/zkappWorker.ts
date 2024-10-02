import { Field, MerkleMap, Mina, Nullifier, PublicKey, fetchAccount } from 'o1js';
import type { Experiminal } from '../../../contracts/src/Experiminal';

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

const state = {
  Experiminal: null as null | typeof Experiminal,
  zkapp: null as null | Experiminal,
  transaction: null as null | Transaction,
};

const functions = {
  setActiveInstanceToDevnet: async () => {
    const Network = Mina.Network('https://api.minascan.io/node/devnet/v1/graphql');
    console.log('Devnet network instance configured.');
    Mina.setActiveInstance(Network);
  },

  loadContract: async () => {
    const { Experiminal } = await import('../../../contracts/build/src/Experiminal.js');
    state.Experiminal = Experiminal;
  },

  compileContract: async () => {
    await state.Experiminal!.compile();
  },

  fetchAccount: async ({ publicKey58 }: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(publicKey58);
    return await fetchAccount({ publicKey });
  },

  initZkappInstance: async ({ publicKey58 }: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(publicKey58);
    state.zkapp = new state.Experiminal!(publicKey);
  },

  getParticipantsCount: async () => {
    const currentParticipantsCount = await state.zkapp!.participantsCount.get();
    return JSON.stringify(currentParticipantsCount.toJSON());
  },

  getEndTimestamp: async () => {
    const endTimestamp = await state.zkapp!.endTimestamp.get();
    return JSON.stringify(endTimestamp.toJSON());
  },

  getIsInitialized: async () => {
    const isInitialized = await state.zkapp!.isInitialized.get();
    return JSON.stringify(isInitialized.toJSON());
  },

  createInitStateTransaction: async (args: {
    initialNullifiersMerkleRoot: Field,
    initialParticipantsDataRoot: Field,
    correctKeyAnswers: Field,
    endTimestamp: Field
  }) => {
    const transaction = await Mina.transaction(() => 
      state.zkapp!.initState(
        args.initialNullifiersMerkleRoot,
        args.initialParticipantsDataRoot,
        args.correctKeyAnswers,
        args.endTimestamp
      )
    );
    state.transaction = transaction;
  },

  createAddParticipantTransaction: async (args: { nullifierJson: any, participantData: bigint }) => {
    const nullifier = Nullifier.fromJSON(args.nullifierJson);
    const nullifierMerkleMap = new MerkleMap();
    const participantDataMerkleMap = new MerkleMap();
    const nullifierKey = nullifier.key();
    const nullifierWitness = nullifierMerkleMap.getWitness(nullifierKey);
    const participantData = Field(args.participantData);
    const participantDataWitness = participantDataMerkleMap.getWitness(participantData);
    
    const transaction = await Mina.transaction(() => 
      state.zkapp!.addParticipantIfEligible(nullifier, nullifierWitness, participantData, participantDataWitness)
    );
    state.transaction = transaction;
  },

  proveTransaction: async () => {
    return state.transaction!.prove();
  },

  getTransactionJSON: async () => {
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
  addEventListener('message', async (event: MessageEvent<ZkappWorkerRequest>) => {
    console.log('event.data.args', event.data.args);
    const returnData = await functions[event.data.fn](event.data.args);
    const message: ZkappWorkerResponse = { id: event.data.id, data: returnData };
    postMessage(message);
  });
}

console.log('Web Worker Successfully Initialized.');
