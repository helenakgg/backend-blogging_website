// import { User } from "../../models/user.js";
// import { Article } from "../../models/article.js";
// import { Category } from "../../models/category.js"
// import { Like } from "../../models/like.js"
import { ValidationError } from "yup";
import { User, Category, Article, Like } from "../../models/relation.js"
import * as error from "../../middlewares/index.js";
import db from "../../database/index.js";
import fs from "fs";
import path from "path";

//@get all Categories controller
export const getCategory = async (req, res, next) => {
  try {
    const categories = await Category.findAll();
    //@send response
    res.status(200).json({ result: categories });
  } catch (error) {
    next(error);
  }
};

//@get articles by category controller
export const getArticleByCategory = async (req, res, next) => {
  try {
    //@get query parameters
    const { id_cat, sort, page } = req.query;

    //@Pagination
    //@maximum article per page
    const pageSize = 10;
    let offset = 0;
    let limit = pageSize;
    let currentPage = 1;

    if (page && !isNaN(page)) {
      currentPage = page;
      offset = (currentPage - 1) * pageSize;
    }

    let queryOptions = {};

    //@query based on parameters
    if (id_cat) {
      queryOptions = {
        include: [
          {
            model: User,
            attributes: ["username", "imgProfile"],
          },
          {
            model: Category,
            attributes: ["id", "name"],
          },
        ],
        where: { categoryId: id_cat, isDeleted: 0 },
        order: [["createdAt", sort]],
        offset,
        limit,
      };
    } else {
      queryOptions = {
        include: [
          {
            model: User,
            attributes: ["username", "imgProfile"],
          },
          {
            model: Category,
            attributes: ["id", "name"],
          },
        ],
        where: { isDeleted: 0 },
        order: [["createdAt", "DESC"]],
        offset,
        limit,
      };
    }

    const { count, rows: articles } = await Article.findAndCountAll(queryOptions);

    const totalPages = Math.ceil(count / pageSize);

    //@send response
    res.status(200).json({
      totalArticles: count,
      articlesLimit: limit,
      totalPages: totalPages,
      currentPage: parseInt(currentPage),
      result: articles,
    });
  } catch (error) {
    next(error);
  }
};

//@get most favorite articles
export const getMostFavoriteArticles = async (req, res, next) => {
  try {
    const favoriteArticles = await Article.findAll({
      include: [
        {
          model: User,
          attributes: ["username", "imgProfile"],
        },
        {
          model: Category,
          attributes: ["id", "name"],
        },
        {
          model: Like,
          attributes: ["userId", "articleId"],
        },
      ],
      where: { isDeleted: 0 },
      order: [["totalLike", "DESC"]],
      limit: 10,
    });

    //@send response
    res.status(200).json({ result: favoriteArticles });
  } catch (error) {
    next(error);
  }
};

//@get liked articles with id
export const getLikeArticleById = async (req, res, next) => {
  try {
    //@get query parameters
    const { page } = req.query;

    const {userId} = req.body;
    
    //@Pagination
    const pageSize = 10;
    let offset = 0;
    let limit = pageSize;
    let currentPage = 1;

    if (page && !isNaN(page)) {
      currentPage = page;
      offset = (currentPage - 1) * pageSize;
    }

    //@get the article liked by user
    const { count, rows: likeArticle } = await Like.findAndCountAll({
        where: { userId: userId },
        include: [
        {
            model: Article,
            attributes: ["id", "title", "content", "imageURL", "categoryId"],
            where: { isDeleted: 0 },
            include: [
            {
                model: Category,
                attributes: ["id", "name"],
            },
            {
                model: User,
                attributes: ["id", "username", "imgProfile"],
            },
            ],
        },
        ],
        offset,
        limit,
    });
  
    const totalPages = Math.ceil(count / pageSize);

    //@send response
    res.status(200).json({
      totalArticles: count,
      articlesLimit: limit,
      totalPages: totalPages,
      currentPage: parseInt(currentPage),
      result: likeArticle,
    });
  } catch (error) {
    next(error);
  }
};

//@Like Article
export const likeArticle = async (req, res, next) => {
  try {
    const {userId, articleId} = req.body;

    const already = await Like?.findOne({where : {userId, articleId}});
    if(already) throw ({status : 400, message : error.BAD_REQUEST});

    const liked = await Like?.create({userId, articleId})

    res.status(200).json({message : "Like Article Success", data : liked});
}catch(error){
    next(error)
}
};

//@Create Article
export const createArticle = async (req, res, next) => {
    try{
        const {data} = req.body;
        const body = JSON.parse(data);
        const {title, userId, content, categoryId, country, keywords, createdAt } = body

        const ArticleExists = await Article?.findOne({where : {title}});
        if (ArticleExists) throw ({status : 400, message : "Article already exists."})

        const newArticle = await Article?.create({title, userId, content, country, keywords, categoryId, createdAt, image : req?.file?.path})

        res.status(201).json({type : "success", message : "Create article success", data : newArticle});
    }catch(error){
        if(error instanceof ValidationError){
            return next({status : 400, message : error?.errors?.[0]})
        }
        next(error);
    }
}

//@delete article
export const deleteArticle = async (req, res, next) => {
//   const transaction = await db.sequelize.transaction();
  try {
    //@get article id from body
    const { articleId } = req.body;

    //@update isDeleted status
    await Article?.update(
      {
        isDeleted: 1,
      },
      { where: { id: articleId } }
    );

    //@send Response
    res.status(200).json({ message: "Article deleted successfully" });
    // await transaction.commit();
  } catch (error) {
    // await transaction.rollback();
    next(error);
  }
};

//@viem user profile image
export const viewImage = async (req, res, next) => {
  try {
    //@get article id from body
    const { folder, file } = req.params;
    const image = path.join(process.cwd(), "public", "images", folder, file);
    //@send response
    res.status(200).sendFile(image);
  } catch (error) {
    next(error);
  }
};