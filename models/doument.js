const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Document = sequelize.define("Document", {
    filename: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
});

module.exports = {Document};
