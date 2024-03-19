import { Router } from "express";
import {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
} from "../controllers/tweet.controllers.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();
router.use(verifyJWT);

router.route("/").post(createTweet);

router.route("/:username").get(getUserTweets);

router.route("/:tweetId")
    .patch(updateTweet)
    .delete(deleteTweet)

export default router;
