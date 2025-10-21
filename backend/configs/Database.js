const e = require("express");
const logger = require("../utils/Logger");
const mongoose = require("mongoose");


const connect_db = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(
      "=================> Base de données connectée ! <================="
    );
    return mongoose.connection;
  } catch (error) {
    logger.error(
      "=================> Erreur lors de la connexion à la base de données <=================\n",
      error
    );
    console.log(error);

    process.exit(1);
  }
};


module.exports = {
  connect_db,
};
