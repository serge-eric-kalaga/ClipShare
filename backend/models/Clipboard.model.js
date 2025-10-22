const mongoose = require("mongoose");
const Joi = require("joi");


const ClipboardSchema = mongoose.Schema({
    title: { type: String, required: false, minlength: 1, maxlength: 200, default: "Sans titre" },
    content: { type: String, required: false, default: "" },
    files: { type: [String], required: false, default: [] },
    password: { type: String, required: false, default: null },
    expireAt: { type: Date, required: false, default: null },
    readOnly: { type: Boolean, required: false, default: false },
    visits: { type: Number, required: false, default: 0 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, default: null },
},
    { timestamps: true }
);

const Clipboard = mongoose.model("Clipboard", ClipboardSchema);


const CreateClipboardModel = Joi.object({
    _id: Joi.string().optional(),
    title: Joi.string().min(1).max(200).optional(),
    content: Joi.string().optional(),
    files: Joi.array().items(Joi.string()).optional(),
    password: Joi.string().allow(null).optional(),
    expireAt: Joi.date().greater('now').allow(null).optional(),
    readOnly: Joi.boolean().optional(),
}).messages({
    "object.unknown": "Des champs non autorisés ont été fournis.",
});

module.exports = { Clipboard, CreateClipboardModel };