// Chunking via LlamaIndexTS's SentenceSplitter. LlamaIndex is used ONLY for
// indexing-time text splitting, per the project constraints; all retrieval and
// agent logic is custom-built.
import { SentenceSplitter } from 'llamaindex';

const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 50;

let splitter = null;

function getSplitter() {
  if (!splitter) {
    splitter = new SentenceSplitter({ chunkSize: CHUNK_SIZE, chunkOverlap: CHUNK_OVERLAP });
  }
  return splitter;
}

export function chunkText(text) {
  return getSplitter()
    .splitText(text)
    .filter((chunk) => chunk && chunk.trim().length > 0);
}

export { CHUNK_SIZE, CHUNK_OVERLAP };
