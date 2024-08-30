import mongoose, { isValidObjectId } from "mongoose"
import Comment from "../models/comment.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid Video Id.");
    }

    const comments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likedBy"
            }
        },
        {
            $addFields: {
                totalLikes: {
                    $size: "$likedBy"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        $if: {
                            $in: [new mongoose.Types.ObjectId(req.user?._id), "$likedBy.likedBy"]
                        },
                        $then: true,
                        $else: false
                    }
                }
            }
        },
        {
            $sort: {
                $createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                totalLikes: 1,
                owner: {
                    userName: 1,
                    fullName: 1,
                    avatar: 1
                },
                isLiked: 1
            }
        }
    ])

    if(!comments){
        throw new apiError(400, "Failed To Fetch All Comments.")
    }

    return res
    .status(200)
    .json(new apiResponse(200, comments, "All Comments Fetched Successfully."));
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params;
    const {content} = req.body;

    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid Video Id")
    }

    if(!content){
        throw new apiError(400, "Content Required To Comment on The Video");
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id
    })

    if(!comment){
        throw new apiError(400, "Failed To Comment on The Video.");
    }

    return res
    .status(200)
    .json(new apiResponse(200, comment, "Comment Successful"));

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params;
    const {content} = req.body;

    if(!isValidObjectId(commentId)){
        throw new apiError(400, "Invalid Comment Id");
    }

    const comment = await Comment.findById(commentId);
    if(!comment){
        throw new apiError(400, "Failed To Fetch Comment. Try Again.")
    }

    if(!comment.owner.equals(req.user?._id)){
        throw new apiError(400, "You Are Not Authorized To Modify This Comment.")
    }

    const updatedComment = await Comment(
        commentId,
        {
            $set: {
                content: content
            }
        },
        {
            new: true
        }
    )

    if(!updatedComment){
        throw new apiError(400, "Failed To Modify Comment. Try Again.");
    }

    return res
    .status(200)
    .json(new apiResponse(200, updatedComment, "Modified The Comment Successfully."));
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params;
    
    if(!isValidObjectId(commentId)){
        throw new apiError(400, "Invalid Comment Id");
    }

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new apiError(400, "Failed To Fetch The Comment Data.");
    }

    if(!comment.owner.equals(req.user._id)){
        throw new apiError(400, "You Are Not Authorized To Delete This Comment.");
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if(!deletedComment){
        throw new apiError(400, "Failed To Delete The Comment. Try Again.");
    }

    return res
    .status(200)
    .json(new apiResponse(200, deletedComment, "Comment Deleted Successfully."))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
