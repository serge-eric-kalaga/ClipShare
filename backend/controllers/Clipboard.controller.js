const { Clipboard, CreateClipboardModel } = require("../models/Models");


module.exports = {

    // ajouter un fichier au presse-papiers
    async addClipboardFile(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).Response({ message: "Aucun fichier téléchargé !" });
            }

            const fileUrl = `/uploads/${req.file.filename}`;

            // si un clipboardId est fourni, on l'utilise
            if (req.query.clipboardId) {
                const clipboard = await Clipboard.findById(req.query.clipboardId);

                if (!clipboard) {
                    return res.status(404).Response({ message: "Clipboard non trouvé !" });
                }

                // Vérifier les permissions
                if (clipboard.owner && (!res.user || clipboard.owner.toString() !== res.user.id.toString())) {
                    return res.status(403).Response({ message: "Vous n'êtes pas autorisé à modifier ce clipboard !" });
                }

                // ajouter le fichier au presse-papiers
                clipboard.files.push(fileUrl);
                await clipboard.save();

                return res.Response({ data: clipboard });
            }

            // Sinon, créer un nouveau clipboard avec le fichier
            const newClipboard = new Clipboard({
                owner: res.user ? res.user.id : null,
                files: [fileUrl],
            });
            const savedClipboard = await newClipboard.save();
            return res.Response({ data: savedClipboard });

        } catch (error) {
            next(error);
        }
    },


    // obtenir une entrée du presse-papiers par son ID
    async getClipboardEntry(req, res, next) {
        try {
            const clipboardId = req.params.id;
            const entry = await Clipboard.findById(clipboardId);

            if (!entry) {
                return res.status(404).Response({ message: "Entrée du presse-papiers non trouvée !" });
            }

            // Vérifier les permissions d'accès
            if (entry.owner && (!res.user || entry.owner.toString() !== res.user.id.toString()) && entry.readOnly === true) {
                return res.status(403).Response({ message: "Vous n'êtes pas autorisé à accéder à cette entrée du presse-papiers !" });
            }

            res.Response({ data: entry });
        } catch (error) {
            next(error);
        }
    },

    // recupérer des presse-papiers avec pagination et filtrage
    async getClipboardEntries(req, res, next) {
        // Parametres de pagination et de recherche : page, limit, search, user_id

        try {

            const { page = 1, limit = 10, search = "", user_id = "" } = req.query;

            const query = {
                $or: [
                    { title: { $regex: search, $options: "i" } },
                    { content: { $regex: search, $options: "i" } },
                ],
            };

            if (user_id) {
                query.owner = user_id;

            } else {
                console.log(res.user);

                query.$or.push({ owner: res.user.id }, { owner: null }, { readOnly: false });
            }

            const totalEntries = await Clipboard.countDocuments(query);
            const entries = await Clipboard.find(query)
                .skip((page - 1) * limit)
                .limit(limit);
            res.total = totalEntries;

            res.Response({
                data: entries
            });
        } catch (error) {
            next(error);
        }
    },

    // supprimer une entrée du presse-papiers par son ID
    async deleteClipboardEntry(req, res, next) {
        try {
            const clipboardId = req.params.id;
            const entry = await Clipboard.findById(clipboardId);

            if (!entry) {
                return res.status(404).Response({ message: "Entrée du presse-papiers non trouvée !" });
            }

            // Vérifier si l'utilisateur est le propriétaire
            if (!res.user || entry.owner.toString() !== res.user.id.toString()) {
                return res.status(403).Response({ message: "Vous n'êtes pas autorisé à supprimer cette entrée du presse-papiers !" });
            }

            await Clipboard.findByIdAndDelete(clipboardId);

            // Supprimer les fichiers associés si présents le dossier `uploads`
            if (entry.files && entry.files.length > 0) {
                const fs = require("fs");
                const path = require("path");

                entry.files.forEach(filePath => {
                    const fullPath = path.join(__dirname, "..", filePath);
                    fs.unlink(fullPath, (err) => {
                        if (err) {
                            console.error(`Erreur lors de la suppression du fichier ${fullPath}:`, err);
                        }
                    });
                });
            }

            res.Response({ message: "Entrée du presse-papiers supprimée avec succès !" });
        } catch (error) {
            next(error);
        }
    },


    // créer une nouvelle entrée dans le presse-papiers
    async clipboardEntry(req, res, next) {
        try {

            // Remplacer les valeur vide par null
            for (const key in req.body) {
                if (req.body[key] === "") {
                    req.body[key] = null
                }
            }
            console.log(req.body);

            // Mise à jour, si un ID est fourni dans le corps de la requête
            if (req.query?._id != null && req.body?._id !== undefined) {



                const existingEntry = await Clipboard.findById(req.body._id);

                // Vérifier si l'entrée du presse-papiers existe
                if (!existingEntry) {
                    return res.status(404).Response({ message: "Entrée du presse-papiers non trouvée !" });
                }

                // Vérifier si le clipboard est en lecture seule ET si l'utilisateur n'est pas le propriétaire
                if (existingEntry.readOnly === true && existingEntry.owner && (!res.user || existingEntry.owner.toString() !== res.user.id.toString())) {
                    return res.status(403).Response({ message: "Vous n'êtes pas autorisé à modifier cette entrée du presse-papiers !" });
                }

                // Vérifier si le clipboard a un propriétaire ET l'utilisateur n'est pas le propriétaire
                if (existingEntry.owner && (!res.user || existingEntry.owner.toString() !== res.user.id.toString())) {
                    return res.status(403).Response({ message: "Vous n'êtes pas autorisé à modifier cette entrée du presse-papiers !" });
                }

                CreateClipboardModel.validateAsync(req.body).then(async (value) => {
                    await Clipboard.findByIdAndUpdate(req.body._id, {
                        ...value,
                    });
                    const updatedEntry = await Clipboard.findById(req.body._id);
                    res.Response({ data: updatedEntry });
                }).catch(err => {
                    next(err);
                });
                return;
            }

            CreateClipboardModel.validateAsync(req.body).then(async (value) => {

                const newEntry = new Clipboard({
                    ...value,
                    owner: res.user ? res.user.id : null,
                });
                const savedEntry = await newEntry.save();
                res.Response({ data: savedEntry });
            }).catch(err => {
                next(err);
            });
        } catch (error) {
            next(error);
        }
    },

}