import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.models.js"
import { Tweet } from "../models/tweet.models.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"


const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body;
    if (!content?.trim()) {
        throw new ApiError(400, "Content is required.");
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    })

    if (!tweet) {
        throw new ApiError(500, "Error while uploading tweet.");
    }

    return res.status(200)
        .json(
            new ApiResponse(200, tweet, "Tweet uploaded successfully.")
        )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const { username } = req.params;
    const user =await User.findOne({
        username
    })
    if (!user) {
        throw new ApiError(400,"Invalid Username.")
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(user._id)
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
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes",
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                },
                likesCount: {
                    $size: "$likes"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [user._id,"$likes.likedBy"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                content: 1,
                likesCount: 1,
                isLiked: 1,
                owner: 1
            }
        }
    ])

    if (!tweets) {
        throw new ApiError(400,"No tweets found.")
    }

    return res.status(200)
        .json(
        new ApiResponse(200,tweets,"tweets fetched successfully.")
    )
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params;
    const { content } = req.body;
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId.")
    }
    if (!content.trim()) {
        throw new ApiError(400, "Content is required.")
    }
    const tweet = await Tweet.findOneAndUpdate(
        {
            owner: new mongoose.Types.ObjectId(req.user._id),
            _id: new mongoose.Types.ObjectId(tweetId)
        }, {
        $set: {
            content
        },
    }, { new: true })

    if (!tweet) {
        throw new ApiError(400,"Error while uploading tweet.")
    }

    return res.status(200)
        .json(
        new ApiResponse(200,tweet,"tweet updated successfully.")
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400,"invalid tweetId.")
    }

    try {
        await Tweet.findOneAndDelete({
            _id: tweetId,
            owner: req.user._id
        })
    } catch (error) {
        throw new ApiError(400,`error while deleting tweet : ${error.message}`)
    }

    return res.status(200)
        .json(
        new ApiResponse(200,{},"tweet Deleted successfully.")
    )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}