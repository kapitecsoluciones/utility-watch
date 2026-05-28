const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 } as const;
type Level = keyof typeof LEVELS;

const SECRET_KEY = /pass(word)?|secret|token|api[_-]?key|cookie|authorization|credential/i;

/** Recursively redact secret-looking keys before anything is logged. */
function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY.test(k) ? "***" : redact(v);
    }
    return out;
  }
  return value;
}

export interface Logger {
  error(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  debug(msg: string, meta?: Record<string, unknown>): void;
}

export function createLogger(level = "info"): Logger {
  const threshold = LEVELS[level as Level] ?? LEVELS.info;
  const emit = (lvl: Level, msg: string, meta?: Record<string, unknown>) => {
    if (LEVELS[lvl] > threshold) return;
    const line = {
      ts: new Date().toISOString(),
      level: lvl,
      msg,
      ...(meta ? { meta: redact(meta) } : {}),
    };
    const stream = lvl === "error" || lvl === "warn" ? process.stderr : process.stdout;
    stream.write(`${JSON.stringify(line)}\n`);
  };
  return {
    error: (m, meta) => emit("error", m, meta),
    warn: (m, meta) => emit("warn", m, meta),
    info: (m, meta) => emit("info", m, meta),
    debug: (m, meta) => emit("debug", m, meta),
  };
}

export { redact as _redactForTest };
