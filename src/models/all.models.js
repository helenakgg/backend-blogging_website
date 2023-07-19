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
    userId: {
        type: db.Sequelize.INTEGER,
        allowNull : false
    },
    categoryId : {
        type : db.Sequelize.INTEGER,
        allowNull : false,
    },  
}
)

export const Like = db.sequelize.define("likes", {
    id: {
        type: db.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    article_id: {
        type: db.Sequelize.INTEGER,
        allowNull : false
    },
    user_id: {
        type: db.Sequelize.INTEGER,
        allowNull : false
    },
    
},
)

User.hasMany(Like);
User.hasMany(Article);

Category.hasMany(Article);

Article.belongsTo(Category, {foreignKey : 'categoryId'});
Article.belongsTo(User, {foreignKey : 'userId'});
Article.hasMany(Like);

Like.belongsTo(User, {foreignKey : 'user_id'});
Like.belongsTo(Article, {foreignKey : 'article_id'});

