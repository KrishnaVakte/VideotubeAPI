import mongoose from "mongoose"
import { Comment } from "../models/comment.models.js"
import { Video } from "../models/video.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(400, "Video not found.");
    }

    let comments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "commentBy",
                foreignField: "_id",
                as: "commentBy",
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
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
            }
        },
        {
            $addFields: {
                isLiked: {
                    $cond: {
                        if: {
                            $in:[req.user._id,"$likes.likedBy"]
                        },
                        then: true,
                        else: false
                    }
                },
                likesCount: {
                    $size: "$likes"
                },
                commentBy: {
                    $first: "$commentBy"
                }
            }
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: limit
        },
        {
            $project: {
                _id: 0,
                content: 1,
                commentBy: 1,
                likesCount: 1,
                isLiked:1,
            }
        }
    ])

    if (!comments) {
        throw new ApiError(500,"Error while fetching comments.")
    }

    return res.status(200).json(
        new ApiResponse(200,comments,"Comments Fetched Successfully.")
    )
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params;
    const { content } = req.body;

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "No video found.")
    }

    if (!content?.trim()) {
        throw new ApiError(400, "Content is required.")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        commentBy: req.user._id,
    })

    if (!comment) {
        throw new ApiError(500, "Error while uploading comment.")
    }

    return res.status(200).json(
        new ApiResponse(200, comment, "comment added successfully.")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
        throw new ApiError(400, "Content is required.")
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(400, "Unauthorized Access.");
    }

    const newComment = await Comment.findByIdAndUpdate(commentId, {
        $set: {
            content
        }
    }, { new: true })

    if (!newComment) {
        throw new ApiError(500, "Error while updating comment.")
    }

    return res.status(200).json(
        new ApiResponse(200, newComment, "Comment Updated Successfully.")
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;

    const comment = await Comment.findOne({
        _id: commentId,
        commentBy: req.user._id,
    });
    if (!comment) {
        throw new ApiError(400, "Unauthorized Access.")
    }

    const deleteComment = await Comment.findByIdAndDelete(commentId);
    if (!deleteComment) {
        throw new ApiError(500, "Error while deleting comment.");
    }

    return res.status(200).json(
        new ApiResponse(200, deleteComment, "Comment deleted successfully.")
    )
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}