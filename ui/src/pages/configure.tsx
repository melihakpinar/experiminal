import { Field, Poseidon, PublicKey } from 'o1js';
import { useEffect, useState } from 'react';
import styles from '../styles/Home.module.css';
import ZkappWorkerClient from './zkappWorkerClient';
import axios from 'axios';

const zkappAddress = "B62qqt7DfCodB6QUQfCahi74LQjeNgNpondae4GTeA5SQvMTDShnZ6w";
const transactionFee = 0;

export default function Home() {
    const [state, setState] = useState({
        zkappWorkerClient: null as null | ZkappWorkerClient,
        hasWallet: null as null | boolean,
        hasBeenSetup: false,
        accountExists: false,
        currentParticipantCount: null as null | Field,
        publicKey: null as null | PublicKey,
        zkappPublicKey: null as null | PublicKey,
        creatingTransaction: false,
    });

    const [displayText, setDisplayText] = useState('');
    const [transactionLink, setTransactionLink] = useState('');
    const [question_count, setQuestionCount] = useState(1);
    const [is_configured, setIsConfigured] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const timeout = (seconds: number): Promise<void> => {
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    resolve();
                }, seconds * 1000);
            });
        };

        const setupZkApp = async () => {
            if (!state.hasBeenSetup) {
                setDisplayText('Loading web worker...');
                console.log('Loading web worker...');
                const zkappWorkerClient = new ZkappWorkerClient();
                await timeout(5);

                setDisplayText('Done loading web worker');
                console.log('Done loading web worker');
                await zkappWorkerClient.setActiveInstanceToDevnet();

                const mina = (window as any).mina;
                if (!mina) {
                    setState({ ...state, hasWallet: false });
                    return;
                }

                const publicKeyBase58: string = (await mina.requestAccounts())[0];
                const publicKey = PublicKey.fromBase58(publicKeyBase58);
                console.log(`Using key: ${publicKey.toBase58()}`);
                setDisplayText(`Using key: ${publicKey.toBase58()}`);

                setDisplayText('Checking if fee payer account exists...');
                console.log('Checking if fee payer account exists...');
                const res = await zkappWorkerClient.fetchAccount({ publicKey });
                const accountExists = res.error == null;

                await zkappWorkerClient.loadContract();
                console.log('Compiling zkApp...');
                setDisplayText('Compiling zkApp...');
                await zkappWorkerClient.compileContract();
                console.log('zkApp compiled');
                setDisplayText('zkApp compiled...');

                const zkappPublicKey = PublicKey.fromBase58(zkappAddress);
                await zkappWorkerClient.initZkappInstance(zkappPublicKey);

                console.log('Getting zkApp state...');
                setDisplayText('Getting zkApp state...');
                await zkappWorkerClient.fetchAccount({ publicKey: zkappPublicKey });
                const currentParticipantCount = await zkappWorkerClient.getParticipantsCount();
                console.log(`Current state in zkApp: ${currentParticipantCount.toString()}`);
                setDisplayText('');

                setState({
                    ...state,
                    zkappWorkerClient,
                    hasWallet: true,
                    hasBeenSetup: true,
                    publicKey,
                    zkappPublicKey,
                    accountExists,
                    currentParticipantCount,
                });
            }
        };

        setupZkApp();
    }, [state]);

    const getCurrentParticipantCount = async () => {
        console.log('Getting zkApp state...');
        setDisplayText('Getting zkApp state...');
        await state.zkappWorkerClient!.fetchAccount({
            publicKey: state.zkappPublicKey!,
        });
        const currentParticipantCount = await state.zkappWorkerClient!.getParticipantsCount();
        setState({ ...state, currentParticipantCount });
        console.log(`Current state in zkApp: ${currentParticipantCount.toString()}`);
        setDisplayText('');
    };

    useEffect(() => {
        if (state.hasBeenSetup && state.accountExists) {
            getCurrentParticipantCount();
        }
    }, [state.hasBeenSetup, state.accountExists]);

    useEffect(() => {
        const waitForAccountExistence = async () => {
            if (state.hasBeenSetup && !state.accountExists) {
                while (true) {
                    setDisplayText('Checking if fee payer account exists...');
                    console.log('Checking if fee payer account exists...');
                    const res = await state.zkappWorkerClient!.fetchAccount({
                        publicKey: state.publicKey!,
                    });
                    const accountExists = res.error == null;
                    if (accountExists) {
                        setState({ ...state, accountExists: true });
                        break;
                    }
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                }
            }
        };

        waitForAccountExistence();
    }, [state.hasBeenSetup]);

    const fetchConfiguration = async () => {
        try {
            const response = await axios.get('/api/get_configuration');
            const config = response.data;
            if (Object.keys(config).length > 0) {
                setIsConfigured(true);
            }
        } catch (error) {
            console.error('Error fetching configuration:', error);
        }
    };

    useEffect(() => {
        fetchConfiguration();
    }, []);

    const handleIsKeyChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const isKey = e.target.checked;
        const answerYesInput = document.getElementById(`qyes${index}`) as HTMLInputElement;
        const answerNoInput = document.getElementById(`qno${index}`) as HTMLInputElement;  
        answerYesInput.required = isKey;
        answerNoInput.required = isKey;
        answerYesInput.disabled = !isKey;
        answerNoInput.disabled = !isKey;
        answerYesInput.checked = false;
        answerNoInput.checked = false;
    }

    const handleConfigurationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = document.querySelector('form') as HTMLFormElement;
        if (!form.checkValidity()) {
            setMessage('Please answer all questions.');
            return;
        }
        const end_time= document.getElementById('end_timestamp') as HTMLInputElement;
        const end_timestamp = new Date(end_time.value).getTime();
        const question_texts = Array.from(form.elements)
            .filter((el) => (el as HTMLInputElement).id.startsWith('questionText'))
            .map((el) => (el as HTMLInputElement).value);
        const key_questions = Array.from(form.elements)
            .filter((el) => (el as HTMLInputElement).id.startsWith('isKey'))
            .map((el) => (el as HTMLInputElement).checked);
        const yes_answers = Array.from(form.elements)
            .filter((el) => (el as HTMLInputElement).id.startsWith("qyes"))
            .map((el) => (el as HTMLInputElement).checked);
        const no_answers = Array.from(form.elements)
            .filter((el) => (el as HTMLInputElement).id.startsWith("qno"))
            .map((el) => (el as HTMLInputElement).checked);
        if (question_texts.length != key_questions.length || question_texts.length != yes_answers.length || question_texts.length != no_answers.length) {
            setMessage('Please answer all questions.');
            return;
        }
        const data = question_texts.map((question, index) => ({
            question_text: question,
            is_key: key_questions[index],
            yes_answer: yes_answers[index],
            no_answer: no_answers[index]
        }));
        for (const question of data) {
            if (question.is_key) {
                if (!question.yes_answer && !question.no_answer) {
                    setMessage('Key questions must have a yes or no answer.');
                    return;
                }
            }
            if (question.question_text == "") {
                setMessage('Question text cannot be empty.');
                return;
            }
        }
        const key_question_answers = data.filter((question) => question.is_key).map((question) => question.yes_answer ? 1 : 0);
        console.log("key_question_answers.map((ans) => Field(ans)): ", key_question_answers.map((ans) => Field(ans)));
        const hashed_key_question_answers = Poseidon.hash(key_question_answers.map((ans) => Field(ans))).toBigInt();
        console.log("end_timestamp: ", end_timestamp);
        setState({ ...state, creatingTransaction: true });
        await state.zkappWorkerClient!.createInitStateTransaction(
            BigInt(0),
            BigInt(0),
            hashed_key_question_answers,
            BigInt(end_timestamp)
        );
        await state.zkappWorkerClient!.proveTransaction();
        const transactionJSON = await state.zkappWorkerClient!.getTransactionJSON();
        console.log("transactionJSON: ", transactionJSON);
        const { hash } = await (window as any).mina.sendTransaction({
            transaction: transactionJSON,
            feePayer: { fee: transactionFee, memo: '' },
        });
        const transactionLink = `https://minascan.io/devnet/tx/${hash}`;
        console.log(`View transaction at ${transactionLink}`);
        setTransactionLink(transactionLink);
        setDisplayText(transactionLink);
        setState({ ...state, creatingTransaction: false });
        const configureRequest = {
            questions: data.map((question) => ({
                text: question.question_text,
                is_key: question.is_key
            })),
            end_timestamp: end_timestamp
        };
        console.log("configureRequest: ", configureRequest);
        const response = await axios.post('/api/configure', configureRequest);
        if (response.status === 200) {
            setMessage('Survey configuration submitted successfully.');
        } else {
            setMessage('Error submitting survey configuration.');
        }
    };

    // UI Elements

    const hasWallet = state.hasWallet == null ? null : !state.hasWallet && (
        <div>
            Could not find a wallet. <a href="https://www.aurowallet.com/" target="_blank" rel="noreferrer">Install Auro wallet here</a>
        </div>
    );

    const stepDisplay = transactionLink ? (
        <a href={transactionLink} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>View transaction</a>
    ) : (
        displayText
    );

    const setup = (
        <div className={styles.start} style={{ fontWeight: 'bold', fontSize: '1.5rem', paddingBottom: '5rem' }}>
            {stepDisplay}
            {hasWallet}
        </div>
    );

    const accountDoesNotExist = state.hasBeenSetup && !state.accountExists && (
        <div>
            <span style={{ paddingRight: '1rem' }}>Account does not exist.</span>
            <a href={`https://faucet.minaprotocol.com/?address=${state.publicKey!.toBase58()}`} target="_blank" rel="noreferrer">Visit the faucet to fund this fee payer account</a>
        </div>
    );

    const mainContent = state.hasBeenSetup && state.accountExists && (
        <div className={styles.configureContainer}>
            <h1 className={styles.title}>Research Survey Configuration</h1>
            <form onSubmit={handleConfigurationSubmit} className={styles.configForm}>
                <div className={styles.formGroup}>
                    <label htmlFor="end_timestamp" className={styles.label}>Survey End Time:</label>
                    <input 
                        type="datetime-local"
                        id='end_timestamp'
                        required 
                        className={styles.input}
                    />
                </div>
                
                <div className={styles.questionsContainer}>
                    {Array.from({ length: question_count }).map((_, index) => (
                        <div key={index} className={styles.questionGroup}>
                            <div className={styles.formGroup}>
                                <label htmlFor={`questionText${index}`} className={styles.label}>Question {index + 1}:</label>
                                <input 
                                    type="text" 
                                    id={`questionText${index}`} 
                                    placeholder="Enter your question" 
                                    required 
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.checkboxGroup}>
                                <input 
                                    type="checkbox" 
                                    id={`isKey${index}`} 
                                    onChange={(e) => handleIsKeyChange(e, index)}
                                    className={styles.checkbox}
                                />
                                <label htmlFor={`isKey${index}`} className={styles.checkboxLabel}>Is Key Question</label>
                            </div>
                            <div className={styles.radioGroup}>
                                <label className={styles.radioLabel}>
                                    <input 
                                        type="radio" 
                                        id={`qyes${index}`} 
                                        name={`q${index}`} 
                                        value="1" 
                                        disabled
                                        className={styles.radio}
                                    /> 
                                    Yes
                                </label>
                                <label className={styles.radioLabel}>
                                    <input 
                                        type="radio" 
                                        id={`qno${index}`} 
                                        name={`q${index}`} 
                                        value="0" 
                                        disabled
                                        className={styles.radio}
                                    /> 
                                    No
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className={styles.buttonGroup}>
                    <button 
                        type="button" 
                        onClick={() => setQuestionCount(question_count + 1)} 
                        className={styles.addButton}
                    >
                        Add Question
                    </button>
                    <button type="submit" className={styles.submitButton}>
                        {state.creatingTransaction ? 'Submitting...' : 'Submit Configuration'}
                    </button>
                </div>
            </form>
            {message && <p className={styles.message}>{message}</p>}
            <p className={styles.participantCount}>Total Participants: {state.currentParticipantCount?.toString() || '0'}</p>
        </div>
    );

    return is_configured ? (
        <div className={styles.container}>
            <h1 className={styles.title}>Research Has Already Been Configured</h1>
            <a href="/">Go to Research</a>
        </div>
    ) : (
        <div className={styles.container}>
            {mainContent}
            {setup}
            {accountDoesNotExist}
        </div>
    );
}