import { Router } from "express";
import path from "path";
import { verifyUser } from "../../middlewares/index.js";
import { createThumbnailUploader } from "../../helpers/index.js";

const uploader = createThumbnailUploader(
  path.join(process.cwd(), "public", "images", "thumbnails")
);

//@import controllers
import * as BlogController from "./index.js";

//@define route
const router = Router();
router.get("/", BlogController.getArticleByCategory);
router.post(
  "/create-article",
  verifyUser,
  uploader.single("file"),
  BlogController.createArticle
);
router.get("/all-category", BlogController.getCategory);
router.get("/most-fav", BlogController.getMostFavoriteArticles);
router.get("/liked-by-id", verifyUser, BlogController.getLikeArticleById);
router.post("/like", verifyUser, BlogController.likeArticle);
router.patch("/delete-article", verifyUser, BlogController.deleteArticle);
router.get("/public/images/:folder/:file", BlogController.viewImage);

export default router;