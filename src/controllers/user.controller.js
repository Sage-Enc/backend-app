import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import fs from "fs";
import jwt from "jsonwebtoken";

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

    console.log(userName, email, password)

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
    console.log(user)    
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
        
    }
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshingRToken
 };