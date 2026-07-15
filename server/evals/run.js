// Runs the eval suite through the REAL orchestrator (headless — a capture
// stream collects events instead of writing to an HTTP response), scores each
// case, prints the report, and writes EVAL_REPORT.md.
import '../config/env.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { runQuery } from '../agent/orchestrator.js';
import { findUserByEmail } from '../auth/users.js';
import { normalizeUserAttributes } from '../auth/attributes.js';
import { initSchema } from '../config/postgres.js';
import { seedUsers } from '../auth/users.js';
import { EVAL_CASES } from './questions.js';
import { judgeCase } from './judge.js';
import { renderConsole, renderMarkdown } from './report.js';
import { closeNeo4j } from '../config/neo4j.js';
import { closePostgres } from '../config/postgres.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('evals');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// A stream that captures events instead of writing HTTP (no pacing delays).
// Note: the accumulated answer is stored on `answer` (not `text`) so it doesn't
// shadow the text() method the orchestrator calls.
class CaptureStream {
  constructor() {
    this.answer = '';
    this.tools = [];
    this.events = [];
    this.closed = false;
  }
  send(e) { this.events.push(e); }
  async sendPaced(e) { this.events.push(e); } // no delay in evals
  authContext() {}
  queryReceived() {}
  contextAssembled() {}
  text(t) { this.answer += t; }
  citationHighlight() {}
  toolCall(name, args) { this.tools.push({ name, args }); }
  toolResult() {}
  error(m) { this.events.push({ type: 'error', message: m }); }
  done() { this.closed = true; }
  end() { this.closed = true; }
}

async function runCase(evalCase) {
  const row = await findUserByEmail(evalCase.user);
  if (!row) throw new Error(`Demo user not found: ${evalCase.user} (did you run ingest / seed?)`);
  const user = normalizeUserAttributes({ ...row, email: row.email });
  user.name = row.name;
  user.title = row.title;

  const stream = new CaptureStream();
  const sessionId = `eval_${evalCase.id}_${Date.now()}`;
  await runQuery({ query: evalCase.question, user, sessionId, stream });
  // The judge reads `.text` and `.tools`; expose the accumulated answer as text.
  return { text: stream.answer, tools: stream.tools, events: stream.events };
}

async function main() {
  log.info('Preparing eval run (schema + users)...');
  await initSchema();
  await seedUsers();

  const results = [];
  for (const evalCase of EVAL_CASES) {
    log.info(`Running ${evalCase.id} (as ${evalCase.user})`);
    try {
      const captured = await runCase(evalCase);
      const scored = await judgeCase(evalCase, captured);
      results.push(scored);
    } catch (err) {
      log.error(`Case ${evalCase.id} errored: ${err.message}`);
      results.push({ id: evalCase.id, pass: false, checks: { access: { pass: false, detail: err.message } } });
    }
  }

  const summary = renderConsole(results);
  const md = renderMarkdown(results, summary);
  const outPath = path.resolve(__dirname, '../../EVAL_REPORT.md');
  await fs.writeFile(outPath, md, 'utf-8');
  log.info(`Wrote ${outPath}`);

  await closeNeo4j();
  await closePostgres();
  process.exit(summary.passed === summary.total ? 0 : 1);
}

main().catch(async (err) => {
  log.error('Eval run failed', err);
  await closeNeo4j().catch(() => {});
  await closePostgres().catch(() => {});
  process.exit(1);
});
