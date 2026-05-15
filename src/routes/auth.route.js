import {Router} from "express";
import { validateZodSchema } from "../middlewares/validateZodSchema.middleware.js";
import { userLoginSchema } from "../schemas/userLogin.js";
import { loginUser, googleAuthCallback, googleAuthFailed, logoutUser, changePassword } from "../controllers/auth.controller.js";
import passport from "../config/passport.js";
import { getGoogleCallbackURL, getClientUrl } from "../config/appUrls.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { passwordSchema } from "../schemas/password.js";

const authRouter = Router();

// Dev helper: open http://localhost:8000/api/v1/auth/oauth-setup to see URLs for Google Console
authRouter.get("/oauth-setup", (req, res) => {
  const clientUrl = getClientUrl();
  const callbackURL = getGoogleCallbackURL();
  res.json({
    success: true,
    message: "Add these EXACT values in Google Cloud Console → Credentials → your OAuth 2.0 Web client",
    authorizedJavaScriptOrigins: [clientUrl],
    authorizedRedirectURIs: [callbackURL],
    startGoogleLogin: `${req.protocol}://${req.get("host")}/api/v1/auth/google`,
  });
});

authRouter.route('/login').post(validateZodSchema(userLoginSchema), loginUser);

authRouter.route('/change-password').post ( authMiddleware, validateZodSchema( passwordSchema ), changePassword);

authRouter.route('/google').get(passport.authenticate('google', { scope: ['profile', 'email'] }));

authRouter.route('/logout').post( authMiddleware , logoutUser ) 

const clientUrl = getClientUrl();

authRouter.route('/google/callback').get(
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${clientUrl}/auth/google/failed?error=google`,
  }),
  googleAuthCallback
);
  
export {authRouter}


