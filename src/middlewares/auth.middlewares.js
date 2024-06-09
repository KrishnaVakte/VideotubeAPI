import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";


const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        console.log(req)
        const token = req.cookies?.accessToken || req.body?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        console.log(token)
        if (!token) {
            throw new ApiError(400,"Unauthorized request")
        }
    
        const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodeToken?._id);
        if (!user) {
            throw new ApiError(400,"Invalid access token")
        }
    
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error.message || "Unauthorized request")
    }

})


export {verifyJWT}