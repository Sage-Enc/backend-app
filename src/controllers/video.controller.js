import mongoose, {isValidObjectId} from "mongoose"
import Video from "../models/video.model.js"
import User from "../models/user.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary, deleteFromCloudinary, deleteVideoFromCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    const pipeline = [];

    if(query){
        pipeline.push({
            $search: {
                $index: "search-videos",
                $text: {
                    $query: query,
                    $path: ["$title", "$description"]
                }
            }
        })
    }

    if(userId){
        if(!isValidObjectId(userId)){
            throw new apiError(400, "Invalid User Id");
        }

        pipeline.push({
            $match: {
                uploader: new mongoose.Types.ObjectId(userId)
            }
        })
    }

    pipeline.push({ $match: { isPublished: true } });

    if(sortBy && sortType){
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc"? 1 : -1
            }
        });
    }else{
        pipeline.push({
            $sort: {
                createdAt: -1
            }
        })
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localFieldL: "uploader",
                foreignField: "_id",
                as: "uploader",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            userName: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$uploader"
        }
    )

    const videoAggregation = await Video.aggregate(pipeline);

    if(!videoAggregation){
        throw new apiError(400, "Failed To Fetch Videos");
    }

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const videos = await Video.aggregatePaginate(videoAggregation, options);

    if(!videos){
        throw new apiError(400, "Failed To Fetch Videos");
    }

    return res
    .status(200)
    .json(new apiResponse(200, videos, "Videos Fetched Successfully"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    // TODO: get video, upload to cloudinary, create video

    if(!title && !description){
        throw new apiError(400, "Both Title and Description is Required.");
    }

    const videoFilePath = req.files?.videoFile[0]?.path;
    const thumbnailFilePath = req.files?.thumbnail[0]?.path;

    if(!videoFilePath && !thumbnailFilePath){
        throw new apiError(400, "Both Video and Thumbnail Required.");
    }

    const videoFile = await uploadOnCloudinary(videoFilePath);
    const thumbnailFile = await uploadOnCloudinary(thumbnailFilePath);

    if(!videoFile && !thumbnailFile){
        await deleteVideoFromCloudinary(videoFile.url)
        await deleteFromCloudinary(thumbnailFile.url)
        throw new apiError(500, "Something went wrong while uploading the thumbnail.")
    }
    
    const duration = videoFile.duration;

    const owner = req.user?._id;

    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnailFile.url,
        title,
        description,
        duration,
        uploader: owner
    })

    if(!video){
        throw new apiError(500, "Something Went Wrong While Publishing The Video.")
    }

    return res
    .status(200)
    .json(new apiResponse(200, video, "Video Published Successfully."))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    // let userId = req.body;
    
    // userId = new mongoose.Types.ObjectId(userId)
    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid videoId");
    }

    if (!isValidObjectId(req.user?._id)) {
        throw new apiError(400, "Invalid userId");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
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
            $lookup: {
                from: "users",
                localField: "uploader",
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
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber"
                                        ]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            userName: 1,
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
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likes.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                videoFile: 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ]);

    if (!video) {
        throw new apiError(500, "failed to fetch video");
    }

    console.log(video)

    // increment views if video fetched successfully
    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1
        }
    });

    // add this video to user watch history
    await User.findByIdAndUpdate(req.user?._id, {
        $addToSet: {
            watchHistory: videoId
        }
    });

    return res
        .status(200)
        .json(
            new apiResponse(200, video[0], "video details fetched successfully")
        );
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const {title, description} = req.body;
    //TODO: update video details like title, description, thumbnail
    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid Video Id");
    }

    if(!isValidObjectId(req.user?._id)){
        throw new apiError(400, "Invalid User Id");
    }

    const video = await Video.findById(videoId)

    if(!video.uploader._id.equals(req.user?._id)){
        throw new apiError(400, "You are not Authorized to Modify this data")
    }

    if(!(title && description)){
        throw new apiError(400, "Required Fields Are Not Provided")
    }

    const deleteThumbnail = video.thumbnail;
    const newThumbnailPath = req.file?.path;
    if(!newThumbnailPath){
        throw new apiError(400, "No Thumbnail File Found.");
    }
    
    if(deleteThumbnail) await deleteFromCloudinary(deleteThumbnail);

    const thumbnail = await uploadOnCloudinary(newThumbnailPath);
    if(!thumbnail.url){
        throw new apiError(500, "Something Went Wrong While Uploading The Thumbnail");
    }

    const updatedVideoDetails = await Video.findByIdAndUpdate(
        videoId,
    {
        $set: {
            title: title,
            description: description,
            thumbnail: thumbnail.url
        }
    },
    {
        new: true
    })

    return res
    .status(200)
    .json(new apiResponse(200, updatedVideoDetails, "Video Details Successfully Updated"));
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid Video Id");
    }

    const video = await Video.findById(videoId);

    if(!video.uploader._id.equals(req.user._id)){
        throw new apiError(400, "You are not authorized to delete this video.");
    }

    const videoUrl = video.videoFile;
    const thumbnailUrl = video.thumbnail;

    if(videoUrl){
        await deleteVideoFromCloudinary(videoUrl);
    }

    if(thumbnailUrl){
        await deleteFromCloudinary(thumbnailUrl);
    }

    await Video.findByIdAndDelete(videoId);

    return res
    .status(200)
    .json(new apiResponse(200, "Video Deleted Successfully"));
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid Video Id");
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new apiError(500, "Something Went Wrong on Our Side");
    }

    if(!video.uploader._id.equals(req.user._id)){
        throw new apiError(400, "You Are Not Authorized To Modify The Video Status.");
    }

    const updatedStatus = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished
            }
        },
        {
            new: true
        }
    )

    return res
    .status(200)
    .json(new apiResponse(200, updatedStatus, "Video Toggled Successfully"));
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
