import {Router} from "express";
import { validateZodSchema } from "../middlewares/validateZodSchema.middleware.js";
import { userLoginSchema } from "../schemas/userLogin.js";
import { loginUser, googleAuthCallback, googleAuthFailed, logoutUser } from "../controllers/auth.controller.js";
import passport from "../config/passport.js";

const authRouter = Router();

authRouter.route('/login').post(validateZodSchema(userLoginSchema), loginUser);

authRouter.route('/google').get(passport.authenticate('google', { scope: ['profile', 'email'] }));

authRouter.route('/logout').post( authRouter , logoutUser ) 

authRouter.route('/google/callback').get(
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google`
  }),
  googleAuthCallback
);
  
export {authRouter}


