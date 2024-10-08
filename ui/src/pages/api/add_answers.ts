import mysql from 'mysql2/promise';
import { NextApiRequest, NextApiResponse } from 'next';
import { dbConfig } from './db_config';

// POST /api/add_answers
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            const connection = await mysql.createConnection(dbConfig);
            const { answers, timestamp } = req.body;
            await connection.execute('INSERT INTO answers (answers, timestamp) VALUES (?, ?)', [answers, timestamp]);
            res.status(200).json({ success: true });
        } catch (error) {
            console .error('Error adding answers:', error);
            res.status(500).json({ success: false, error: 'Error adding answers' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}