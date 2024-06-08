import { Router } from "express";

import { 
    registerUser,
    loginUser,
    logoutUser,
    sendotp,
    refreshAccessToken,
    changeCurrentPassword,
    getUserDetails,
    updateUserDetails,
    updateAvatar,
    updateCoverImage,
    getChannelProfile,
    getWatchHistory
} from "../controllers/user.controllers.js";
 
import {upload} from '../middlewares/multer.middlewares.js'
import { verifyJWT } from "../middlewares/auth.middlewares.js";


const router = Router()

router.post("/register", upload.fields([
    {
        name: "avatar",
        maxCount: 1
    },
    {
        name: "coverImage",
        maxCount: 1,
    }
]), registerUser)

router.post("/login", loginUser) //upload.none() required for taking form-data
router.get("/c/:username", getChannelProfile);
router.post("/sendotp", sendotp)
 
//Secured Routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getUserDetails)
router.route("/update-account").patch(verifyJWT, updateUserDetails)

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar)
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateCoverImage)
router.route("/history").get(verifyJWT, getWatchHistory);


export default router