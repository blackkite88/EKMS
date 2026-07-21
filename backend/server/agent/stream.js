// The SSE event emitter — the single definition of the 14-event contract that
// drives the frontend graph animation. Keeping every event shape in one place
// means the backend and frontend never drift.
//
// Event types:
//   auth_context · query_received · graph_seed · node_activated ·
//   edge_traversed · node_blocked · traversal_complete · context_assembled ·
//   text · citation_highlight · tool_call · tool_result · done · error
//
// The stream is PACED on the backend: a small delay between traversal events so
// the judge watches the graph light up step by step (that pause IS the wow).

const TRAVERSAL_STEP_DELAY_MS = 220;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class SSEStream {
  constructor(res) {
    this.res = res;
    this.closed = false;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();
    res.on('close', () => { this.closed = true; });
  }

  send(event) {
    if (this.closed) return;
    this.res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  // Paced send for traversal events, so the animation is watchable.
  async sendPaced(event) {
    this.send(event);
    if (!this.closed) await sleep(TRAVERSAL_STEP_DELAY_MS);
  }

  authContext(user) {
    this.send({
      type: 'auth_context',
      user: user.email,
      name: user.name || user.email,
      title: user.title || null,
      department: user.department,
      clearance: user.clearance,
    });
  }

  queryReceived(query, intent) {
    this.send({ type: 'query_received', query, intent });
  }

  contextAssembled(sourceCount) {
    this.send({ type: 'context_assembled', sourceCount });
  }

  text(text) {
    this.send({ type: 'text', text });
  }

  citationHighlight(node) {
    this.send({ type: 'citation_highlight', node });
  }

  toolCall(name, args) {
    this.send({ type: 'tool_call', name, arguments: args });
  }

  toolResult(name, result, mode) {
    this.send({ type: 'tool_result', name, result, mode });
  }

  error(message) {
    this.send({ type: 'error', message });
  }

  done(extra = {}) {
    this.send({ type: 'done', ...extra });
    if (!this.closed) this.res.write('data: [DONE]\n\n');
    this.end();
  }

  end() {
    if (!this.closed) {
      this.closed = true;
      this.res.end();
    }
  }
}
