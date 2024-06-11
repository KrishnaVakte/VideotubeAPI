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
    getWatchHistory,
    getUserNotifications,
    deleteNotification
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
router.post("/sendotp", sendotp)

//Secured Routes
router.get("/c/:username",verifyJWT, getChannelProfile);
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").post(verifyJWT, getUserDetails)
router.route("/update-account").patch(verifyJWT, updateUserDetails)

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar)
router.route("/cover-image").post(verifyJWT, upload.single("coverImage"), updateCoverImage)
router.route("/history").post(verifyJWT, getWatchHistory);

router.get('/notifications', verifyJWT, getUserNotifications);
router.delete('/notification/:notificationId', verifyJWT, deleteNotification);

export default router