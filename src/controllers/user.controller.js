import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import fs from "fs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) =>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save( {validateBeforeSave: false} )

        return {accessToken, refreshToken};

    } catch (error) {
        throw new apiError(500, "Something went wrong while generating access and refresh token")
    }
}

const options = {
    httpOnly: true,
    secure: true
}

const registerUser = asyncHandler( async (req,res)=>{
    // Get data from request
    const {userName, email, fullName, password} = req.body;
    
    // Data validation and verification
    if([userName, email, fullName, password].some( (field)=> field?.trim()==="")){
        throw new apiError( 400,"All Fields Are Required");
    }

    // Check for Images and Avatar
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if(!avatarLocalPath){
        throw new apiError(400, "Avatar is Required");
    }

    // Check if the user exists already in the database
    const existedUser = await User.findOne({
        $or: [{userName}, {email}]
    })

    if(existedUser){
        if(avatarLocalPath) fs.unlinkSync(avatarLocalPath);
        if(coverImageLocalPath) fs.unlinkSync(coverImageLocalPath);
        throw new apiError(409, "User Already Exist");
    }

    // Upload them on the Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    
    if(!avatar){
        throw new apiError(400, "Avatar is Required");
    }

    // Create user object. create entry in db
    const user = await User.create({
        fullName,
        email,
        userName: userName.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    // check for user creation
    if(!createdUser){
        throw new apiError(500, "Something Went Wrong While Registering The User");
    }

    // return response
    return res.status(201).json(
        new apiResponse(200, createdUser, "User Created Successfully")
    )
});

const loginUser = asyncHandler( async (req,res)=>{
    
    // Get Login Data From The Client
    const { userName, email, password } = req.body;

    // Validate userName or email
    if( !userName && !email){
        throw new apiError(400, "Username or Email Required.");
    }

    // Get user from the database and store it in a variable
    const user = await User.findOne({
        $or: [{userName}, {email}]
    })


    if( !user ){
        throw new apiError(404, "Username or Email Not Found.");
    };

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new apiError(401, "Invalid Credentials");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new apiResponse(200, {user: loggedInUser, accessToken, refreshToken}, "User Logged In Successfully"))
});


const logoutUser = asyncHandler(async (req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User Logged Out"))
})

const refreshingRToken = asyncHandler( async(req, res)=>{
    try {
        const incomingRefreshToken = req.cookies.refreshToken;
    
        if(!incomingRefreshToken){
            throw new apiError(401, "Unauthorized Request");
        }

        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id);

        if(!user){
            throw new apiError(401, "Invalid Refresh Token");
        }

        if(incomingRefreshToken !== user.refreshToken){
            throw new apiError(401, "Refresh Token is Expired or used");
        }

        const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new apiResponse(200, {accessToken, refreshToken}, "Access Token Refreshed"))
    } catch (error) {
        throw new apiError(500, error?.message || "Something Went Wrong While Refreshing Token");
    }
})

const changeCurrentPassword = asyncHandler( async (req, res) =>{
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordValid){
        throw new apiError(401, "Invalid Old Password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new apiResponse(200, {}, "Password is Updated Successfully"));
})

const getCurrentUser = asyncHandler( async (req, res) => {
    return res
    .status(200)
    .json(new apiResponse(200, req.user, "Current User Fetched Successfully"));
})

const updateAccountDetails = asyncHandler( async (req, res) => {
    const { fullName, email } = req.body;

    if(!fullName && !email){
        throw new apiError(400, "No Full Name or Email found");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new apiResponse(200, user, "Account Details Updated Successfully"));
})

const updateAvatar = asyncHandler( async (req,res)=>{
    // Get Current User's Current Avatar
    let userCurrentAvatar = req.user?.avatar;

    // Get User's New Selected Avatar
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new apiError(400, "Avatar File is Missing");
    }

    // Upload User's New Selected Avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new apiError(400, "Error While Uploading The Avatar");
    }

    // Delete Previous Avatar From The Cloudinary
    if(userCurrentAvatar){
        await deleteFromCloudinary(userCurrentAvatar);
    }

    // Get and Update User in Database
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
    .status(200)
    .json(new apiResponse(200, user, "Avatar Updated Successfully"));
})

const updateCoverImage = asyncHandler( async (req,res)=>{
    // Get Current User's Current Cover Image
    let userCurrentCoverImage = req.user?.coverImage;
    
    // Get User's New Selected Cover Image
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
        throw new apiError(400, "Cover Image File is Missing");
    }

    // Upload User's New Selected Cover Image
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new apiError(400, "Error While Uploading The Cover Image");
    }

    // Delete Previous Avatar From The Cloudinary
    if(userCurrentCoverImage){
        await deleteFromCloudinary(userCurrentCoverImage);
    }

    // Get and Update User in Database
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
    .status(200)
    .json(new apiResponse(200, user, "Cover Image Updated Successfully"));
})

const getUserChannelProfile = asyncHandler( async (req,res) => {
    const {username} = req.params;

    if(!username?.trim()){
        throw new apiError(400, "Username is Missing");
    }

    const channels = await User.aggregate([
        {
            $match: username?.toLowerCase()
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
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
                    $size: "subscribers"
                },
                channelSubscribedToCount: {
                    $size: "subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        $if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        $then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                userName: 1,
                fullName: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                // subscribers: 1,
                // subscribedTo: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1
            }
        }
    ])

    if(!channels?.length){
        throw new apiError(400, "Channel Not Found");
    }

    return res
    .status(200)
    .json(new apiResponse(200, channels, "User Channel Data Fetched Successfully"));
})

const getWatchHistory = asyncHandler( async (req, res)=>{
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
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
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new apiResponse(200, user[0].watchHistory, "Watch History Fetched"));
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshingRToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getWatchHistory
 };