import { Router } from "express"
import { verifyUser } from "../../middlewares/index.js"
// @import the controller
import * as AuthControllers from "./index.js"
import * as helpers from "../../helpers/index.js"

const storage = helpers.createCloudinaryStorage("profiles")
const uploader = helpers.createUploader(storage)

// @define routes
const router = Router()
router.post("/register", AuthControllers.register)
router.post("/login", AuthControllers.login)
router.get("/verify", AuthControllers.verify)
router.get("/keep_login", verifyUser, AuthControllers.keepLogin)
router.put("/forgot_password", AuthControllers.forgotPassword)
router.patch("/reset_password", verifyUser, AuthControllers.resetPassword)
router.patch("/users/change_username", verifyUser, AuthControllers.changeUsername)
router.patch("/users/change_password", verifyUser, AuthControllers.changePassword)
router.patch("/users/change_email", verifyUser, AuthControllers.changeEmail)
router.patch("/users/change_phone", verifyUser, AuthControllers.changePhone)
router.patch("/users/change_profile", verifyUser, uploader.single("file"), AuthControllers.changeProfile)
router.get("/users/profile_picture", verifyUser, AuthControllers.getProfilePicture)

router.delete("/account", verifyUser, AuthControllers.deleteAccount)

export default router
