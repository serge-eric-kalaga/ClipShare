const fs = require('fs');
const path = require('path');
const logger = require("../utils/Logger");

let httpLogger;

if (process.env.APP_ENV === "production") {
  // Production : middleware simple sans dépendances
  httpLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const message = `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`;

      if (res.statusCode >= 500) {
        logger.error(message);
      } else if (res.statusCode >= 400) {
        logger.warn(message);
      } else {
        logger.info(message);
      }
    });

    next();
  };
} else {
  // Développement : pino-http pour des logs détaillés
  const pinoHttp = require("pino-http");

  httpLogger = pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => {
        return req.url === "/health" || req.url === "/metrics";
      },
    },
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} completed with status ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} failed with status ${res.statusCode}: ${err.message}`;
    },
  });
}

module.exports = httpLogger;
