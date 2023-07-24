import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";
import * as config from "../config/index.js";

// @configure cloudinary storage
cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET
})
export const createCloudinaryStorage = (directory) => new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: directory,
        allowedFormats: ['jpeg', 'png', 'jpg'],
    }
})

// @configure upload
export const createUploader = (storage) => multer({
    storage: storage,
    limits: { fileSize: 1000000 }, // @1MB
})

//@configure storage
const createStorage = (directory) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, directory);
    },
    filename: (req, file, cb) => {
      cb(null, "IMG" + "-" + Date.now() + path.extname(file.originalname));
    },
  });

//@configure uploader
export const createProfileUploader = (directory) =>
  multer({
    storage: createStorage(directory),
    limits: { fileSize: 1000000 },
    fileFilter: (req, file, cb) => {
      //@Check file extentions
      const fileTypes = /jpg|jpeg|png|gif|/;
      const extname = fileTypes.test(
        path.extname(file.originalname).toLowerCase()
      );
      //@if image is not valid
      if (!extname) {
        return cb(new Error("Error : Image Only!", false));
      }
      //@if image is valid
      cb(null, true);
    },
  });

export const createThumbnailUploader = (directory) =>
  multer({
    storage: createStorage(directory),
    limits: { fileSize: 1000000 },
    fileFilter: (req, file, cb) => {
      //@Check file extentions
      const fileTypes = /jpg|jpeg|png|gif|/;
      const extname = fileTypes.test(
        path.extname(file.originalname).toLowerCase()
      );
      //@if image is not valid
      if (!extname) {
        return cb(new Error("Error : Image Only!", false));
      }
      //@if image is valid
      cb(null, true);
    },
  });