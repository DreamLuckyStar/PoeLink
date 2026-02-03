type Primitive = string | number | boolean | null | undefined | bigint | symbol;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export type LogSerializeOptions = {
  depth?: number;
  maxKeys?: number;
  maxArrayLength?: number;
  maxStringLength?: number;
};

const DEFAULT_SERIALIZE: Required<LogSerializeOptions> = {
  depth: 8,
  maxKeys: 80,
  maxArrayLength: 80,
  maxStringLength: 4000,
};

function isPrimitive(v: unknown): v is Primitive {
  return (
    v === null ||
    v === undefined ||
    typeof v === 'string' ||
    typeof v === 'number' ||
    typeof v === 'boolean' ||
    typeof v === 'bigint' ||
    typeof v === 'symbol'
  );
}

function truncateString(s: string, max: number) {
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 24))}…(truncated ${s.length - Math.max(0, max - 24)} chars)`;
}

function toPlainError(err: Error) {
  const anyErr = err as any;
  const out: Record<string, unknown> = {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
  // keep useful extra fields if present
  for (const k of Object.keys(anyErr)) out[k] = anyErr[k];
  return out;
}

/**
 * Convert unknown values into a log-friendly plain object with:
 * - cycle protection
 * - bounded depth / keys / array length
 */
export function safeLogValue(value: unknown, opts: LogSerializeOptions = {}): unknown {
  const o = { ...DEFAULT_SERIALIZE, ...opts };
  const seen = new WeakSet<object>();

  const walk = (v: unknown, depthLeft: number): unknown => {
    if (isPrimitive(v)) return v;
    if (typeof v === 'string') return truncateString(v, o.maxStringLength);

    if (v instanceof Date) return v.toISOString();
    if (v instanceof RegExp) return String(v);
    if (v instanceof Error) return toPlainError(v);

    if (typeof v === 'function') return `[Function ${(v as Function).name || 'anonymous'}]`;

    if (depthLeft <= 0) {
      if (Array.isArray(v)) return `[Array(${v.length})]`;
      if (v && typeof v === 'object') return `[Object ${(v as any)?.constructor?.name || 'Object'}]`;
      return v as any;
    }

    if (v && typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      if (seen.has(obj)) return '[Circular]';
      seen.add(obj);

      if (Array.isArray(obj)) {
        const len = obj.length;
        const sliced = obj.slice(0, o.maxArrayLength).map((item) => walk(item, depthLeft - 1));
        if (len > o.maxArrayLength) sliced.push(`…(+${len - o.maxArrayLength} items)` as any);
        return sliced;
      }

      if (obj instanceof Map) {
        const entries = Array.from(obj.entries()).slice(0, o.maxKeys).map(([k, vv]) => [walk(k, depthLeft - 1), walk(vv, depthLeft - 1)]);
        const more = obj.size > o.maxKeys ? `…(+${obj.size - o.maxKeys} entries)` : undefined;
        return more ? { type: 'Map', entries, more } : { type: 'Map', entries };
      }

      if (obj instanceof Set) {
        const values = Array.from(obj.values()).slice(0, o.maxArrayLength).map((vv) => walk(vv, depthLeft - 1));
        const more = obj.size > o.maxArrayLength ? `…(+${obj.size - o.maxArrayLength} items)` : undefined;
        return more ? { type: 'Set', values, more } : { type: 'Set', values };
      }

      const keys = Object.keys(obj);
      const limitedKeys = keys.slice(0, o.maxKeys);
      const out: Record<string, unknown> = {};
      for (const k of limitedKeys) out[k] = walk(obj[k], depthLeft - 1);
      if (keys.length > o.maxKeys) out.__moreKeys = `…(+${keys.length - o.maxKeys} keys)`;
      return out;
    }

    // fallback for weird host objects
    try {
      return String(v);
    } catch {
      return Object.prototype.toString.call(v);
    }
  };

  return walk(value, o.depth);
}

export function safeJsonStringify(value: unknown, opts: LogSerializeOptions = {}) {
  try {
    return JSON.stringify(safeLogValue(value, opts), null, 2);
  } catch (e) {
    return JSON.stringify({ error: 'safeJsonStringify_failed', detail: String(e) }, null, 2);
  }
}

function levelRank(level: LogLevel) {
  switch (level) {
    case 'debug': return 10;
    case 'info': return 20;
    case 'warn': return 30;
    case 'error': return 40;
    case 'silent': return 100;
    default: return 20;
  }
}

function getDefaultLevel(): LogLevel {
  // Prefer explicit override in devtools: globalThis.__POELINK_LOG_LEVEL = 'debug'
  const fromGlobal = (globalThis as any).__POELINK_LOG_LEVEL as LogLevel | undefined;
  if (fromGlobal) return fromGlobal;
  return (import.meta as any)?.env?.DEV ? 'debug' : 'info';
}

export function createLogger(node: string, options?: { level?: LogLevel; serialize?: LogSerializeOptions }) {
  const level = options?.level ?? getDefaultLevel();
  const serialize = options?.serialize ?? {};
  const prefix = `[PoeLink][${node}]`;

  const isEnabled = (want: LogLevel) => levelRank(want) >= levelRank(level) && level !== 'silent';

  const out = {
    debug: (msg: string, data?: unknown, ...rest: unknown[]) => {
      if (!isEnabled('debug')) return;
      data === undefined
        ? console.debug(prefix, msg, ...rest)
        : console.debug(prefix, msg, safeLogValue(data, serialize), ...rest);
    },
    info: (msg: string, data?: unknown, ...rest: unknown[]) => {
      if (!isEnabled('info')) return;
      data === undefined
        ? console.info(prefix, msg, ...rest)
        : console.info(prefix, msg, safeLogValue(data, serialize), ...rest);
    },
    warn: (msg: string, data?: unknown, ...rest: unknown[]) => {
      if (!isEnabled('warn')) return;
      data === undefined
        ? console.warn(prefix, msg, ...rest)
        : console.warn(prefix, msg, safeLogValue(data, serialize), ...rest);
    },
    error: (msg: string, data?: unknown, ...rest: unknown[]) => {
      if (!isEnabled('error')) return;
      data === undefined
        ? console.error(prefix, msg, ...rest)
        : console.error(prefix, msg, safeLogValue(data, serialize), ...rest);
    },
  };

  return out;
}

