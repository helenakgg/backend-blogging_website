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
router.post("/verify", AuthControllers.verify)
router.post("/request-otp", AuthControllers.requestOtp)
router.get("/keep-login", verifyUser, AuthControllers.keepLogin)
router.put("/forgot-password", AuthControllers.forgotPassword)
router.patch("/reset-password", verifyUser, AuthControllers.resetPassword)
router.patch("/change-username", verifyUser, AuthControllers.changeUsername)
router.patch("/change-password", verifyUser, AuthControllers.changePassword)
router.patch("/change-email", verifyUser, AuthControllers.changeEmail)
router.patch("/change-phone", verifyUser, AuthControllers.changePhone)
router.patch("/change-profile", verifyUser, uploader.single("file"), AuthControllers.changeProfile)
router.get("/public/images/:folder/:file", AuthControllers.getProfilePicture)

router.delete("/account", verifyUser, AuthControllers.deleteAccount)

export default router
