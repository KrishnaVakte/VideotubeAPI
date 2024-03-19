import { v2 as cloudinary } from "cloudinary";
import fs from "fs"
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_SECRET_KEY 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) { return null }
         //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        })
        console.log("file has been uploaded successfully ",response.url);
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath)
        console.log("Error during uploading file : ",error.message)
    }
}

const deleteFromCloudinary = async (cloudinaryUrl,resource_type='image') => {
    try {
        if (!cloudinaryUrl) { return null }
        const publicID = cloudinaryUrl.split('/').pop().split('.')[0];
        
        await cloudinary.uploader.destroy(publicID, {
            resource_type: `${resource_type}`
        })
        console.log("File has been deleted from cloudinary successfully.")
    } catch (error) {
        console.log("Error while deleting file :",error.message)
    }

}


export {
    uploadOnCloudinary,
    deleteFromCloudinary
}