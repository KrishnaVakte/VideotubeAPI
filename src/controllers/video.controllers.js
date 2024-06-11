import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Notification } from "../models/notification.models.js";
import {
    uploadOnCloudinary,
    deleteFromCloudinary
} from "../utils/cloudinary.js";
import { User } from "../models/user.models.js";


const getAllVideos = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10, query, sortBy="createdAt", sortType="desc", userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const pipeline = [
        {
            $match: {
                owner: userId?.trim() ? new mongoose.Types.ObjectId(userId) : { $exists: true, $ne: null },
                isPublished: true,
                title: {
                    $regex: new RegExp(query?.trim().split('/\s+/').join('|'), 'i')  
                }
            }
        },
        sortBy ? {
            $sort: {
                [sortBy]: sortType === 'desc' ? -1 : 1
            }
        } : undefined,
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
        },
    ];
    const options = {
        page, limit
    }

    const filteredPipeline = pipeline.filter(Boolean);

    const videos = await Video.aggregate(filteredPipeline);

    return res.status(200)
        .json(
            new ApiResponse(200, videos, "videos fetched successfully.")
        )

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    // TODO: get video, upload to cloudinary, create video
    if ([title, description].some((field) => {
        return field?.trim() === "";
    })) {
        throw new ApiError(400, "All fields are required.");
    }
    
    const videoLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    console.log(videoLocalPath)
    if (!videoLocalPath ||
        !thumbnailLocalPath ||
        !req.files.videoFile[0]?.mimetype.includes('video') ||
        !req.files.thumbnail[0]?.mimetype.includes('image')
    ) {
        throw new ApiError(400, "video and thumbnail are not valid type.")
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    console.log(videoFile)

    if (!videoFile || !thumbnail) {
        throw new ApiError(400, "Error while uploading the file")
    }

    const duration = Math.floor(videoFile.duration);
    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title,
        description,
        duration,
        owner: req.user._id
    })

    if (!video) {
        throw new ApiError(400, "Something wrong during video creation.")
    }

    try {
        
    } catch (error) {
        
    }

     // Find all subscribers of the channel
     
     // Create notifications for each subscriber
     try {
        const subscribers = await Subscription.find({ channel: req.user._id});
         for (const sub of subscribers) {
             await Notification.create({
                 userId: sub.subscriber,
                 videoTitle: video.title,
                 channelAvatar: req.user?.avatar,
                 channelname: req.user?.username
             });
         }
    
    } catch (error) {
        console.log('notification not created.')
    }
    return res.status(200)
        .json(
            new ApiResponse(200, video, "Video uploaded successfully.")
        )

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId.")
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
                $or: [
                    { owner: new mongoose.Types.ObjectId(req.user?._id) },
                    { isPublished: true }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
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
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [req.user?._id, "$subscribers.subscriber"]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                },
                likesCount: {
                    $size: "$likes",
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$likes.likedBy"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        // {
        //     $project: {
        //         _id: 0,
        //         likes: 0
        //     }
        // }
    ])

    if (!video.length) {
        throw new ApiError(400, "No video found.")
    }

    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1
        }
    })

    await User.findByIdAndUpdate(req.user?._id, {
        $push: {
            watchHistory: {
                $each: [{
                    videoId, date: Date.now(),
                }],
                    $sort: { date: 1 }
            }
        }
    });


    return res.status(200).
        json(
            new ApiResponse(200, video[0], "Video fetched successfully.")
        )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body;
    //TODO: update video details like title, description, thumbnail
    const video = await Video.findOne({
        _id: videoId,
        owner: req.user._id,
    })
    if (!video) {
        throw new ApiError(400, "Unauthorized Access.");
    }

    if (!title?.trim() ||
        !description?.trim() ||
        !req.file) {
        throw new ApiError(400, "All fields are required.");
    }

    if (!req.file?.mimetype.includes('image')) {
        throw new ApiError(400, "Invalid thumbnail filetype.");
    }

    const thumbnail = await uploadOnCloudinary(req.file.path);
    if (!thumbnail) {
        throw new ApiError(500, "Something went wrong during file uploading.");
    }

    const updatedVideo = await Video.findByIdAndUpdate(videoId,
        {
            $set: {
                title,
                description,
                thumbnail: thumbnail.url
            }
        },
        { new: true }
    )

    if (!updatedVideo) {
        throw new ApiError(500, "Error while updatation.")
    }

    await deleteFromCloudinary(video.thumbnail);

    return res.status(200)
        .json(
            new ApiResponse(200, updatedVideo, "Video updated successfully.")
        )

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    const video = await Video.findOne({
        _id: videoId,
        owner: req.user._id
    });
    if (!video) {
        throw new ApiError(400, "Unauthorized Access.");
    }

    try {
        await Video.findByIdAndDelete(videoId);
        await deleteFromCloudinary(video.thumbnail);
        await deleteFromCloudinary(video.videoFile, 'video');
    } catch (error) {
        throw new ApiError(500, "Error while deleting video.");
    }

    return res.status(200)
        .json(
            new ApiResponse(200, "video deleted successfully.")
        )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const video = await Video.findOne({
        _id: videoId,
        owner: req.user._id,
    });
    if (!video) {
        throw new ApiError(400, "Invalid VideoId.");
    }

    try {
        video.isPublished = !video.isPublished;
        await video.save({ validateBeforeSave: false })
    } catch (error) {
        throw new ApiResponse(500, "something wron during updatation.")
    }

    return res.status(200)
        .json(
            new ApiResponse(200, video, "status changed.")
        )

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}