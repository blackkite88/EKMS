import fs from 'fs/promises';
import path from 'path';
import { Document } from 'llamaindex';

export const readDocument = async (filePath) => {
    try {
        const ext = path.extname(filePath).toLowerCase();
        const filename = path.basename(filePath);
        // source_type can be inferred from directory: emails, meetings, tickets, docs, github
        const dir = path.basename(path.dirname(filePath));
        let sourceType = dir;
        let sourceId = path.basename(filePath, ext);

        const rawContent = await fs.readFile(filePath, 'utf-8');
        let textContent = '';

        if (ext === '.json') {
            const parsed = JSON.parse(rawContent);
            textContent = JSON.stringify(parsed, null, 2);
            if (parsed.id) {
                sourceId = parsed.id;
            }
        } else if (ext === '.txt' || ext === '.md') {
            textContent = rawContent;
        } else {
            console.warn(`Unsupported file extension: ${ext} for ${filePath}`);
            return null;
        }

        return new Document({
            text: textContent,
            metadata: {
                source_type: sourceType,
                source_id: sourceId,
                filename: filename,
                chunk_origin: filePath
            }
        });
    } catch (error) {
        console.error(`Failed to read file ${filePath}:`, error.message);
        throw error; // Will be caught by loader
    }
};
