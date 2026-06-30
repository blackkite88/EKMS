import fs from 'fs/promises';
import { getSourceType, getSourceId, getFileExtension } from '../utils/fileScanner.js';

export async function readFileAsDocument(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  const ext = getFileExtension(filePath);
  const sourceType = getSourceType(filePath);
  const sourceId = getSourceId(filePath);
  const filename = filePath.split('/').pop();

  let text = '';

  if (ext === 'json') {
    try {
      const parsed = JSON.parse(raw);
      text = JSON.stringify(parsed, null, 2);
    } catch {
      text = raw;
    }
  } else if (ext === 'txt' || ext === 'md') {
    text = raw;
  } else {
    text = raw;
  }

  return {
    text: text.trim(),
    metadata: {
      source_type: sourceType,
      source_id: sourceId,
      filename,
      chunk_origin: filePath,
      file_ext: ext,
    },
  };
}

export async function readAllDocuments(filePaths) {
  const documents = [];
  for (const filePath of filePaths) {
    try {
      const doc = await readFileAsDocument(filePath);
      if (doc.text.length > 0) {
        documents.push(doc);
      }
    } catch (err) {
      console.error(`[readers] Failed to read ${filePath}: ${err.message}`);
    }
  }
  return documents;
}
