import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiErros.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import fs from "fs";

const registerUser = asyncHandler( async (req,res)=>{
    // Get data from request
    const {userName, email, fullName, password} = req.body;
    
    // Data validation and verification
    if([userName, email, fullName, password].some( (field)=> field?.trim()==="")){
        throw new apiError( 400,"All Fields Are Required");
    }

    // Check for Images and Avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
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

export { registerUser };