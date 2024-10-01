import { Field, Nullifier, PublicKey, Poseidon } from 'o1js';
import { useEffect, useState } from 'react';
import GradientBG from '../components/GradientBG';
import styles from '../styles/Home.module.css';
import ZkappWorkerClient from './zkappWorkerClient';

const transactionFee = 0.1;
const ZKAPP_ADDRESS = 'B62qqqHWcqFxpUYqgUwkphf8GjCBCUoYsi9BTdEvekxHz7zZAJnBLKG';
const questions = [
    "Have you experienced any cold or flu-like symptoms in the past two weeks?",
    "Do you currently have any chronic medical conditions (e.g., diabetes, hypertension)?",
    "Have you taken any prescription medication in the last month?",
    "Do you regularly engage in physical exercise (at least 30 minutes per day, 3 times a week)?",
    "Do you smoke cigarettes or use any tobacco products?",
    "Have you had a full medical check-up in the past year?",
    "Do you experience frequent stress or anxiety?",
    "Have you had any vaccinations in the past year?",
    "Do you consume alcohol more than once per week?",
    "Do you sleep for at least 7 hours per night on average?"
];
const keyQuestions = [7, 10];

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
    const [message, setMessage] = useState(''); // Display feedback message

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

                const zkappPublicKey = PublicKey.fromBase58(ZKAPP_ADDRESS);
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
        const hashedAnswersWithTime = Poseidon.hash([hashedAnswers, Field(currentTime)]);
        console.log("Answers: ", answers);
        console.log("Current time: ", currentTime);
        console.log("Hashed answers with time: ", hashedAnswersWithTime.toString());
        const nullifierJson = await (window as any).mina?.createNullifier({
            message: [hashedKeyQuestionAnswers.toString()],
        });
        console.log("Nullifier JSON: ", nullifierJson);
        setState({ ...state, creatingTransaction: true });
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
        setState({ ...state, creatingTransaction: false });
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
                    <div key={index} className={styles.question}>
                        <h3>{index + 1}. {question}</h3>
                        <div className={styles.options}>
                            <label><input type="radio" name={`q${index + 1}`} value="1" required /> Yes</label>
                            <label><input type="radio" name={`q${index + 1}`} value="0" /> No</label>
                        </div>
                    </div>
                ))}
                <button type="submit" disabled={false} className={styles.submitButton}>
                    {state.creatingTransaction ? 'Submitting...' : 'Submit'}
                </button>
            </form>
            {message && <p className={styles.message}>{message}</p>}
            <p>Total Participants: {state.currentParticipantCount!.toString()}</p>
        </div>
    );

    return (
        <GradientBG>
            <div className={styles.main} style={{ padding: 0 }}>
                <div className={styles.center} style={{ padding: 0 }}>
                    {setup}
                    {accountDoesNotExist}
                    {mainContent}
                </div>
            </div>
        </GradientBG>
    );
}
