import { AccountUpdate, Bool, Field, MerkleMap, Mina, Nullifier, PrivateKey, PublicKey } from 'o1js';
import { Experiminal } from './Experiminal';

let proofsEnabled = false;

describe('Experiminal', () => {
  let deployerAccount: Mina.TestPublicKey,
    deployerKey: PrivateKey,
    senderAccount: Mina.TestPublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Experiminal;

  beforeAll(async () => {
    if (proofsEnabled) await Experiminal.compile();
  });

  beforeEach(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [deployerAccount, senderAccount] = Local.testAccounts;
    deployerKey = deployerAccount.key;
    senderKey = senderAccount.key;
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Experiminal(zkAppAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      await zkApp.deploy();
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `Experiminal` smart contract', async () => {
    await localDeploy();
    const participantsCount = zkApp.participantsCount.get();
    expect(participantsCount).toEqual(Field(0));
  });

  it('correctly initializes the state', async () => {
    await localDeploy();
    const nullifierTree = new MerkleMap();
    const nullifierTreeRoot = nullifierTree.getRoot();
    const participantDataTree = new MerkleMap();
    const participantDataTreeRoot = participantDataTree.getRoot();
    const txn = await Mina.transaction(senderAccount, async () => {
        await zkApp.initState(nullifierTreeRoot, participantDataTreeRoot, Field(500), Field(22000));
    });
    await txn.prove();
    await txn.sign([senderKey]).send();
    const participantsCount = zkApp.participantsCount.getAndRequireEquals();
    const correctKeyAnswers = zkApp.keyAnswers.getAndRequireEquals();
    const endTimestamp = zkApp.endTimestamp.getAndRequireEquals();
    const isInitialized = zkApp.isInitialized.getAndRequireEquals();
    expect(participantsCount).toEqual(Field(0));
    expect(correctKeyAnswers).toEqual(Field(500));
    expect(endTimestamp).toEqual(Field(22000));
    expect(isInitialized).toEqual(Bool(true));
  });
  it('correctly adds two different participants', async () => {
    await localDeploy();
    const nullifierTree = new MerkleMap();
    const nullifierTreeRoot = nullifierTree.getRoot();
    const participantDataTree = new MerkleMap();
    const participantDataTreeRoot = participantDataTree.getRoot();
    const currentTimestamp = Field(new Date().getTime() + 1000000);
    const txn = await Mina.transaction(senderAccount, async () => {
        await zkApp.initState(nullifierTreeRoot, participantDataTreeRoot, Field(500), currentTimestamp);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();
    const firstUser = Mina.TestPublicKey.random();
    const firstNullifier = Nullifier.fromJSON(Nullifier.createTestNullifier(
        [Field(500)],
        firstUser.key,
    ));
    const secondUser = Mina.TestPublicKey.random();
    const secondNullifier = Nullifier.fromJSON(Nullifier.createTestNullifier(
        [Field(500)],
        secondUser.key,
    ));
    const firstParticipantData = Field(9999);
    const firstWitness = nullifierTree.getWitness(firstNullifier.key());
    const firstParticipantDataWitness = participantDataTree.getWitness(firstParticipantData);
    const firstTxn = await Mina.transaction(senderAccount, async () => {
        await zkApp.addParticipantIfEligible(firstNullifier, firstWitness, firstParticipantData, firstParticipantDataWitness);
    });
    await firstTxn.prove();
    await firstTxn.sign([senderKey]).send();
    nullifierTree.set(firstNullifier.key(), Field(1));
    participantDataTree.set(firstParticipantData, Field(1));
    const secondParticipantData = Field(15032002);
    const secondWitness = nullifierTree.getWitness(secondNullifier.key());
    const secondParticipantDataWitness = participantDataTree.getWitness(secondParticipantData);
    const firstParticipantsCount = zkApp.participantsCount.getAndRequireEquals();
    expect(firstParticipantsCount).toEqual(Field(1));
    const secondTxn = await Mina.transaction(senderAccount, async () => {
        await zkApp.addParticipantIfEligible(secondNullifier, secondWitness, secondParticipantData, secondParticipantDataWitness);
    });
    await secondTxn.prove();
    await secondTxn.sign([senderKey]).send();
    const secondParticipantsCount = zkApp.participantsCount.getAndRequireEquals();
    expect(secondParticipantsCount).toEqual(Field(2));
  });
  it('prevents adding a participant twice', async () => {
    await localDeploy();
    const nullifierTree = new MerkleMap();
    const nullifierTreeRoot = nullifierTree.getRoot();
    const participantDataTree = new MerkleMap();
    const participantDataTreeRoot = participantDataTree.getRoot();
    const currentTimestamp = Field(new Date().getTime() + 1000000);
    const txn = await Mina.transaction(senderAccount, async () => {
        await zkApp.initState(nullifierTreeRoot, participantDataTreeRoot, Field(500), currentTimestamp);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();
    const firstUser = Mina.TestPublicKey.random();
    const firstNullifier = Nullifier.fromJSON(Nullifier.createTestNullifier(
        [Field(500)],
        firstUser.key,
    ));
    const secondNullifier = Nullifier.fromJSON(Nullifier.createTestNullifier(
        [Field(500)],
        firstUser.key,
    ));
    const firstParticipantData = Field(9999);
    const firstWitness = nullifierTree.getWitness(firstNullifier.key());
    const firstParticipantDataWitness = participantDataTree.getWitness(firstParticipantData);
    const firstTxn = await Mina.transaction(senderAccount, async () => {
        await zkApp.addParticipantIfEligible(firstNullifier, firstWitness, firstParticipantData, firstParticipantDataWitness);
    });
    await firstTxn.prove();
    await firstTxn.sign([senderKey]).send();
    nullifierTree.set(firstNullifier.key(), Field(1));
    participantDataTree.set(firstParticipantData, Field(1));
    const secondParticipantData = Field(15032002);
    const secondWitness = nullifierTree.getWitness(secondNullifier.key());
    const secondParticipantDataWitness = participantDataTree.getWitness(secondParticipantData);
    const firstParticipantsCount = zkApp.participantsCount.getAndRequireEquals();
    expect(firstParticipantsCount).toEqual(Field(1));
    try {
        const secondTxn = await Mina.transaction(senderAccount, async () => {
            await zkApp.addParticipantIfEligible(secondNullifier, secondWitness, secondParticipantData, secondParticipantDataWitness);
        });
        await secondTxn.prove();
        await secondTxn.sign([senderKey]).send();
    } catch (error) {
        expect(error).toBeInstanceOf(Error);
    }
    const secondParticipantsCount = zkApp.participantsCount.getAndRequireEquals();
    expect(secondParticipantsCount).toEqual(Field(1));
  });
  it('add a participant and then prove', async () => {
    await localDeploy();
    const nullifierTree = new MerkleMap();
    const nullifierTreeRoot = nullifierTree.getRoot();
    const participantDataTree = new MerkleMap();
    const participantDataTreeRoot = participantDataTree.getRoot();
    const currentTimestamp = Field(new Date().getTime() + 1000000);
    const txn = await Mina.transaction(senderAccount, async () => {
        await zkApp.initState(nullifierTreeRoot, participantDataTreeRoot, Field(500), currentTimestamp);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();
    const firstUser = Mina.TestPublicKey.random();
    const firstNullifier = Nullifier.fromJSON(Nullifier.createTestNullifier(
        [Field(500)],
        firstUser.key,
    ));
    const firstParticipantData = Field(9999);
    const firstWitness = nullifierTree.getWitness(firstNullifier.key());
    const firstParticipantDataWitness = participantDataTree.getWitness(firstParticipantData);
    const firstTxn = await Mina.transaction(senderAccount, async () => {
        await zkApp.addParticipantIfEligible(firstNullifier, firstWitness, firstParticipantData, firstParticipantDataWitness);
    });
    await firstTxn.prove();
    await firstTxn.sign([senderKey]).send();
    nullifierTree.set(firstNullifier.key(), Field(1));
    participantDataTree.set(firstParticipantData, Field(1));
    const firstParticipantsCount = zkApp.participantsCount.getAndRequireEquals();
    expect(firstParticipantsCount).toEqual(Field(1));
    const onChainParticipantsDataRoot = zkApp.participantsDataRoot.getAndRequireEquals();
    const expectedParticipantsDataRoot = participantDataTree.getRoot();
    expect(onChainParticipantsDataRoot).toEqual(expectedParticipantsDataRoot);
    });
});
