import {Schema, model} from "mongoose";

const videoSchema = new Schema(
    {
        videoFile: {
            type: String, // Cloudinary
            required: true,
        },
        thumbnail: {
            type: String, // Cloudinary
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        duration: {
            type: Number, // Cloudinary
            required: true,
        },
        views: {
            type: Number,
            default: 0,
        },
        isPublished: {
            type: Boolean,
            default: true,
        },
        uploader: {
            type: Schema.Types.ObjectId,
            ref: "User",
        }
    },
    {timestamps: true}
);

const Video = new model("Video", videoSchema);

export default Video;