import db from "../database/index.js";

export const Like = db.sequelize.define("likes", {
    id: {
        type: db.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    articleId: {
        type: db.Sequelize.INTEGER,
        allowNull : false
    },
    userId: {
        type: db.Sequelize.INTEGER,
        allowNull : false
    },    
},
{ timestamps: false }
)