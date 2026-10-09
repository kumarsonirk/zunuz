// Crash safety for Express 4.
//
// Express 4 only catches errors thrown synchronously by a handler. An async
// handler that throws (e.g. `phone.replace` on a number, before its own
// try/catch) returns a rejected promise Express never sees — and Node ≥ 15
// exits the whole process on an unhandled rejection, taking the API down for
// everyone. Two layers:
//   1. patchAsyncHandlers(): route rejected promises from any handler or
//      middleware into next(err), so the JSON error handler below answers
//      that one request with a 500 instead.
//   2. installProcessGuards(): last resort — log unhandled rejections /
//      exceptions instead of exiting.
// errorHandler is mounted last in index.js: never sends stack traces.

const Layer = require('express/lib/router/layer');

function patchAsyncHandlers() {
  if (Layer.prototype.__zunuzAsyncPatched) return;
  Layer.prototype.handle_request = function handle(req, res, next) {
    const fn = this.handle;
    if (fn.length > 3) return next(); // error-handling middleware, not for this path
    try {
      const out = fn(req, res, next);
      if (out && typeof out.then === 'function') out.catch((err) => next(err || new Error('Request failed')));
    } catch (err) {
      next(err);
    }
  };
  Layer.prototype.__zunuzAsyncPatched = true;
}

function installProcessGuards() {
  process.on('unhandledRejection', (reason) => console.error('Unhandled rejection (kept running):', reason));
  process.on('uncaughtException', (err) => console.error('Uncaught exception (kept running):', err));
}

// Final error handler: body-parser / multer / CORS / thrown errors → JSON.
// Client errors keep their status and a safe message; everything else is a
// generic 500 (details only in the server log).
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = Number(err?.status || err?.statusCode) || 500;
  if (status >= 500) console.error(`${req.method} ${req.originalUrl} failed:`, err);
  if (res.headersSent) return;
  let message = 'Server error';
  if (status < 500) {
    if (err.type === 'entity.parse.failed') message = 'Invalid JSON body';
    else if (err.type === 'entity.too.large') message = 'Request body is too large';
    else if (err.message === 'Not allowed by CORS') message = 'Not allowed';
    else if (err.expose !== false && err.message) message = String(err.message).slice(0, 200);
  }
  res.status(status).json({ error: message });
}

module.exports = { patchAsyncHandlers, installProcessGuards, errorHandler };
