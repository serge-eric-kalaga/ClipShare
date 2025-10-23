const express = require("express");
const { addClipboardFile, getClipboardEntry, clipboardEntry, deleteClipboardEntry, getClipboardEntries } = require("../controllers/Clipboard.controller");
const { IsAdmin, LoginRequired } = require("../middlewares/Auth");
const { upload } = require("../middlewares/Upload");

const clipboardRouter = express.Router();

clipboardRouter.post("/", LoginRequired, clipboardEntry);

clipboardRouter.post("/file", LoginRequired, upload.single("file"), addClipboardFile);

clipboardRouter.get("/:id", LoginRequired, getClipboardEntry);

clipboardRouter.get("/", LoginRequired, getClipboardEntries);

clipboardRouter.delete("/:id", LoginRequired, deleteClipboardEntry);

module.exports = clipboardRouter;