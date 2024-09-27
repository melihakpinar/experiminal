import {
    Bool,
    Field,
    SmartContract,
    State,
    method,
    MerkleMapWitness,
    state,
    Nullifier,
    UInt64,
} from 'o1js';

export class Experiminal extends SmartContract {
    @state(Field) keyAnswers = State<Field>();
    @state(Field) nullifiersMerkleRoot = State<Field>();
    @state(Field) participantsDataRoot = State<Field>();
    @state(Field) participantsCount = State<Field>();
    @state(Field) endTimestamp = State<Field>();
    @state(Bool) isInitialized = State<Bool>();

    init() {
        super.init();
        this.keyAnswers.set(Field(0));
        this.nullifiersMerkleRoot.set(Field(0));
        this.participantsDataRoot.set(Field(0));
        this.participantsCount.set(Field(0));
        this.endTimestamp.set(Field(0));
        this.isInitialized.set(Bool(false));
    }

    @method async initState(
        initialNullifiersMerkleRoot: Field,
        initialParticipantsDataRoot: Field,
        correctKeyAnswers: Field,
        endTimestamp: Field,
    ): Promise<void> {
        // Check if the contract is initialized
        const isInitialized = this.isInitialized.getAndRequireEquals();
        isInitialized.assertEquals(Bool(false));
        // Initialize the contract
        this.keyAnswers.set(correctKeyAnswers);
        this.nullifiersMerkleRoot.set(initialNullifiersMerkleRoot);
        this.participantsDataRoot.set(initialParticipantsDataRoot);
        this.participantsCount.set(Field(0));
        this.endTimestamp.set(endTimestamp);
        this.isInitialized.set(Bool(true));
    }

    @method async addParticipantIfEligible(
        nullifier: Nullifier,
        nullifierWitness: MerkleMapWitness,
        participantDataHash: Field,
        participantDataWitness: MerkleMapWitness,
    ): Promise<void> {
        // Check if the contract is initialized
        const isInitialized = this.isInitialized.getAndRequireEquals();
        isInitialized.assertEquals(Bool(true));
        // Check if the participant responded all the key questions correctly
        const keyAnswers = this.keyAnswers.getAndRequireEquals();
        nullifier.verify([keyAnswers]);
        // Check if deadline has not passed
        const currentTimestamp = this.network.timestamp.getAndRequireEquals();
        const endTimestamp = this.endTimestamp.getAndRequireEquals();
        const endTimestampConverted = UInt64.fromFields([endTimestamp]);
        currentTimestamp.assertLessThanOrEqual(endTimestampConverted);
        // Check if the participant has not already participated
        const currentNullifierRoot = this.nullifiersMerkleRoot.getAndRequireEquals();
        nullifier.assertUnusedV2(nullifierWitness, currentNullifierRoot);
        // Add the participant and update the nullifier root & participants count
        const newRoot = nullifier.setUsedV2(nullifierWitness);
        this.nullifiersMerkleRoot.set(newRoot);
        const participantsCount = this.participantsCount.getAndRequireEquals();
        const newCount = participantsCount.add(Field(1));
        this.participantsCount.set(newCount);
        // Add the participant data to the participants data tree
        const currentParticipantsDataRoot = this.participantsDataRoot.getAndRequireEquals();
        const [computedRootBefore, computedKey] = participantDataWitness.computeRootAndKeyV2(Field(0));
        computedKey.assertEquals(participantDataHash);
        computedRootBefore.assertEquals(currentParticipantsDataRoot);
        const [computedRootAfter, _] = participantDataWitness.computeRootAndKeyV2(Field(1));
        this.participantsDataRoot.set(computedRootAfter);
    }
}
