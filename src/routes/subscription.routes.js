import { Router } from "express";
import {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
} from "../controllers/subscription.controllers.js"

import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.use(verifyJWT);

router
    .route("/c/:channelId")
    .post(getUserChannelSubscribers)
    .patch(toggleSubscription);

router.route("/u/:subscriberId").post(getSubscribedChannels);

export default router;