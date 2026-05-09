import {Router} from "express";
import { validateZodSchema } from "../middlewares/validateZodSchema.middleware.js";
import { userLoginSchema } from "../schemas/userLogin.js";
import { loginUser, googleAuthCallback, googleAuthFailed, logoutUser, changePassword } from "../controllers/auth.controller.js";
import passport from "../config/passport.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { passwordSchema } from "../schemas/password.js";

const authRouter = Router();

authRouter.route('/login').post(validateZodSchema(userLoginSchema), loginUser);

authRouter.route('/change-password').post ( authMiddleware, validateZodSchema( passwordSchema ), changePassword);

authRouter.route('/google').get(passport.authenticate('google', { scope: ['profile', 'email'] }));

authRouter.route('/logout').post( authMiddleware , logoutUser ) 

authRouter.route('/google/callback').get(
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google`
  }),
  googleAuthCallback
);
  
export {authRouter}


