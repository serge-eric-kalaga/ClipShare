const { DB, connect_db } = require("../configs/Database");
const { User, CreateUserModel, UpdateUserModel, LoginModel } = require("./User.model");
const { Clipboard, CreateClipboardModel } = require("./Clipboard.model");


module.exports = {
  User,
  CreateUserModel,
  UpdateUserModel,
  LoginModel,

  Clipboard,
  CreateClipboardModel,

  DB,
  connect_db,
};