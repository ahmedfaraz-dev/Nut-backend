import AsyncHandler from "../handlers/AsyncHandler.js";
import CustomError from "../handlers/CustomError.js";
import User from "../models/user.models.js";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken.js";




const loginUser = AsyncHandler(async (req, res, next) => {

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    // console.log(user);

    if (!user) {
        return next(new CustomError(404, "user not found with this email"));
    }
    if (!user.isVerified) {
        return next(new CustomError(403, "Account not verified. Please verify your email."))
    }

    const isPasswordMatched = await user.comparePassword(password);

    if (!isPasswordMatched) {
        return next(new CustomError(401, "invalid credentials"));
    }
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken.push({ token: refreshToken })
    const updatedUser = await user.save();
    if (!updatedUser) {
        return next(new CustomError(500, "error while saving refresh token"));
    };

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        maxAge: 15 * 24 * 60 * 60 * 1000 // 15 days
    }).status(200).json({
        success: true,
        message: "User logged in successfully",
        accessToken,
        data: user
    })

});

const googleAuthCallback = AsyncHandler(async (req, res, next) => {
    const user = req.user;

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken.push({ token: refreshToken });
    const updatedUser = await user.save();

    if (!updatedUser) {
        return next(new CustomError(500, "Error saving refresh token"));
    }

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 24 * 60 * 60 * 1000
    });

    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
    });


    return res.redirect(
        `${process.env.CLIENT_URL}/auth/google/callback`

    );
});

const logoutUser = AsyncHandler(async (req, res, next) => {
    
    const user = req.user;

    user.refreshToken =[];
  
    await user.save({ validateBeforeSave: false });
    
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
    });

    return res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });

});

const googleAuthFailed = AsyncHandler(async (req, res) => {
    res.status(401).json({
        success: false,
        message: "Google authentication failed"
    });
});

export { loginUser, googleAuthCallback, googleAuthFailed, logoutUser };