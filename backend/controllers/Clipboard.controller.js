const { Clipboard, CreateClipboardModel } = require("../models/Models");


module.exports = {

    // ajouter un fichier au presse-papiers
    async addClipboardFile(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).Response({ message: "Aucun fichier téléchargé !" });
            }

            // vérifier la taille du fichier (max 15MB)
            if (req.file.size > 15 * 1024 * 1024) {
                return res.status(400).Response({ message: "La taille du fichier dépasse 15 Mo !" });
            }

            // Vérifier le type de fichier (autoriser uniquement certains types)
            const allowedMimeTypes = ["image/png", "image/jpeg", "application/pdf", "text/plain"];
            if (!allowedMimeTypes.includes(req.file.mimetype)) {
                return res.status(400).Response({ message: "Type de fichier non autorisé !" });
            }

            // si un clipboardId est fourni, on l'utilise
            if (!req.query.clipboardId) {
                // verifier si le clipboard existe
                const clipboardId = req.query.clipboardId;
                const clipboard = await Clipboard.findById(clipboardId);

                const fileUrl = `/uploads/${req.file.filename}`;

                // ajouter le fichier au presse-papiers
                clipboard.files.push(fileUrl);
                await clipboard.save();

                return res.Response({ data: clipboard });
            }
            const newClipboard = new Clipboard({
                owner: req.user ? req.user._id : null,
                files: [`/uploads/${req.file.filename}`],
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
            if (entry.owner && (!req.user || entry.owner.toString() !== req.user._id.toString()) && entry.readOnly === true) {
                return res.status(403).Response({ message: "Vous n'êtes pas autorisé à accéder à cette entrée du presse-papiers !" });
            }

            res.Response({ data: entry });
        } catch (error) {
            next(error);
        }
    },

    // recupérer des presse-papiers avec pagination et filtrage
    async getClipboardEntries(req, res, next) {
        try {
            if (!req.user) {
                return res.status(401).Response({ message: "Utilisateur non authentifié !" });
            }

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
                query.$or.push({ owner: req.user._id }, { owner: null }, { readOnly: false });
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
            if (!req.user || entry.owner.toString() !== req.user._id.toString()) {
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

            // Mise à jour, si un ID est fourni dans le corps de la requête
            if (req.body?._id != null && req.body?._id !== undefined) {
                console.log("-----test");

                const existingEntry = await Clipboard.findById(req.body._id);

                // Vérifier si l'entrée du presse-papiers existe
                if (!existingEntry) {
                    return res.status(404).Response({ message: "Entrée du presse-papiers non trouvée !" });
                }
                // Vérifier le clipboard est ouverte à tous pour modification ou si l'utilisateur est le propriétaire
                if (existingEntry.owner && (!req.user || existingEntry.owner.toString() !== req.user._id.toString()) || existingEntry.readOnly === false) {
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
                    ...req.body,
                    owner: req.user ? req.user?._id : null,
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