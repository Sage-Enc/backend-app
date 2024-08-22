import {v2 as cloudinary} from "cloudinary";
import fs from "fs";
import { apiError } from "./apiError.js";

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath){
            throw new apiError(400, "File Not Found");
        }
        console.log("local file uploaded")
        // Upload File On Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        // File Has Been Uploaded Successfully
        // console.log("File Uplaoded Successfully", response.url);
        fs.unlinkSync(localFilePath);
        return response;
    }catch(err){
        fs.unlinkSync(localFilePath) // Remove the locally stored temporary file as the uplaod operation got failed
        throw new apiError(500, err?.message || "Something went wrong with uploader ")
    }
}

const deleteFromCloudinary = async (fileUrl) => {
    try {
        if(!fileUrl) return null;

        // Get Image Name using Image URL
        const arrayURL = fileUrl.split("/") // Makes the array of the URL. Splitting from "/"
        const imageNameExt = arrayURL.pop() // Gives the last element of the array eg. "sample.jpg"
        const imageName = imageNameExt.split(".")[0];

        // Delete File From Cloudinary using imageName
        const response = await cloudinary.uploader.destroy(imageName, {resource_type: "image"})

        return response;
    } catch (error) {
        return null;
    }
}

const deleteVideoFromCloudinary = async (fileUrl) => {
    try {
        if(!fileUrl) return null;

        // Get Image Name using Image URL
        const arrayURL = fileUrl.split("/") // Makes the array of the URL. Splitting from "/"
        const imageNameExt = arrayURL.pop() // Gives the last element of the array eg. "sample.jpg"
        const imageName = imageNameExt.split(".")[0];

        // Delete File From Cloudinary using imageName
        const response = await cloudinary.uploader.destroy(imageName, {resource_type: "video"})

        return response;
    } catch (error) {
        return null;
    }
}

export {uploadOnCloudinary, deleteFromCloudinary, deleteVideoFromCloudinary};