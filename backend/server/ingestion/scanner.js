// Recursively scans the data/ directory for ingestible files (JSON, TXT, MD)
// and derives source metadata from the path.
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(__dirname, '../../data');

export async function scanDataFiles() {
  const matches = await glob(`${DATA_DIR}/**/*.{json,txt,md}`, { nodir: true });
  return [...new Set(matches)].sort();
}

// The immediate subfolder under data/ is the source type (emails, meetings, ...).
export function getSourceType(filePath) {
  const rel = path.relative(DATA_DIR, filePath);
  const parts = rel.split(path.sep);
  return parts.length > 1 ? parts[0] : 'unknown';
}

export function getSourceId(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

export function getFileExtension(filePath) {
  return path.extname(filePath).replace('.', '').toLowerCase();
}
