import mongoose, {isValidObjectId} from "mongoose"
import Like from "../models/like.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid Video Id");
    }

    const isLiked = await Like.findOne({
        "likedBy": req.user?._id,
        "video": videoId
    });

    if(isLiked){
        await Like.findByIdAndDelete(isLiked?._id)
        return res
        .status(200)
        .json(new apiResponse(200, {liked: false}, "Video Unliked"));
    }

    await Like.create(
        {
            "likedBy": req.user?._id,
            "video": videoId
        }
    )
    return res
    .status(200)
    .json(new apiResponse(200, {liked: true}, "Video Liked"));
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!isValidObjectId(commentId)){
        throw new apiError(400, "Invalid Comment Id");
    }

    const isLiked = await Like.findOne({
        "likedBy": req.user?._id,
        "comment": commentId
    });

    if(isLiked){
        await Like.findByIdAndDelete(isLiked?._id)
        return res
        .status(200)
        .json(new apiResponse(200, {liked: false}, "Comment Unliked"));
    }

    await Like.create(
        {
            "likedBy": req.user?._id,
            "comment": commentId
        }
    )
    return res
    .status(200)
    .json(new apiResponse(200, {liked: true}, "Comment Liked"));
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!isValidObjectId(tweetId)){
        throw new apiError(400, "Invalid Tweet Id");
    }

    const isLiked = await Like.findOne({
        "likedBy": req.user?._id,
        "Tweet": tweetId
    });

    if(isLiked){
        await Like.findByIdAndDelete(isLiked?._id)
        return res
        .status(200)
        .json(new apiResponse(200, {liked: false}, "Tweet Unliked"));
    }

    await Like.create(
        {
            "likedBy": req.user?._id,
            "tweet": tweetId
        }
    )
    return res
    .status(200)
    .json(new apiResponse(200, {liked: true}, "Tweet Liked"));
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideos",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "uploader",
                            foreignField: "_id",
                            as: "uploader"
                        }
                    },
                    {
                        $unwind: "$uploader"
                    }
                ]
            }
        },
        {
            $unwind: "$likedVideos"
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                _id: 0,
                likedVideos: {
                    _id: 1,
                    videoFile: 1,
                    thumbnail: 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    uploader: {
                        userName: 1,
                        fullName: 1,
                        avatar: 1,
                    }
                }
            }
        }
    ])

    if(!likedVideos){
        throw new apiError(400, "Failed To Fetch Liked Videos");
    }

    return res
    .status(200)
    .json(new apiResponse(200, likedVideos, "All Liked Videos Fetched Successfully."))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}