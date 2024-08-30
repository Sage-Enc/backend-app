import mongoose, {isValidObjectId} from "mongoose"
import Playlist from "../models/playlist.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    //TODO: create playlist
    if(!(name && description)){
        throw new apiError(400, "Name and Description Both Are Required.")
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    })

    if(!playlist){
        throw new apiError(400, "Something Went Wrong While Creating The Playlist. Try Again.")
    }

    return res
    .status(200)
    .json(new apiResponse(200, playlist, "Playlist Created Successfully."));
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params;
    //TODO: get user playlists
    if(!isValidObjectId(userId)){
        throw new apiError(400, "Invalid User Id.");
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                updatedAt: 1
            }
        }
    ])

    if(!playlists){
        throw new apiError(400, "Failed To Fetch Playlists.");
    }

    return res
    .status(200)
    .json(new apiResponse(200, playlists, "Playlists Fetched Successfully"));
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if(!isValidObjectId(playlistId)){
        throw new apiError(400, "Invalid Playlist Id");
    }

    const playlistVideos = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $match: {
                "videos.isPublished": true
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
            $addFields: {
                $totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                },
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: {
                    _id: 1,
                    title: 1,
                    description:1,
                    thumbnail: 1,
                    videoFile: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1
                },
                owner: {
                    userName: 1,
                    fullName: 1,
                    avatar: 1
                }
            }
        }
    ])

    if(!playlistVideos){
        throw new apiError(400, "Failed To Fetch Playlist. Try Again.");
    }

    return res
    .status(200)
    .json(new apiResponse(200, playlistVideos, "Playlist Fetched Successfully."));
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new apiError(400, "Invalid Playlist Id or Video Id.");
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist){
        throw new apiError(400, "Playlist Does Not Exist.");
    }

    const video = await Playlist.findById(videoId);

    if(!video){
        throw new apiError(400, "Video Does Not Exist.");
    }

    if(!playlist.owner.equals(req.user?._id)){
        throw new apiError(400, "You Are Not Authorized To Add Videos To This Playlist.");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: {
                videos: videoId,
            }
        },
        {
            new: true
        }
    )

    if(!updatedPlaylist){
        throw new apiError(400, "Failed To Update Playlist. Try Again.")
    }

    return res
    .status(200)
    .json(new apiResponse(400, "Playlist Updated Successfully."));
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new apiError(400, "Invalid Playlist Id or Video Id.");
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist){
        throw new apiError(400, "Playlist Does Not Exist.");
    }

    const video = await Playlist.findById(videoId);

    if(!video){
        throw new apiError(400, "Video Does Not Exist.");
    }

    if(!playlist.owner.equals(req.user?._id)){
        throw new apiError(400, "You Are Not Authorized To Remove Videos From This Playlist.");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: videoId,
            }
        },
        {
            new: true
        }
    )

    if(!updatedPlaylist){
        throw new apiError(400, "Failed To Update Playlist. Try Again.")
    }

    return res
    .status(200)
    .json(new apiResponse(400, "Playlist Updated Successfully."));
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist

    if(!isValidObjectId(playlistId)){
        throw new apiError(400, "Invalid Playlist Id");
    }

    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new apiError(400, "Failed To Fetch Playlist.");
    }

    if(!playlist.owner.equals(req.user?._id)){
        throw new apiError(400, "You Are Not Authorized To Delete This Playlist.");
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

    if(!deletedPlaylist){
        throw new apiError(400, "Failed To Delete Playlist. Try Again.");
    }

    return res
    .status(200)
    .json(new apiResponse(200, deletedPlaylist, "Playlist Deleted Successfully."));
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if(!isValidObjectId(playlistId)){
        throw new apiError(400, "Invalid Playlist Id.");
    }

    if(!(name && description)){
        throw new apiError(400, "Both Name and Description are Required.");
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist){
        throw new apiError(400, "Failed To Fetch Playlist");
    }

    if(!playlist.owner.equals(req.user?._id)){
        throw new apiError(400, "You Are Not Authorized To Update This Playlist.");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name,
                description
            }
        },
        {
            new: true
        }
    )

    if(!updatedPlaylist){
        throw new apiError(400, "Failed To Update Playlist.");
    }

    return res
    .status(200)
    .json(new apiResponse(200, updatedPlaylist, "Playlist Updated Successfully."));
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
