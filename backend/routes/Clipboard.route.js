const express = require("express");
const { addClipboardFile, getClipboardEntry, clipboardEntry, deleteClipboardEntry, getClipboardEntries } = require("../controllers/Clipboard.controller");

const clipboardRouter = express.Router();

clipboardRouter.post("/", clipboardEntry);

clipboardRouter.post("/file", addClipboardFile);

clipboardRouter.get("/:id", getClipboardEntry);

clipboardRouter.get("/", getClipboardEntries);

clipboardRouter.delete("/:id", deleteClipboardEntry);

module.exports = clipboardRouter;