// En production, utiliser console.log (compatible Lambda, pas de dépendances)
// En développement, utiliser pino avec pino-pretty pour de beaux logs

let log;

if (process.env.APP_ENV === "production") {
  // Production : wrapper autour de console pour garder la même API
  log = {
    info: (...args) => console.log('[INFO]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    debug: (...args) => console.debug('[DEBUG]', ...args),
    trace: (...args) => console.trace('[TRACE]', ...args),
    fatal: (...args) => console.error('[FATAL]', ...args),
  };
} else {
  // Développement : logs formatés avec pino-pretty
  const logger = require("pino");

  const transport = logger.transport({
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  });

  log = logger({
    level: process.env.LOG_LEVEL || "debug",
  }, transport);
}

module.exports = log;