const { Clipboard, CreateClipboardModel } = require("../models/Models");

// Helper pour émettre les événements socket à la fois dans la room du clipboard et de l'utilisateur
const emitClipboardUpdate = (io, clipboard, eventType = 'clipboard:update') => {
    if (!io || !clipboard) return;

    const clipboardId = clipboard._id.toString();
    const ownerId = clipboard.owner ? clipboard.owner.toString() : null;

    console.log(`[Socket.IO] Emitting ${eventType} for clipboard ${clipboardId}`);
    console.log(`[Socket.IO] Owner: ${ownerId}`);

    // Émettre dans la room du clipboard (pour tous les viewers)
    io.to(clipboardId).emit(eventType, { data: clipboard });
    console.log(`[Socket.IO] Emitted to clipboard room: ${clipboardId}`);

    // Émettre aussi dans la room de l'utilisateur propriétaire (pour le dashboard)
    if (ownerId) {
        io.to(`user:${ownerId}`).emit(eventType, { data: clipboard });
        console.log(`[Socket.IO] Emitted to user room: user:${ownerId}`);
    }
};

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

                // Emit socket update for this clipboard
                try {
                    const io = req.app && req.app.get && req.app.get('io');
                    if (io) {
                        emitClipboardUpdate(io, clipboard);
                    }
                } catch (err) {
                    console.error('Error emitting socket event for clipboard file update', err);
                }

                return res.Response({ data: clipboard });
            }

            // Sinon, créer un nouveau clipboard avec le fichier
            const newClipboard = new Clipboard({
                owner: res.user ? res.user.id : null,
                files: [fileUrl],
            });
            const savedClipboard = await newClipboard.save();
            // Emit socket update for this new clipboard
            try {
                const io = req.app && req.app.get && req.app.get('io');
                if (io) {
                    emitClipboardUpdate(io, savedClipboard);
                }
            } catch (err) {
                console.error('Error emitting socket event for new clipboard', err);
            }
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

            // Pour les routes publiques (/share/:id), permettre l'accès si :
            // 1. Le clipboard n'a pas de propriétaire (anonyme)
            // 2. Le clipboard n'est pas en readOnly (lecture seule = accessible à tous)
            // 3. L'utilisateur est le propriétaire
            const isPublicRoute = req.path.includes('/share/')
            const isOwner = res.user && entry.owner && entry.owner.toString() === res.user.id.toString()
            const isPublicAccess = !entry.owner || entry.readOnly === false

            // Si route publique ET (pas de owner OU readOnly=false), autoriser
            // OU si utilisateur est le owner, autoriser
            if (isPublicRoute && isPublicAccess) {
                // Accès public autorisé
            } else if (isOwner) {
                // Propriétaire = accès total
            } else if (!isPublicRoute && entry.readOnly === true && !isOwner) {
                // Route privée + readOnly + pas owner = refusé
                return res.status(403).Response({ message: "Vous n'êtes pas autorisé à accéder à cette entrée du presse-papiers !" });
            } else if (!isPublicRoute && entry.owner && !isOwner) {
                // Route privée + a un owner + pas owner = refusé
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
                query.$or.push({ owner: res.user.id }, { owner: null }, { readOnly: false });
            }

            const totalEntries = await Clipboard.countDocuments(query);
            const entries = await Clipboard.find(query)
                .sort({ createdAt: -1 }) // Trier par date de création, du plus récent au plus ancien
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

            // Supprimer les fichiers associés du dossier `uploads`
            if (entry.files && entry.files.length > 0) {
                const fs = require("fs");
                const path = require("path");

                entry.files.forEach(fileUrl => {
                    // fileUrl est de la forme "/uploads/filename.ext"
                    // On retire le "/" initial et on construit le chemin complet
                    const relativePath = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;
                    const fullPath = path.join(__dirname, "..", relativePath);

                    fs.unlink(fullPath, (err) => {
                        if (err) {
                            console.error(`Erreur lors de la suppression du fichier ${fullPath}:`, err);
                        } else {
                            console.log(`Fichier supprimé avec succès: ${fullPath}`);
                        }
                    });
                });
            }

            // Emit socket deletion event
            try {
                const io = req.app && req.app.get && req.app.get('io');
                if (io) {
                    // Émettre à la room du clipboard
                    io.to(clipboardId.toString()).emit('clipboard:deleted', { clipboardId });

                    // Émettre aussi à la room de l'utilisateur pour mettre à jour son dashboard
                    if (entry.owner) {
                        const ownerId = entry.owner.toString();
                        io.to(`user:${ownerId}`).emit('clipboard:deleted', { clipboardId });
                    }
                }
            } catch (err) {
                console.error('Error emitting clipboard:deleted', err);
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

            // Mise à jour, si un ID est fourni dans le corps de la requête
            if (req.query?._id != null && req.body?._id !== undefined) {

                const existingEntry = await Clipboard.findById(req.body._id);

                // Vérifier si l'entrée du presse-papiers existe
                if (!existingEntry) {
                    return res.status(404).Response({ message: "Entrée du presse-papiers non trouvée !" });
                }

                // Vérifier si on tente de modifier les paramètres de sécurité
                const securityFields = ['password', 'readOnly', 'expireAt'];
                const isModifyingSecurity = securityFields.some(field => {
                    if (!req.body.hasOwnProperty(field)) return false;

                    const bodyValue = req.body[field];
                    const existingValue = existingEntry[field];

                    // Normaliser les valeurs null/undefined/empty string
                    const normalizedBody = bodyValue === '' || bodyValue === undefined ? null : bodyValue;
                    const normalizedExisting = existingValue === '' || existingValue === undefined ? null : existingValue;

                    // Pour les dates, comparer les valeurs en millisecondes
                    if (field === 'expireAt') {
                        if (normalizedBody === null && normalizedExisting === null) return false;
                        if (normalizedBody === null || normalizedExisting === null) return true;
                        return new Date(normalizedBody).getTime() !== new Date(normalizedExisting).getTime();
                    }

                    // Pour les booléens, normaliser false/null
                    if (field === 'readOnly') {
                        const boolBody = normalizedBody === null ? false : !!normalizedBody;
                        const boolExisting = normalizedExisting === null ? false : !!normalizedExisting;
                        return boolBody !== boolExisting;
                    }

                    // Pour les strings (password)
                    return normalizedBody !== normalizedExisting;
                });

                // Si on modifie la sécurité, seul le propriétaire peut le faire
                if (isModifyingSecurity) {
                    if (!res.user || !existingEntry.owner || existingEntry.owner.toString() !== res.user.id.toString()) {
                        return res.status(403).Response({
                            message: "Seul le propriétaire peut modifier les paramètres de sécurité !"
                        });
                    }
                }

                // Vérifier si le clipboard est en lecture seule (pour les modifications de contenu)
                if (existingEntry.readOnly === true) {
                    // En lecture seule, seul le propriétaire peut modifier le contenu
                    if (existingEntry.owner && (!res.user || existingEntry.owner.toString() !== res.user.id.toString())) {
                        return res.status(403).Response({ message: "Ce clipboard est en lecture seule !" });
                    }
                }

                // Si le clipboard n'est pas en lecture seule, tout le monde peut modifier le contenu
                // (comportement collaboratif)

                CreateClipboardModel.validateAsync(req.body).then(async (value) => {
                    await Clipboard.findByIdAndUpdate(req.body._id, {
                        ...value,
                    });
                    const updatedEntry = await Clipboard.findById(req.body._id);
                    // Emit socket update for this updated clipboard
                    try {
                        const io = req.app && req.app.get && req.app.get('io');
                        if (io) {
                            emitClipboardUpdate(io, updatedEntry);
                        }
                    } catch (err) {
                        console.error('Error emitting socket event for updated clipboard', err);
                    }
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

    // Vérifier quels clipboards peuvent être synchronisés
    async checkSyncableClipboards(req, res, next) {
        try {
            const { clipboardIds } = req.body;

            if (!Array.isArray(clipboardIds)) {
                return res.status(400).Response({ message: "Données invalides !" });
            }

            const syncable = [];

            for (const clipboardId of clipboardIds) {
                const clipboard = await Clipboard.findById(clipboardId);

                if (!clipboard) continue;
                if (clipboard.owner) continue; // Déjà synchronisé

                // Vérifier que le clipboard n'est pas vide
                const hasContent = clipboard.content && clipboard.content.trim().length > 0;
                const hasFiles = clipboard.files && clipboard.files.length > 0;
                const hasTitle = clipboard.title && clipboard.title.trim().length > 0 && clipboard.title !== "Sans titre";

                if (hasContent || hasFiles || hasTitle) {
                    syncable.push(clipboardId);
                }
            }

            res.Response({ data: syncable });
        } catch (error) {
            next(error);
        }
    },

    async synchLocalClipboard(req, res, next) {
        // Etant donne que la donnee est deja sur le serveur, on n'a qu'a mettre a jour en mettant le owner
        try {
            const { clipboardIds } = req.body;

            if (!Array.isArray(clipboardIds)) {
                return res.status(400).Response({ message: "Données de presse-papiers invalides !" });
            }

            let syncCount = 0;
            let skippedCount = 0;

            for (const clipboardId of clipboardIds) {
                // Vérifier que le clipboard existe
                const clipboard = await Clipboard.findById(clipboardId);

                if (!clipboard) {
                    skippedCount++;
                    continue;
                }

                // Vérifier que le clipboard n'a pas déjà un owner
                if (clipboard.owner) {
                    skippedCount++;
                    continue;
                }

                // Vérifier que le clipboard n'est pas vide
                const hasContent = clipboard.content && clipboard.content.trim().length > 0;
                const hasFiles = clipboard.files && clipboard.files.length > 0;
                const hasTitle = clipboard.title && clipboard.title.trim().length > 0 && clipboard.title !== "Sans titre";

                if (!hasContent && !hasFiles && !hasTitle) {
                    skippedCount++;
                    continue;
                }

                // Tout est bon, on peut synchroniser
                await Clipboard.findByIdAndUpdate(clipboardId, {
                    owner: res.user ? res.user.id : null,
                });
                syncCount++;
            }

            res.Response({
                message: `${syncCount} presse-papiers synchronisé(s) avec succès !${skippedCount > 0 ? ` (${skippedCount} ignoré(s))` : ''}`,
                data: { synced: syncCount, skipped: skippedCount }
            });
        } catch (error) {
            next(error);
        }
    },

    // Basculer le statut favori d'un clipboard
    async toggleFavorite(req, res, next) {
        try {
            const clipboardId = req.params.id;
            const entry = await Clipboard.findById(clipboardId);

            if (!entry) {
                return res.status(404).Response({ message: "Clipboard non trouvé !" });
            }

            // Vérifier si l'utilisateur est le propriétaire
            if (!res.user || entry.owner.toString() !== res.user.id.toString()) {
                return res.status(403).Response({ message: "Vous n'êtes pas autorisé à modifier ce clipboard !" });
            }

            // Basculer le statut favori
            entry.isFavorite = !entry.isFavorite;
            await entry.save();

            // Emit socket update to notify viewers
            try {
                const io = req.app && req.app.get && req.app.get('io');
                if (io) {
                    emitClipboardUpdate(io, entry);
                }
            } catch (err) {
                console.error('Error emitting favorite update', err);
            }

            res.Response({
                data: entry,
                message: entry.isFavorite ? "Clipboard ajouté aux favoris" : "Clipboard retiré des favoris"
            });
        } catch (error) {
            next(error);
        }
    },

}