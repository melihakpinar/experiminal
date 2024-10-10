import { Field, MerkleMap, Mina, Nullifier, PublicKey, fetchAccount } from 'o1js';
import type { Experiminal } from '../../../contracts/src/Experiminal';

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

const state = {
  Experiminal: null as null | typeof Experiminal,
  zkapp: null as null | Experiminal,
  transaction: null as null | Transaction,
};

const functions = {
  setActiveInstanceToDevnet: async (args: {}) => {
    const Network = Mina.Network('https://api.minascan.io/node/devnet/v1/graphql');
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

  createInitStateTransaction: async (args: {
    initialNullifiersMerkleRoot: bigint,
    initialParticipantsDataRoot: bigint,
    correctKeyAnswers: bigint,
    endTimestamp: bigint
  }) => {
    if (typeof args.initialNullifiersMerkleRoot !== 'bigint') {
        throw new Error('initialNullifiersMerkleRoot must be a bigint');
    }
    if (typeof args.initialParticipantsDataRoot !== 'bigint') {
        throw new Error('initialParticipantsDataRoot must be a bigint');
    }
    if (typeof args.correctKeyAnswers !== 'bigint') {
        throw new Error('correctKeyAnswers must be a bigint');
    }
    if (typeof args.endTimestamp !== 'bigint') {
        throw new Error('endTimestamp must be a bigint');
    }
    console.log('Creating init state transaction');
    const transaction = await Mina.transaction(() => 
      state.zkapp!.initState(
        Field(args.initialNullifiersMerkleRoot),
        Field(args.initialParticipantsDataRoot),
        Field(args.correctKeyAnswers),
        Field(args.endTimestamp)
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

  proveTransaction: async (args: {}) => {
    await state.transaction!.prove();
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
  addEventListener('message', async (event: MessageEvent<ZkappWorkerRequest>) => {
    console.log('event.data.fn', event.data.fn);
    console.log('event.data.args', event.data.args);
    const returnData = await functions[event.data.fn](event.data.args);
    const message: ZkappWorkerResponse = { id: event.data.id, data: returnData };
    postMessage(message);
  });
}

console.log('Web Worker Successfully Initialized.');
