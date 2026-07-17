// Consistent, lightweight structured logging used across the backend.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const CURRENT = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function stamp() {
  return new Date().toISOString();
}

function emit(level, scope, msg, extra) {
  if (LEVELS[level] < CURRENT) return;
  const tag = `[${scope}]`;
  const line = `${stamp()} ${level.toUpperCase().padEnd(5)} ${tag} ${msg}`;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (extra !== undefined) fn(line, extra);
  else fn(line);
}

export function createLogger(scope) {
  return {
    debug: (msg, extra) => emit('debug', scope, msg, extra),
    info: (msg, extra) => emit('info', scope, msg, extra),
    warn: (msg, extra) => emit('warn', scope, msg, extra),
    error: (msg, extra) => emit('error', scope, msg, extra),
  };
}

export default createLogger;
