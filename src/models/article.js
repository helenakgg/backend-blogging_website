import db from "../database/index.js";

export const Article = db.sequelize.define("articles", {
    id: {
        type: db.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    title: {
        type : db.Sequelize.STRING(45),
        allowNull : false
    },
    imageURL : {
        type : db.Sequelize.STRING(255),
        allowNull : true,
    },
    content : {
        type : db.Sequelize.TEXT('long'),
        allowNull : false
    },
    videoURL : {
        type : db.Sequelize.STRING(255),
        allowNull : true,
    },
    country : {
        type : db.Sequelize.STRING(45),
        allowNull : true,
    },
    keywords : {
        type : db.Sequelize.STRING(45),
        allowNull : false,
    },
    createdAt : {
        type : db.Sequelize.DATE,
        allowNull : false,
    },
    isDeleted: {
        type: db.Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    totalLike: {
        type: db.Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },  
    userId: {
        type: db.Sequelize.INTEGER,
        allowNull : false
    },
    categoryId : {
        type : db.Sequelize.INTEGER,
        allowNull : false,
    },
},
{ timestamps: false }
)