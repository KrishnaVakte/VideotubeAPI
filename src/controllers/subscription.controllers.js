import mongoose, { isValidObjectId, mongo } from "mongoose"
import { Subscription } from "../models/subscription.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.models.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    // TODO: toggle subscription
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channelId.")
    }

    const user = await User.findById(channelId)
    if (!user) {
        throw new ApiError(400,"Channel not found.")
    }

    const isSubscribed = await Subscription.findOne({
        subscriber: req.user._id,
        channel: channelId
    });

    if (isSubscribed) {
        await Subscription.findByIdAndDelete(isSubscribed._id);

        return res.status(200)
            .json(
                new ApiResponse(200, { subscribed: false }, "Unsubscribed Successful.")
            )
    }

    await Subscription.create({
        channel: channelId,
        subscriber: req.user._id
    })

    return res.status(200)
        .json(
            new ApiResponse(200, { subscribed: true }, "Subscribed successfully.")
        )
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    let { channelId } = req.params;
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channelId");
    }

    channelId = new mongoose.Types.ObjectId(channelId)

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: channelId
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribedToSubscriber"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribedToSubscriber"
                            },
                            subscribedToSubsriber: {
                                $cond: {
                                    if: {
                                        $in: [channelId, "$subscribedToSubscriber.subscriber"]
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
                            fullname: 1,
                            avatar: 1,
                            subscribedToSubsriber: 1,
                            subscribersCount: 1
                        }
                    }
                ]
            }
        },
        {
            $facet: {
                "totalSubscribers": [
                    {
                        $count: "totalDocs"
                    },
                ],
                "subscribers": [
                    {
                        $unwind: "$subscriber"
                    }
                ]
            }
        },
        {
            $addFields: {
                totalSubscribers: {
                    $first: "$totalSubscribers.totalDocs" 
                }
            }
        },
        {
            $project: {
                _id: 0,
                subscribers: 1,
                totalSubscribers: 1
            }
        }
    ]);

    return res.status(200)
        .json(
            new ApiResponse(200, subscribers, "subscribers fetched successfully.")
        )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId),
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscriberCount",
                        }
                    },
                    {
                        $lookup: {
                            from: "videos",
                            localField: "_id",
                            foreignField: "owner",
                            as: "latestVideo"
                        }
                    },
                    {
                        $addFields: {
                            subscriberCount: {
                                $size: "$subscriberCount"
                            },
                            latestVideo: {
                                $last : "$latestVideo"
                            }
                        }
                    },
                    {
                        $project: {
                            fullname: 1,
                            username: 1,
                            avatar: 1,
                            subscriberCount: 1,
                            latestVideo:1
                        }
                    }
                ]
            }
        },
        {
            $facet: {
                "totalSubscribedChannel": [
                    {
                        $count: "total"
                    }
                ],
                "subscribedChannels": [
                    { $unwind: "$channel" }
                ]
            }
        },
        {
            $addFields: {
                totalSubscribedChannel: {
                    $first:"$totalSubscribedChannel.total" 
                }
            },
        },
        {
            $project: {
                _id: 0,
                subscribedChannels: 1,
                totalSubscribedChannel: 1
            }
        }
    ])

    return res.status(200)
        .json(
            new ApiResponse(200, subscribedChannels, "subscribed Channels fetched successfully.")
        )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}