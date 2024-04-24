import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.models.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


const generateAccessAndRefreshToken = async (userId) => {
    const user = await User.findById(userId)
    const refreshToken = user.generateRefreshToken()
    const accessToken = user.generateAccessToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })
    return { accessToken, refreshToken }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
    const { fullname, email, username, password } = req.body;

    if (
        [email, username, fullname, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "Fill the Mendotary fields.")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User already exists.")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar Image is required.")
    }

    let coverImageLocalPath = req.files?.coverImage[0]?.path

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "avatar is required.")
    }

    const user = await User.create({
        fullname,
        username: username.toLowerCase(),
        password,
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user")
    }

    return res.status(200).json(
        new ApiResponse(200, createdUser, "User Registered Successfully.")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const { email, username, password } = req.body

    if ((!username && !email)) {
        throw new ApiError(400, "username or email is required")
    }
    

    const user = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (!user) {
        throw new ApiError(400, "User does not exists.")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid Credintials.")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
    const updatedUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
        maxAge: 1000*60*60*24*30,
    }
    
    res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: updatedUser, accessToken, refreshToken }, "User LoggedIn Successfully."))
        

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set: { refreshToken: undefined }
    })

    const options = {
        httpOnly: true,
        secure: true
    }
    
    res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out."))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(400,"Unauthorized request")
    }

    const decodeToken = jwt.verify(incomingRefreshToken, process.env.ACCESS_REFRESH_SECRET);

    const user = await User.findById(decodeToken?._id);
    if (!user) {
        throw new ApiError(400,"Invalid Refresh Token")
    }

    if (incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(400,"Refresh token is expired or used")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
    
    return res.status(200)
        .json(
        new ApiResponse(200,{accessToken,refreshToken},"Access Token Refreshed.")
    )
})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body
    const user = await User.findById(req.user?._id)
    if (!user) {
        throw new ApiError(400,"Unauthorized request")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) {
        throw new ApiError(400,"Invalid Password.")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })
    
    return res.status(200)
        .json(
        new ApiResponse(200,{},"Password Changed Successfully.")
    )
})

const getUserDetails = asyncHandler(async (req, res) => {
    return res.status(200)
        .json(
        new ApiResponse(200,req.user,"User fetched Succesfully.")
    )
})

const updateUserDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body;
    if (!fullname && !email) {
        throw new ApiError(400,"Fill mendotary fields.")
    }

    const user = await User.findById(req.user?._id)
    
    fullname ? user.fullname = fullname : "";
    email ? user.email = email : "";

    await user.save({ validateBeforeSave: false })

    const updatedUser = await User.findById(req.user?._id).select("-password -refreshToken")
    
    return res.status(200)
        .json(
        new ApiResponse(200,updatedUser,"User Details Updated Successfully.")
    )

})

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400,"CoverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!coverImage.url) {
        throw new ApiError(200,"Error while uploding coverImage")
    }
    
    //TODO: delete old image - assignment
    await deleteFromCloudinary(req.user?.coverImage)

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set : { coverImage : coverImage.url}
        },
        {
        new : true
        }).select("-password -refreshToken")
    
    return res.status(200)
        .json(
        new ApiResponse(200,user,"CoverImage updated successfully")
    )
})

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url) {
        throw new ApiError(200,"Error while uploding avatar")
    }
    
    //TODO: delete old image - assignment
    await deleteFromCloudinary(req.user?.avatar)

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set : { avatar : avatar.url}
        },
        {
        new : true
        }).select("-password -refreshToken")
    
    return res.status(200)
        .json(
        new ApiResponse(200,user,"Avatar Image updated successfully")
    )
})

const getChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;
    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase(),
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                subscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if (!channel.length) {
        throw new ApiError(400, "Channel not exist");
    }

    return res.status(200)
        .json(
            new ApiResponse(200, channel[0],"Channel Fetched Successfully.")
    )
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const history = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $unwind:"$watchHistory"
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory.videoId",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        }
                    }
                ]
            },
            
        },
        {
            $sort: {
               "watchHistory.date":-1
            }
        },
        {
            $project: {
                video: {
                    $first:"$video"
                }
            }
        },
        {
            $group: {
                _id: "$video._id",
                video: { $first: "$video" }
            }
        },
        {
            $replaceRoot: { newRoot: "$video" }
        }
        
        
    ])

    if (!history) {
        throw new ApiError(400,"Histroy not found.")
    }

    return res.status(200)
        .json(
        new ApiResponse(200,history,"history fetched successfully.")
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getUserDetails,
    updateUserDetails,
    updateAvatar,
    updateCoverImage,
    getChannelProfile,
    getWatchHistory
}
