import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.models.js"
import { Video } from "../models/video.models.js"
import { Comment } from "../models/comment.models.js"
import { Tweet } from "../models/tweet.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle like on videoaId;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid VideoId");
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, "Video not found.")
    }

    let isLiked = await Like.findOneAndDelete({
        video: videoId,
    });
    let msg = "Video UnLiked Successfully.";
    let liked = false;

    if (!isLiked) {
        isLiked = await Like.create({
            likedBy: req.user._id,
            video: videoId
        })
        if (!isLiked) {
            throw new ApiError(500, "Error while Like the video.")
        }
        msg = "Video Liked Successfully."
        liked = true;
    }

    return res.status(200)
        .json(
            new ApiResponse(200, { liked }, msg)
        )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid CommentId");
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(400, "comment not found.")
    }

    let isLiked = await Like.findOneAndDelete({
        comment: commentId,
    });
    let msg = "Comment UnLiked Successfully.";
    let liked = false;

    if (!isLiked) {
        isLiked = await Like.create({
            likedBy: req.user._id,
            comment: commentId
        })
        if (!isLiked) {
            throw new ApiError(500, "Error while Like the Comment.")
        }
        msg = "Comment Liked Successfully."
        liked = true
    }

    return res.status(200)
        .json(
            new ApiResponse(200, { liked }, msg)
        )

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid TweetId");
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(400, "tweet not found.")
    }

    let isLiked = await Like.findOneAndDelete({
        tweet: tweetId,
    });
    let msg = "Tweet UnLiked Successfully.";
    let liked = false;

    if (!isLiked) {
        isLiked = await Like.create({
            likedBy: req.user._id,
            tweet: tweetId
        })
        if (!isLiked) {
            throw new ApiError(500, "Error while Like the tweet.")
        }
        msg = "tweet Liked Successfully."
        liked = true
    }

    return res.status(200)
        .json(
            new ApiResponse(200, { liked }, msg)
        )

}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const  userId  = req.user._id;

    const likedVideo = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId),
                video: {
                    $exists: true
                }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $match: {
                            $or:[{isPublished:true},{owner:new mongoose.Types.ObjectId(userId)}]
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullname: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            },
        },
        {
            $addFields: {
                video: {
                    $first: "$video"
                }
            }
        },
        {
            $replaceRoot: {
                newRoot: "$video"
            }
        },
    ])

    if (!likedVideo.length) {
        return res.status(200).json(
            new ApiResponse(200,[],"No Liked Videos")
        )
    }
    return res.status(200).json(
        new ApiResponse(200,likedVideo,"Liked Video Fetched Successfully.")
    )

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}