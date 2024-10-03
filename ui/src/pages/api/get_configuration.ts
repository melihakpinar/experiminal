import mysql from 'mysql2/promise';
import { NextApiRequest, NextApiResponse } from 'next';
import { dbConfig } from './db_config';

// GET /api/get_configuration
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const connection = await mysql.createConnection(dbConfig);
            const [configuration] = await connection.execute('SELECT * FROM config');
            const config = JSON.parse(JSON.stringify(configuration));
            res.status(200).json(config);
        } catch (error) {
            console.error('Error fetching configuration:', error);
            res.status(500).json({ error: 'Error fetching configuration' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}