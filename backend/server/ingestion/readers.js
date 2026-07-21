// Converts a file into a document: its text content + metadata (including the
// ABAC access attributes that gate who can retrieve it).
//
//   JSON  → parse, pull the `access` object, stringify the rest as content.
//   TXT   → gray-matter frontmatter for `access`; body is content.
//   MD    → gray-matter frontmatter for `access`; body is content.
//
// If a file has no explicit access attributes it defaults to public/clearance-1
// (handled downstream by normalizeResourceAccess), so untagged content stays
// visible rather than being accidentally locked.
import fs from 'fs/promises';
import matter from 'gray-matter';
import { getSourceType, getSourceId, getFileExtension } from './scanner.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('readers');

const DEFAULT_ACCESS = {
  department: 'general',
  projects: [],
  min_clearance: 1,
  sensitivity: 'public',
};

function coerceAccess(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ACCESS };
  return {
    department: raw.department || DEFAULT_ACCESS.department,
    projects: Array.isArray(raw.projects) ? raw.projects : DEFAULT_ACCESS.projects,
    min_clearance: Number.isInteger(raw.min_clearance) ? raw.min_clearance : DEFAULT_ACCESS.min_clearance,
    sensitivity: raw.sensitivity || DEFAULT_ACCESS.sensitivity,
  };
}

export async function readFileAsDocument(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  const ext = getFileExtension(filePath);
  const sourceType = getSourceType(filePath);
  const sourceId = getSourceId(filePath);
  const filename = filePath.split('/').pop();

  let text = '';
  let access = { ...DEFAULT_ACCESS };
  let structured = null; // parsed JSON object, when applicable (used by the graph extractor)

  if (ext === 'json') {
    try {
      const parsed = JSON.parse(raw);
      structured = parsed;
      access = coerceAccess(parsed.access);
      // Content is the whole record minus the access block (which is metadata,
      // not knowledge the LLM should quote).
      const { access: _omit, ...rest } = parsed;
      text = JSON.stringify(rest, null, 2);
    } catch (err) {
      log.warn(`Invalid JSON, treating as raw text: ${filename} (${err.message})`);
      text = raw;
    }
  } else if (ext === 'txt' || ext === 'md') {
    const parsed = matter(raw);
    access = coerceAccess(parsed.data && parsed.data.access);
    text = parsed.content.trim();
    // Surface any non-access frontmatter fields (e.g. equipment_id, date,
    // regulation) as structured data the graph extractor can use, so markdown
    // documents can carry structured links just like JSON records. YAML dates
    // are parsed by gray-matter into Date objects — coerce them (and any other
    // non-primitive) to ISO date strings so Neo4j can store them as properties.
    if (parsed.data && typeof parsed.data === 'object') {
      const { access: _a, ...rest } = parsed.data;
      for (const [k, v] of Object.entries(rest)) {
        if (v instanceof Date) rest[k] = v.toISOString().slice(0, 10);
      }
      if (Object.keys(rest).length > 0) structured = rest;
    }
  } else {
    text = raw;
  }

  return {
    text: text.trim(),
    structured,
    metadata: {
      source_type: sourceType,
      source_id: sourceId,
      filename,
      chunk_origin: filePath,
      file_ext: ext,
      access,
    },
  };
}

export async function readAllDocuments(filePaths) {
  const documents = [];
  for (const filePath of filePaths) {
    try {
      const doc = await readFileAsDocument(filePath);
      if (doc.text.length > 0) documents.push(doc);
    } catch (err) {
      log.error(`Failed to read ${filePath}: ${err.message}`);
    }
  }
  return documents;
}
