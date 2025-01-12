require('dotenv').config();
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: "postgres",
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected...");

    // Automatically create tables based on models
    await sequelize.sync({ force: false }); // Set `force: true` to drop tables and recreate them
    console.log("Database synced...");
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
};

module.exports = { sequelize, connectDB };
