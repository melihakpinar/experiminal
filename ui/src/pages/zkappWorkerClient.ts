import { Field, PublicKey, fetchAccount } from 'o1js';
import type { WorkerFunctions, ZkappWorkerResponse, ZkappWorkerRequest } from './zkappWorker';

export default class ZkappWorkerClient {
  private worker: Worker;
  private promises: { [id: number]: { resolve: (res: any) => void; reject: (err: any) => void } };
  private nextId: number;

  constructor() {
    this.worker = new Worker(new URL('./zkappWorker.ts', import.meta.url));
    this.promises = {};
    this.nextId = 0;

    this.worker.onmessage = (event: MessageEvent<ZkappWorkerResponse>) => {
      this.promises[event.data.id].resolve(event.data.data);
      delete this.promises[event.data.id];
    };
  }

  private _call(fn: WorkerFunctions, args: any) {
    return new Promise((resolve, reject) => {
      this.promises[this.nextId] = { resolve, reject };
      const message: ZkappWorkerRequest = { id: this.nextId, fn, args };
      this.worker.postMessage(message);
      this.nextId++;
    });
  }

  setActiveInstanceToDevnet() {
    return this._call('setActiveInstanceToDevnet', {});
  }

  loadContract() {
    return this._call('loadContract', {});
  }

  compileContract() {
    return this._call('compileContract', {});
  }
  
  fetchAccount({ publicKey }: { publicKey: PublicKey }): ReturnType<typeof fetchAccount> {
    return this._call('fetchAccount', {
      publicKey58: publicKey.toBase58(),
    }) as ReturnType<typeof fetchAccount>;
  }

  initZkappInstance(publicKey: PublicKey) {
    return this._call('initZkappInstance', {
      publicKey58: publicKey.toBase58(),
    });
  }

  async getParticipantsCount(): Promise<Field> {
    const result = await this._call('getParticipantsCount', {});
    return Field.fromJSON(JSON.parse(result as string));
  }

  async getEndTimestamp(): Promise<Field> {
    const result = await this._call('getEndTimestamp', {});
    return Field.fromJSON(JSON.parse(result as string));
  }

  async getIsInitialized(): Promise<boolean> {
    const result = await this._call('getIsInitialized', {});
    return JSON.parse(result as string);
  }

  createAddParticipantTransaction(nullifierJson: any, participantData: bigint) {
    return this._call('createAddParticipantTransaction', { nullifierJson, participantData });
  }

  createInitStateTransaction(
    initialNullifiersMerkleRoot: bigint,
    initialParticipantsDataRoot: bigint,
    correctKeyAnswers: bigint,
    endTimestamp: bigint
  ) {
    return this._call('createInitStateTransaction', {
      initialNullifiersMerkleRoot,
      initialParticipantsDataRoot,
      correctKeyAnswers,
      endTimestamp
    });
  }

  proveTransaction() {
    return this._call('proveTransaction', {});
  }

  async getTransactionJSON() {
    return this._call('getTransactionJSON', {});
  }
}
