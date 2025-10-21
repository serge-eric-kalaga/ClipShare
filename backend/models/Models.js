const { User, CreateUserModel, UpdateUserModel, LoginModel } = require("./User.model");
const { DB, connect_db } = require("../configs/Database");


module.exports = {
  User,
  CreateUserModel,
  UpdateUserModel,
  LoginModel,
};