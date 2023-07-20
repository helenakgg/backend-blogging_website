import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
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