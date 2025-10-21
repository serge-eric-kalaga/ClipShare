const express = require("express");
const { IsAdmin, LoginRequired } = require("../middlewares/Auth");

const userRouter = express.Router();

const {
  getAllUsers,
  createUser,
  loginUser,
  getUserByUsername,
  deleteUser,
  updateUser,
} = require("../controllers/User.controller");


userRouter.get("/", LoginRequired, getAllUsers);

userRouter.get("/:username", LoginRequired, getUserByUsername);

userRouter.delete("/:username", LoginRequired, deleteUser);

userRouter.post("/", IsAdmin, createUser);

userRouter.post("/auth/register", createUser);

userRouter.put("/:username", LoginRequired, updateUser);

userRouter.post("/auth/login", loginUser);

module.exports = userRouter;
