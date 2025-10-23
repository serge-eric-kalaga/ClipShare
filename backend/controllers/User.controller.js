const { User, CreateUserModel, UpdateUserModel, LoginModel } = require("../models/Models")
const jsonwebtoken = require("jsonwebtoken");
const bcrypt = require("bcrypt");

module.exports = {

    // recupérer tous les utilisateurs (avec option de pagination)
    async getAllUsers(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
            const skip = (page - 1) * limit;
            const users = await User.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
            res.Response({ data: users });
        } catch (error) {
            res.status(400).Response({ message: error.message });
        }
    },


    async createUser(req, res, next) {
        try {
            CreateUserModel.validateAsync(req.body).then(async (value) => {

                // Check if the username already exists
                const existingUser = await User.findOne({
                    username: req.body.username
                }).exec();
                if (existingUser) {
                    return res.status(400).Response({ message: "Ce nom d'utilisateur existe déjà !" });
                }

                const newUser = new User({
                    nom_prenom: req.body.nom_prenom,
                    username: req.body.username,
                    password: bcrypt.hashSync(req.body.password, parseInt(process.env.UserPasswordSaltRound))
                });
                await newUser.save();
                res.Response({ data: newUser });
            }).catch(err => {
                next(err);
            })
        } catch (error) {
            next(err);
        }
    },

    async getUserByUsername(req, res) {
        try {
            const user = await User.findOne({
                username: req.params.username
            });
            if (!user) {
                res.status(404).Response({ message: "Utilisateur non trouvé !" })
            }
            else {
                res.Response({ data: user })
            }
        } catch (error) {
            res.status(400).Response({ message: error.message })
        }
    },

    async deleteUser(req, res) {
        const user = await User.findOne({
            username: req.params.username
        });
        if (!user) {
            return res.status(404).Response({ message: "Utilisateur non trouvé !" });
        }

        await User.deleteOne({ _id: user._id });
        res.Response({ message: "Utilisateur supprimé !" });
    },

    async updateUser(req, res) {
        const user = await User.findOne({
            username: req.params.username
        })
        if (!user) {
            res.status(404).Response({ message: "Utilisateur non trouvé !" })
        }
        else {
            UpdateUserModel.validateAsync(req.body).then(async (value) => {
                await User.findByIdAndUpdate(user._id, {
                    ...value,
                    password: value.password ? bcrypt.hashSync(value.password, parseInt(process.env.UserPasswordSaltRound)) : user.password
                });
                const updatedUser = await User.findById(user._id);
                res.Response({ data: updatedUser })
            }).catch(err => {
                res.status(400).Response({ message: err.message })
            })
        }
    },

    async loginUser(req, res) {
        try {

            await LoginModel.validateAsync(req.body).catch(err => {
                throw new Error(err.message);
            });

            const user_exist = await User.findOne({
                username: req.body.username,
            });

            if (!user_exist) {
                return res.status(401).Response({ message: "Identifiants invalides" });
            }

            // Vérifier le mot de passe
            const isPasswordValid = bcrypt.compareSync(req.body.password, user_exist.password);

            if (!isPasswordValid) {
                return res.status(401).Response({ message: "Identifiants invalides" });
            }

            // Générer le token JWT
            const token = jsonwebtoken.sign(
                {
                    id: user_exist._id,
                    username: user_exist.username,
                    nom_prenom: user_exist.nom_prenom,
                    role: user_exist.role,
                },
                process.env.JWTKey,
                { expiresIn: '24h' }
            );

            // Format OAuth2
            res.Response({
                data: {
                    access_token: token,
                    token_type: "Bearer",
                    expires_in: 86400,
                    user_id: user_exist._id,
                    username: user_exist.username,
                    nom_prenom: user_exist.nom_prenom,
                }
            });

        } catch (error) {
            res.status(400).Response({ message: error.message });
        }
    }

}