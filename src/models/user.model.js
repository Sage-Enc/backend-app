import {Schema, model} from "mongoose";

const userSchema = new Schema(
    {
        userName: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        userName: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String, // Cloudinary Used
            required: true,
        },
        coverImg : {
            type: String,
        },
        watchHistory: {
            type: Schema.Types.ObjectId,
            ref: "Video"
        },
        password: {
            type: String,
            required: [true, 'Password is Required'],
        },
        refreshToken: {
            type: String,
        },
        
        
    },
    {timestamps: true}
);

const User = new model("User", userSchema)

export default User;