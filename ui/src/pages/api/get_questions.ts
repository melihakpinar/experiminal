import mysql from 'mysql2/promise';
import { NextApiRequest, NextApiResponse } from 'next';

const dbConfig = {
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '',
    database: 'experiminal',
};

// GET /api/get_questions
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const connection = await mysql.createConnection(dbConfig);
            const [rows] = await connection.execute('SELECT * FROM questions');
            res.status(200).json(rows);
        } catch (error) {
            console.error('Error fetching questions:', error);
            res.status(500).json({ error: 'Error fetching questions' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}