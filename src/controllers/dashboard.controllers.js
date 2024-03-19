import mongoose from "mongoose"
import {Video} from "../models/video.models.js"
import {Subscription} from "../models/subscription.models.js"
// import {Like} from "../models/like.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const totalSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $group: {
                _id: null,
                totalSubscribers: {
                    $sum: 1
                }
            }
        }
    ]);

    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id),
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "totalLikes"
            }
        },
        {
            $addFields: {
                totalLikes: {
                    $size: "$totalLikes"
                }
            }
        },
        {
            $group: {
                _id: null,
                totalLikes: {
                    $sum:"$totalLikes"
                },
                totalViews: {
                    $sum:"$views"
                },
                totalVideos: {
                    $sum:1
                }
            }
        }
    ]);

    const stats = {
        totalSubscribers: totalSubscribers[0]?.totalSubscribers || 0,
        totalVideos: videos[0]?.totalVideos || 0,
        totalLikes: videos[0]?.totalLikes || 0,
        totalViews: videos[0]?.totalViews || 0
    }

    return res.status(200).json(
        new ApiResponse(200,stats,"Channel stats fetched successfully.")
    )

})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const userId = new mongoose.Types.ObjectId(req.user?._id)
    const videos = await Video.aggregate([
        {
            $match: {
                owner: userId
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                createdAt: {
                    $dateToParts: { date: "$createdAt" }
                },
                likesCount: {
                    $size: "$likes"
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                createdAt: {
                    year: 1,
                    month: 1,
                    day: 1,
                    hour: 1,
                    minute: 1,
                },
                isPublished: 1,
                likesCount: 1,
            }
        }
    ]);

    if (!videos) {
        throw new ApiError(500,"some error occured.")
    }

    return res.status(200).json(
        new ApiResponse(200,videos,"Videos fetched successfully.")
    )
})

export {
    getChannelStats, 
    getChannelVideos
}