const express = require("express");
const { addClipboardFile, getClipboardEntry, clipboardEntry, deleteClipboardEntry, getClipboardEntries, toggleFavorite, synchLocalClipboard } = require("../controllers/Clipboard.controller");
const { IsAdmin, LoginRequired, OptionalAuth } = require("../middlewares/Auth");
const { upload } = require("../middlewares/Upload");

const clipboardRouter = express.Router();

clipboardRouter.post("/", OptionalAuth, clipboardEntry);

clipboardRouter.post("/file", OptionalAuth, upload.single("file"), addClipboardFile);

// Route publique pour voir un clipboard partagé (sans authentification requise)
clipboardRouter.get("/share/:id", getClipboardEntry);

// Synchroniser le presse-papiers local avec le serveur
clipboardRouter.post("/sync", LoginRequired, synchLocalClipboard);

clipboardRouter.get("/:id", LoginRequired, getClipboardEntry);

clipboardRouter.get("/", LoginRequired, getClipboardEntries);

// Route pour basculer le statut favori
clipboardRouter.patch("/:id/favorite", OptionalAuth, toggleFavorite);

clipboardRouter.delete("/:id", LoginRequired, deleteClipboardEntry);

module.exports = clipboardRouter;