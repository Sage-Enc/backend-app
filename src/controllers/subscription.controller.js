import mongoose, {isValidObjectId} from "mongoose"
import User from "../models/user.model.js"
import Subscription from "../models/subscription.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if(!isValidObjectId(channelId)){
        throw new apiError(400, "Invalid Channel Id");
    }

    const isSubscribed = await Subscription.findOne({
        "subscriber": req.user?._id,
        "channel": channelId
    });
    console.log(isSubscribed)
    if(isSubscribed){
        await Subscription.findByIdAndDelete(isSubscribed?._id)
        return res
        .status(200)
        .json(new apiResponse(200, {subscribed: false}, "Channel Unsubscribed"));
    }

    await Subscription.create(
        {
            "channel": channelId,
            "subscriber": req.user?._id
        }
    )
    return res
    .status(200)
    .json(new apiResponse(200, {subscribed: true}, "Channel Subscribed"));
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId(channelId)){
        throw new apiError(400, "Invalid Channel Id")
    }

    const allSubscriber = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId),
            },
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
                            as: "subscribedToSubscriber",
                        },
                    },
                    {
                        $addFields: {
                            subscribedToSubscriber: {
                                $cond: {
                                    if: {
                                        $in: [
                                            channelId,
                                            "$subscribedToSubscriber.subscriber",
                                        ],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                            subscribersCount: {
                                $size: "$subscribedToSubscriber",
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$subscriber",
        },
        {
            $project: {
                _id: 0,
                subscriber: {
                    _id: 1,
                    userName: 1,
                    fullName: 1,
                    avatar: 1,
                    subscribedToSubscriber: 1,
                    subscribersCount: 1,
                }
            }
        }
    ])

    if(!allSubscriber){
        throw new apiError(400, "Something Went Wrong While Fetching Subscribers")
    }

    return res
    .status(200)
    .json(new apiResponse(200, allSubscriber, "All Subscribers Fetched"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!isValidObjectId(subscriberId)){
        throw new apiError(400, "Invalid User Id");
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                "subscriber": new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelSubscribed",
                pipeline: [
                    {
                        $lookup: {
                            from: "videos",
                            localField: "_id",
                            foreignField: "uploader",
                            as: "videos"
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$channelSubscribed"
        },
        {
            $project: {
                _id: 0,
                channelSubscribed: {
                    _id: 1,
                    userName: 1,
                    fullName: 1,
                    avatar: 1
                },
            },
        },
    ])

    if(!subscribedChannels){
        throw new apiError(400, "Something Went Wrong While Fetching The Data");
    }

    return res
    .status(200)
    .json(new apiResponse(200, subscribedChannels, "Subscribed Channels Fetched Successfully."))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}
// 66c71c40c052faedec3bee28