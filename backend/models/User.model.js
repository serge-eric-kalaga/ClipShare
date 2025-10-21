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
  nom_prenom: Joi.string().required().min(3).max(200),
  username: Joi.string().required().min(3).max(40).allow(/[^a-zA-Z0-9]/),
  password: Joi.string().required().min(4),
  role: Joi.string().valid("ADMIN", "USER").default("USER"),
});

const UpdateUserModel = Joi.object({
  nom_prenom: Joi.string().min(3).max(200).optional(),
  username: Joi.string().min(3).max(40).alphanum().optional().allow(/[^a-zA-Z0-9]/),
  password: Joi.string().min(4).optional(),
  role: Joi.string().valid("ADMIN", "USER").optional(),
})

module.exports = { User, CreateUserModel, UpdateUserModel };
