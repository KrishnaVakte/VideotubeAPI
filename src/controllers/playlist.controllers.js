import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.models.js"
import { Video } from "../models/video.models.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    //TODO: create playlist
    if (!name.trim() || !description.trim()) {
        throw new ApiError(400,"All fields are required.")
    }

    const isPlaylistExists = await Playlist.findOne({
        owner: req.user._id,
        name
    });
    if (isPlaylistExists) {
        throw new ApiError(400,"Playlist already exists.")
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user._id
    }) 

    if (!playlist) {
        throw new ApiError(500,"Playlist not created. try again...")
    }

    return res.status(200).json(
        new ApiResponse(200,playlist,"Playlist Created Successfully.")
    )
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid ObjectId.")
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(400,"No user found.")
    }
    
    const playlists = await Playlist.findOne(
        {
                owner: new mongoose.Types.ObjectId(userId),
                $or:[{isPublished:true}, {owner: req.user?._id}]
        }
    )

    return res.status(200).json(
        new ApiResponse(200,playlists,"playlists fetched successfully.")
    )

})

const getPlaylistById = asyncHandler(async (req, res) => {
    let {playlistId} = req.params
    //TODO: get playlist by id
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400,"Invalid PlaylistId")
    }

    const existPlaylist = await Playlist.findOne({
        _id: playlistId,
        $or: [{ isPublished: true }, { owner: req.user?._id }]
    });
    if (!existPlaylist) {
        throw new ApiError(400,"Playlist does not exist.")
    }

    playlistId=new mongoose.Types.ObjectId(playlistId)
    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: playlistId,
                $or: [{ isPublished: true }, { owner: req.user?._id }]
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
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $match: {
                            $or: [{ isPublished: true }, { owner: req.user?._id }]
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    },
                    {
                        $project: {
                            videoFile: 1,
                            thumbnail: 1,
                            title: 1,
                            description: 1,
                            duration: 1,
                            owner: {
                                username: 1,
                                fullname: 1,
                                avatar: 1,
                            },
                            views: 1,
                            createdAt: 1,
                            
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first:"$owner"
                },
                totalVideos: {
                    $size:"$videos"
                },
                totalViews: {
                    $sum:"$videos.views"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                owner: {
                    username: 1,
                    fullname: 1,
                    avatar: 1,
                },
                createdAt: 1,
                videos: 1,
                totalVideos: 1,
                totalViews:2
            }
        }
    ]);

    if (!playlist) {
        throw new ApiError(500,"Unable to fetch playlist. try again..")
    }

    return res.status(200).json(
        new ApiResponse(200,playlist[0],"Playlist fetched successfully.")
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400,"Invalid ObjectId")
    }

    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    if (!playlist) {
        throw new ApiError(400,"Playlist not found.")
    }
    if (!video) {
        throw new ApiError(400,"Video not found")
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate({
        _id: playlistId,
        owner:req.user?._id
    },
        {
            $addToSet: {
                videos: videoId
            }
        }, { new: true })
    
    if (!updatedPlaylist) {
        throw ApiError(400,"Unauthorized Access.")
    }

    return res.status(200).json(
        new ApiResponse(200,updatedPlaylist,"Video added to Playlist successfully.")
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400,"Invalid ObjectId.")
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(400,"Playlist Not found.")
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(400, "Video not found.");
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate({
        _id: playlistId,
        owner:req.user._id
    }, {
        $pull: {
            videos: videoId
        }
    }, { new: true })
    
    if (!updatedPlaylist) {
        throw new ApiError(400,"Unauthorized Access.")
    }

    return res.status(200).json(
        new ApiResponse(200,updatedPlaylist,"Video removed successfully.")
    )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400,"Invalid PlaylistId.")
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(400, "Playlist not found.");
    }

    const deletedPlaylist = await Playlist.findOneAndDelete({
        _id: playlistId,
        owner: req.user._id
    });
    if (!deletedPlaylist) {
        throw new ApiError(400,"Unathorized Access.")
    }

    return res.status(200).json(
        new ApiResponse(200,deletePlaylist,"Playlist Deleted successfully.")
    )

})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400,"Invalid playlistId.")
    }

    if (!name?.trim() || !description?.trim()) {
        throw new ApiError(400,"All fields are required.")
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(400,"Playlist not found.")
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate({
        _id: playlistId,
        owner: req.user._id
    }, {
        $set: {
            name, description
        }
    }, {
        projection: {
            name: 1,
            description:1
    }});
    
    if (!updatedPlaylist) {
        throw new ApiError(400,"Unauthorized Access.")
    }

    return res.status(200).json(
        new ApiResponse(200,updatedPlaylist,"Playlist updated successfully.")
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}