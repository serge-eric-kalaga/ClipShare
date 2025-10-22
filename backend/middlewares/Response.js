function Response(req, res, next) {
    res.Response = function ({ data = null, statusCode = res.statusCode, message = 'ok' }) {
        res.status(statusCode).json({
            statusCode: res.statusCode,
            message: res.message || message,
            data: data,
            page: req.query.page ? parseInt(req.query.page) : undefined,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            total: res.total || undefined,
        });
    };

    next();
}

module.exports = Response;
