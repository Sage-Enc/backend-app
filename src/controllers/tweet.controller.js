import mongoose, { isValidObjectId } from "mongoose"
import Tweet from "../models/tweet.model.js"
import User from "../models/user.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import Like from "../models/like.model.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body;
    const owner = req.user?._id;

    if(!content){
        throw new apiError(400, "Content is Required To Post Tweet.");
    }
    if(!owner){
        throw new apiError(400, "You are not authorized to Post Tweet.")
    }

    const tweet = await Tweet.create({
        content,
        owner
    })

    if(!tweet){
        throw new apiError(400, "Something Went Wrong While Posting The Tweet Try Again.")
    }

    return res
    .status(200)
    .json(new apiResponse(200, tweet, "Tweet Successfully Posted."));
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params;

    if(!isValidObjectId(userId)){
        throw new apiError(400, "Invalid User Id")
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
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
                            userName: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes",
                pipeline: [
                    {
                        $project: {
                            likedBy: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                totalLikes: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        $if: {
                            $in: [new mongoose.Types.ObjectId(userId), "$likes.likedBy"]
                        },
                        $then: true,
                        $else: false
                    }
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
                content:1,
                owner: 1,
                totalLikes: 1,
                createdAt: 1,
                isLiked: 1
            }
        }
    ])

    if(!tweets){
        throw new apiError(400, "Failed To Fetch Tweets. Try Again");
    }

    return res
    .status(200)
    .json(new apiResponse(200, tweets, "Tweets Fetched Successfully."));
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params;
    const {content} = req.body;

    if(!isValidObjectId(tweetId)){
        throw new apiError(400, "Invalid Tweet Id.");
    }

    const tweet = await Tweet.findById(tweetId);

    if(!tweet){
        throw new apiError(400, "Tweet Not Found.");
    }

    if(!tweet.owner.equals(req.user?._id)){
        throw new apiError(400, "You Are Not Authorized To Delete This Tweet.");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content: content
            }
        },
        {
            new: true
        }
    )

    if(!updatedTweet){
        throw new apiError(400, "Something Went Wrong While Updating The Tweet. Try Again.");
    }

    return res
    .status(200)
    .json(new apiResponse(200, updatedTweet, "Tweet Deleted Successfully"));
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params;

    if(!isValidObjectId(tweetId)){
        throw new apiError(400, "Invalid Tweet Id.");
    }

    const tweet = await Tweet.findById(tweetId);

    if(!tweet){
        throw new apiError(400, "Tweet Not Found.");
    }

    if(!tweet.owner.equals(req.user?._id)){
        throw new apiError(400, "You Are Not Authorized To Delete This Tweet.");
    }

    const tweetLikesDeleted = await Like.find({"tweet": tweetId});

    if(tweetLikesDeleted.length>0){
        const deleteId = tweetLikesDeleted.map(like=> like._id);

        const likesDeleted = await Like.deleteMany({_id: {$in: deleteId}});
        if(!likesDeleted){
            throw new apiError(400, "Couldn't Delete Tweet likes.");
        }
    }
    
    const tweetDeleted = await Tweet.findByIdAndDelete(tweetId);
    if(!tweetDeleted){
        throw new apiError(400, "Something Went Wrong While Deleting The Tweet. Try Again.");
    }

    return res
    .status(200)
    .json(new apiResponse(200, "Tweet Deleted Successfully."))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
