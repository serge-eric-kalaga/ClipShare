const express = require("express");
const { addClipboardFile, getClipboardEntry, clipboardEntry, deleteClipboardEntry, getClipboardEntries, toggleFavorite } = require("../controllers/Clipboard.controller");
const { IsAdmin, LoginRequired } = require("../middlewares/Auth");
const { upload } = require("../middlewares/Upload");

const clipboardRouter = express.Router();

clipboardRouter.post("/", LoginRequired, clipboardEntry);

clipboardRouter.post("/file", LoginRequired, upload.single("file"), addClipboardFile);

// Route publique pour voir un clipboard partagé (sans authentification requise)
clipboardRouter.get("/share/:id", getClipboardEntry);

clipboardRouter.get("/:id", LoginRequired, getClipboardEntry);

clipboardRouter.get("/", LoginRequired, getClipboardEntries);

// Route pour basculer le statut favori
clipboardRouter.patch("/:id/favorite", LoginRequired, toggleFavorite);

clipboardRouter.delete("/:id", LoginRequired, deleteClipboardEntry);

module.exports = clipboardRouter;