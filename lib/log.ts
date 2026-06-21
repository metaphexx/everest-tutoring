/**
 * Tiny logging + error-reporting abstraction so critical paths (webhooks, comms,
 * invoicing, AI) report failures somewhere we can see them, instead of vanishing
 * into console.error.
 *
 * Today it logs to the console (structured). When SENTRY_DSN is set and
 * @sentry/node is installed it also forwards exceptions to Sentry.
 *
 * DEV: to enable Sentry -> `npm i @sentry/node`, set SENTRY_DSN, and initialise
 * once at server start (instrumentation.ts) with Sentry.init({ dsn }). The
 * dynamic import below then forwards captured errors automatically.
 */
const real = (v: string | undefined) => !!v && v.trim().length > 0 && !v.includes('...')
export const hasSentry = real(process.env.SENTRY_DSN)

type Ctx = Record<string, unknown>

function line(level: string, msg: string, ctx?: Ctx) {
  const payload = ctx && Object.keys(ctx).length ? ` ${JSON.stringify(ctx)}` : ''
  return `[${new Date().toISOString()}] ${level} ${msg}${payload}`
}

export const log = {
  info(msg: string, ctx?: Ctx) {
    console.log(line('INFO', msg, ctx))
  },
  warn(msg: string, ctx?: Ctx) {
    console.warn(line('WARN', msg, ctx))
  },
  error(msg: string, ctx?: Ctx) {
    console.error(line('ERROR', msg, ctx))
  },
}

/**
 * Report an exception. Always logs; forwards to Sentry when configured.
 * Never throws - reporting must not break the path that called it.
 */
export async function captureError(error: unknown, context?: Ctx): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  log.error(message, context)
  if (!hasSentry) return
  try {
    // DEV: requires `npm i @sentry/node` + Sentry.init() at startup. Built via
    // new Function so the bundler never tries to resolve the optional dep.
    const importAtRuntime = new Function('s', 'return import(s)') as (s: string) => Promise<{ captureException?: (e: unknown, hint?: unknown) => void } | null>
    const Sentry = await importAtRuntime('@sentry/node').catch(() => null)
    Sentry?.captureException?.(error, context ? { extra: context } : undefined)
  } catch {
    /* reporting is best-effort */
  }
}
