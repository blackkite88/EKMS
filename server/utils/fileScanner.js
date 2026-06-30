import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');

export async function scanDataFiles() {
  const patterns = [
    `${DATA_DIR}/**/*.json`,
    `${DATA_DIR}/**/*.txt`,
    `${DATA_DIR}/**/*.md`,
  ];

  const files = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, { nodir: true });
    files.push(...matches);
  }

  return [...new Set(files)];
}

export function getSourceType(filePath) {
  const parts = filePath.split(path.sep);
  const dataIndex = parts.indexOf('data');
  if (dataIndex !== -1 && parts[dataIndex + 1]) {
    return parts[dataIndex + 1];
  }
  return 'unknown';
}

export function getSourceId(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

export function getFileExtension(filePath) {
  return path.extname(filePath).replace('.', '').toLowerCase();
}
