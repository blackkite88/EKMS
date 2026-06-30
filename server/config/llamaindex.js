import { SentenceSplitter } from 'llamaindex';

export function getTextSplitter() {
  return new SentenceSplitter({ chunkSize: 512, chunkOverlap: 50 });
}

export function chunkText(text) {
  const splitter = getTextSplitter();
  return splitter.splitText(text);
}
