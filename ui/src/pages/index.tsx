import { Field, PublicKey, Poseidon } from 'o1js';
import { useEffect, useState } from 'react';
import styles from '../styles/Home.module.css';
import ZkappWorkerClient from './zkappWorkerClient';
import axios from 'axios';

const zkappAddress = "B62qqqHWcqFxpUYqgUwkphf8GjCBCUoYsi9BTdEvekxHz7zZAJnBLKG"
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
    const [message, setMessage] = useState('');
    const [questions, setQuestions] = useState<Array<{ id: number, question_text: string }>>([]);
    const [keyQuestions, setKeyQuestions] = useState<number[]>([]);

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

    const handleSurveySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = document.querySelector('form') as HTMLFormElement;
        if (!form.checkValidity()) {
            setMessage('Please answer all questions.');
            return;
        }
        const answers = Array.from(form.elements)
            .filter((el) => (el as HTMLInputElement).checked)
            .map((el) => (el as HTMLInputElement).value);
        const hashedAnswers = Poseidon.hash(answers.map((ans) => Field(parseInt(ans))));
        const keyQuestionAnswers = answers.filter((_, i) => keyQuestions.includes(i + 1));
        const hashedKeyQuestionAnswers = Poseidon.hash(keyQuestionAnswers.map((ans) => Field(parseInt(ans))));
        const currentTime = Date.now();
        const hashedAnswersWithTime = Poseidon.hash([hashedAnswers, Field(currentTime)]).toBigInt();
        const nullifierJson = await (window as any).mina?.createNullifier({
            message: [hashedKeyQuestionAnswers.toString()],
        });
        setState({ ...state, creatingTransaction: true });
        /*
        await state.zkappWorkerClient!.createAddParticipantTransaction(nullifierJson, hashedAnswersWithTime);
        await state.zkappWorkerClient!.proveTransaction();
        const transactionJSON = await state.zkappWorkerClient!.getTransactionJSON();
        const { hash } = await (window as any).mina.sendTransaction({
            transaction: transactionJSON,
            feePayer: { fee: transactionFee, memo: '' },
        });
        const transactionLink = `https://minascan.io/devnet/tx/${hash}`;
        console.log(`View transaction at ${transactionLink}`);
        setTransactionLink(transactionLink);
        setDisplayText(transactionLink);
        */
        setState({ ...state, creatingTransaction: false });
        console.log("Adding participant to database");
        console.log(state.publicKey!.toBase58());
        await axios.post('/api/add_participant', { public_key: state.publicKey!.toBase58() });
        await axios.post('/api/add_answers', { answers: answers.join(','), timestamp: currentTime });
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
        <div className={styles.surveyContainer}>
            <h2>Research Survey</h2>
            <form onSubmit={handleSurveySubmit}>
                {questions.map((question, index) => (
                    <div key={question.id} className={styles.question}>
                        <h3>{index + 1}. {question.question_text}</h3>
                        <div className={styles.options}>
                            <label><input type="radio" name={`q${question.id}`} value="1" required /> Yes</label>
                            <label><input type="radio" name={`q${question.id}`} value="0" /> No</label>
                        </div>
                    </div>
                ))}
                <button type="submit" disabled={state.creatingTransaction} className={styles.submitButton}>
                    {state.creatingTransaction ? 'Submitting...' : 'Submit'}
                </button>
            </form>
            {message && <p className={styles.message}>{message}</p>}
        </div>
    );

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const response = await axios.get('/api/get_questions');
                setQuestions(response.data);
                setKeyQuestions(response.data.filter((q: any) => q.is_key === 1).map((q: any) => q.id));
            } catch (error) {
                console.error('Error fetching questions:', error);
            }
        };

        fetchQuestions();
    }, []);

    return (
        <div className={styles.main} style={{ padding: 0 }}>
            <div className={styles.center} style={{ padding: 0 }}>
                {setup}
                {accountDoesNotExist}
                {mainContent}
            </div>
        </div>
    );
}
