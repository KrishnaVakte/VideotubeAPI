import mongoose from "mongoose";
 
const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    videoTitle: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    channelAvatar: {
        type: String,
        required: true
    },
    channelname: {
        required: true,
        type:String
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 * 3, //document automaticaly deleted after 3 days
    },
})

export const Notification = mongoose.model("Notification", notificationSchema)