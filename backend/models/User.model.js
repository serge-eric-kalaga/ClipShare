const mongoose = require("mongoose");
const Joi = require("joi");

const UserSchema = mongoose.Schema({
  nom_prenom: { type: String, required: true, minlength: 3, maxlength: 200 },
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 40 },
  password: { type: String, required: true, minlength: 4 },
  role: { type: String, enum: ["ADMIN", "USER"], default: "USER" },
},
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

const CreateUserModel = Joi.object({
  nom_prenom: Joi.string().required().min(3).max(200).messages({
    "any.required": "Le nom et prénom est requis.",
    "string.min": "Le nom et prénom doit contenir au moins 3 caractères.",
    "string.max": "Le nom et prénom ne peut pas dépasser 200 caractères.",
  }),
  username: Joi.string().required().min(3).max(40).allow(/[^a-zA-Z0-9]/).messages({
    "any.required": "Le nom d'utilisateur est requis.",
    "string.min": "Le nom d'utilisateur doit contenir au moins 3 caractères.",
    "string.max": "Le nom d'utilisateur ne peut pas dépasser 40 caractères.",
  }),
  password: Joi.string().required().min(4).messages({
    "any.required": "Le mot de passe est requis.",
    "string.min": "Le mot de passe doit contenir au moins 4 caractères.",
  }),
  role: Joi.string().valid("ADMIN", "USER").default("USER"),
}).messages({
  "object.unknown": "Des champs non autorisés ont été fournis.",
}).required();

const UpdateUserModel = Joi.object({
  nom_prenom: Joi.string().min(3).max(200).optional(),
  username: Joi.string().min(3).max(40).alphanum().optional().allow(/[^a-zA-Z0-9]/),
  password: Joi.string().min(4).optional(),
  role: Joi.string().valid("ADMIN", "USER").optional(),
}).messages({
  "object.unknown": "Des champs non autorisés ont été fournis.",
}).required();

const LoginModel = Joi.object({
  username: Joi.string().required().min(3).max(40).allow(/[^a-zA-Z0-9]/).messages({
    "any.required": "Le nom d'utilisateur est requis.",
    "string.min": "Le nom d'utilisateur doit contenir au moins 3 caractères.",
    "string.max": "Le nom d'utilisateur ne peut pas dépasser 40 caractères.",
  }),
  password: Joi.string().required().min(4).messages({
    "any.required": "Le mot de passe est requis.",
    "string.min": "Le mot de passe doit contenir au moins 4 caractères.",
  }),
}).messages({
  "object.unknown": "Des champs non autorisés ont été fournis.",
}).required();

module.exports = { User, CreateUserModel, UpdateUserModel, LoginModel };
