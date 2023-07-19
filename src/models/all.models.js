import db from "./index.js";

export const User = db.sequelize.define("users", {
    id: {
        type: db.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    username: {
        type: db.Sequelize.STRING(45),
        allowNull: false
    },
    password: {
        type: db.Sequelize.STRING(125),
        allowNull : false
    },
    email: {
        type : db.Sequelize.STRING(45),
        allowNull : false
    },
    phone : {
        type : db.Sequelize.INTEGER,
        allowNull : false
    },    
    isVerified : {
        type : db.Sequelize.BOOLEAN,
        allowNull : false,
        defaultValue : 0
    },
    imgProfile : {
        type : db.Sequelize.STRING(255),
        allowNull : true
    },
    verifyToken : {
        type : db.Sequelize.STRING(255),
        allowNull : true,
    },
    expiredToken : {
        type : db.Sequelize.TIME,
        allowNull : true,
    },
},
)

