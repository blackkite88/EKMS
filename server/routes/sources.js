import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');

const countFilesInDir = async (dirPath) => {
    try {
        const files = await fs.readdir(dirPath);
        return files.filter(file => !file.startsWith('.')).length;
    } catch (error) {
        return 0;
    }
};

router.get('/', async (req, res, next) => {
    try {
        const counts = {
            emails: await countFilesInDir(path.join(DATA_DIR, 'emails')),
            meetings: await countFilesInDir(path.join(DATA_DIR, 'meetings')),
            tickets: await countFilesInDir(path.join(DATA_DIR, 'tickets')),
            docs: await countFilesInDir(path.join(DATA_DIR, 'docs')),
            github: await countFilesInDir(path.join(DATA_DIR, 'github'))
        };
        
        counts.total = Object.values(counts).reduce((acc, curr) => acc + curr, 0);

        res.json(counts);
    } catch (error) {
        next(error);
    }
});

export default router;
