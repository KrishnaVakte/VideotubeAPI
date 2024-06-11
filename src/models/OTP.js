import mongoose from 'mongoose';
import mailSender from '../utils/mailSender.js'
import emailTemplate from '../mailTemplate/emailVerificationTemplate.js';

const OTPSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 5, //document automaticaly deleted after 5 minutes
    },
});

async function sendVerificationEmail(email, otp) {
    try {
        const mailResponse = await mailSender(
            email,
            "Verification email by VIDEOTUBE",
            emailTemplate(otp),
        );
        console.log("Email send succesfully", mailResponse);
    } catch (error) {
        console.log("Error while send mail", error);
        throw error;
    }
}

OTPSchema.pre("save", async function (next) {

    //only send mail when new document is created
    if (this.isNew) {
        await sendVerificationEmail(this.email, this.otp);
    }
    next();
})

 export const OTP = mongoose.model('OTP', OTPSchema);