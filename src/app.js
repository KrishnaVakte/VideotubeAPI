import express, { application } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials : true
}))

app.use(express.json({ limit: "20kb" }))
app.use(express.static("public"))
app.use(express.urlencoded({ extended: true, limit: "20kb" }))
app.use(cookieParser())


// router import
import userRouter from "./routes/user.routes.js"
import videoRouter from "./routes/video.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import subscriptionRouter from './routes/subscription.routes.js';
import likeRouter from "./routes/like.routes.js"
import commentRouter from "./routes/comment.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"
import { errorHandler } from './utils/errorHandler.js';

app.use("/api/v1/user", userRouter);
app.use('/api/v1/video', videoRouter);
app.use('/api/v1/tweet', tweetRouter);
app.use("/api/v1/subscription", subscriptionRouter)
app.use("/api/v1/like", likeRouter)
app.use("/api/v1/comment", commentRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/dashboard", dashboardRouter)
// app.use(errorHandler);

app.get('/', (req, res) => {
    res.send("API Working.. ")
})


export { app };