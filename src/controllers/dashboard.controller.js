import mongoose from "mongoose"
import Video from "../models/video.model.js"
import Subscription from "../models/subscription.model.js"
import Like from "../models/like.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const subscription = await Subscription.aggregate([
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
    
    if(!subscription){
        throw new apiError(400, "Failed to Fetch Subscribers.");
    }

    const video = await Video.aggregate([
        {
            $match: {
                uploader: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "videos",
                as: "likes"
            }
        },
        {
            $project: {
                totalLikes: {
                    $sum: "$likes"
                },
                totalViews: "$views",
                totalVideos: 1
            }
        },
        {
            $group: {
                _id: null,
                totalLikes: {
                    $sum: "$totalLikes"
                },
                totalViews: {
                    $sum: "$totalViews"
                },
                totalVideos: {
                    $sum: 1
                }
            }
        }
    ]);

    if(!video){
        throw new apiResponse(400, "Failed to Fetch Videos Data.")
    }

    const channelStats = {
        totalSubscribers: subscription[0]?.totalSubscribers,
        totalVideos: video[0]?.totalVideos,
        totalViews: video[0]?.totalViews,
        totalLikes: video[0]?.totalLikes,
    }

    return res
    .status(200)
    .json(new apiResponse(200, channelStats, "Channel Data Fetched Successfully"))
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const videos = await Video.aggregate([
        {
            $match: {
                uploader: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "videos",
                as: "likes",
            }
        },
        {
            $addFields: {
                createdAt: {
                    $dateToParts: {date: "$createdAt"}
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
                views: 1,
                createdAt: {
                    year: 1,
                    month: 1,
                    date: 1
                },
                isPublished: 1,
                likesCount: 1
            }
        }
    ])

    return res
    .status(200)
    .json(new apiResponse(200, videos, "Channel Videos Fetched Successfully."))
})

export {
    getChannelStats, 
    getChannelVideos
    }