const logger = require("pino");

let log;

if (process.env.NODE_ENV === "production") {
  // Production : logs JSON simples vers stdout (CloudWatch les récupère automatiquement)
  log = logger({
    level: process.env.LOG_LEVEL || "info",
  });
} else {
  // Développement : logs formatés avec pino-pretty
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