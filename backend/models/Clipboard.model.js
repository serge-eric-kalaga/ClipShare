const mongoose = require("mongoose");
const Joi = require("joi");


const ClipboardSchema = mongoose.Schema({
    title: { type: String, required: false, minlength: 1, maxlength: 200, default: "Sans titre" },
    content: { type: String, required: false, default: null, nullable: true },
    files: { type: [String], required: false, default: [], nullable: true },
    password: { type: String, required: false, default: null, nullable: true },
    expireAt: { type: Date, required: false, default: null, nullable: true },
    readOnly: { type: Boolean, required: false, default: false, nullable: true },
    isFavorite: { type: Boolean, required: false, default: false, nullable: true },
    visits: { type: Number, required: false, default: 0, nullable: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, default: null, nullable: true },
},
    { timestamps: true }
);

const Clipboard = mongoose.model("Clipboard", ClipboardSchema);


const CreateClipboardModel = Joi.object({
    _id: Joi.string().optional(),
    title: Joi.string().min(1).max(200).optional().allow('').allow(null),
    content: Joi.string().optional().allow('').allow(null),
    files: Joi.array().items(Joi.string()).optional(),
    password: Joi.string().allow(null).optional().allow('').default(null),
    expireAt: Joi.date().greater('now').allow(null).optional().allow('').default(null),
    readOnly: Joi.boolean().optional().allow('').default(null),
    isFavorite: Joi.boolean().optional().allow('').default(null),
}).messages({
    "object.unknown": "Des champs non autorisés ont été fournis.",
});

module.exports = { Clipboard, CreateClipboardModel };