import db from "../database/index.js";

export const Category = db.sequelize.define("categories", {
    id: {
        type: db.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    name: {
        type : db.Sequelize.STRING(45),
        allowNull : false
    }
},
{ timestamps: false }
);
