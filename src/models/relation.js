import { User } from "./user.js"
import { Category } from "./category.js"
import { Article } from "./article.js"
import { Like } from "./like.js"

// @define relations
User.hasMany(Like);
User.hasMany(Article);

Category.hasMany(Article);

Article.belongsTo(Category, {foreignKey : 'categoryId'});
Article.belongsTo(User, {foreignKey : 'userId'});
Article.hasMany(Like);

Like.belongsTo(User, {foreignKey : 'userId'});
Like.belongsTo(Article, {foreignKey : 'articleId'});

export { User, Category, Article, Like }
