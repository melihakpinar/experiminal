import mysql from 'mysql2/promise';
import { NextApiRequest, NextApiResponse } from 'next';

const dbConfig = {
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '',
    database: 'experiminal',
};

// POST /api/configure
/*
{
    "questions": [
        {
            "text": "What is your name?",
            "is_key": true
        },
        {
            "text": "What is your age?",
            "is_key": false
        }
    ]
    "zkapp_address": "0x1234567890123456789012345678901234567890",
    "fee": 0.01,
    "end_timestamp": 1714857600
}
*/
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            const connection = await mysql.createConnection(dbConfig);
            const [config_rows] = await connection.execute('SELECT * FROM config');
            const [questions_rows] = await connection.execute('SELECT * FROM questions');
            const initial_questions = JSON.parse(JSON.stringify(questions_rows));
            const config = JSON.parse(JSON.stringify(config_rows));
            if (config.length === 0 && initial_questions.length === 0) {
                const { zkapp_address, fee, end_timestamp, questions } = req.body;
                const initialization_timestamp = new Date().getTime();
                for (const question of questions) {
                    await connection.execute('INSERT INTO questions (question_text, is_key) VALUES (?, ?)', [question.text, question.is_key]);
                }
                await connection.execute('INSERT INTO config (zkapp_address, fee, initialization_timestamp, end_timestamp) VALUES (?, ?, ?, ?)', [zkapp_address, fee, initialization_timestamp, end_timestamp]);
                res.status(200).json({ success: true });
            } else {
                res.status(400).json({ success: false, error: 'Config already set' });
            }
        } catch (error) {
            console.error('Error configuring:', error);
            res.status(500).json({ success: false, error: 'Error configuring' });
        }
    }
}