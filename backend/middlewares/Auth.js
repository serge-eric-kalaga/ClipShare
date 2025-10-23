const jwt = require("jsonwebtoken");

const LoginRequired = function (req, res, next) {
    if (
        req.headers && req.headers.authorization &&
        req.headers.authorization.split(" ")[0] == "Bearer"
    ) {
        try {
            res.user = jwt.verify(req.headers.authorization.split(" ")[1], process.env.JWTKey)
            next()
        } catch (error) {
            res.status(401).Response({ message: error.message })
        }
    } else {
        res.status(401).Response({ message: "Not authenticated !" })
    }
}

const IsAdmin = function (req, res, next) {

    if (
        req.headers && req.headers.authorization &&
        req.headers.authorization.split(" ")[0] == "Bearer"
    ) {
        try {
            res.user = jwt.verify(req.headers.authorization.split(" ")[1], process.env.JWTKey)

            if (res.user.role !== "ADMIN") {
                return res.status(403).Response({ message: "Access forbidden: Admins only." })
            }
            next()
        } catch (error) {
            res.status(401).Response({ message: error.message })
        }
    } else {
        res.status(401).Response({ message: "Not authenticated !" })
    }
}

// Middleware optionnel : vérifie si l'utilisateur est connecté mais n'exige pas l'authentification
const OptionalAuth = function (req, res, next) {
    if (
        req.headers && req.headers.authorization &&
        req.headers.authorization.split(" ")[0] == "Bearer"
    ) {
        try {
            res.user = jwt.verify(req.headers.authorization.split(" ")[1], process.env.JWTKey)
        } catch (error) {
            // Ignore l'erreur, continue sans utilisateur
            res.user = null
        }
    } else {
        res.user = null
    }
    next()
}



module.exports = { LoginRequired, IsAdmin, OptionalAuth };