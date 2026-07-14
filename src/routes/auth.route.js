import { Router } from "express";
import { validateZodSchema } from "../middlewares/validateZodSchema.middleware.js";
import { userLoginSchema } from "../schemas/userLogin.js";
import {
  loginUser,
  googleAuthFailed,
  logoutUser,
  changePassword,
  googleRedirect,
  googleCallback,
} from "../controllers/auth.controller.js";
import { getGoogleCallbackURL, getClientUrl } from "../config/appUrls.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { passwordSchema } from "../schemas/password.js";

const authRouter = Router();

// Dev helper: GET /api/v1/auth/oauth-setup
authRouter.get("/oauth-setup", (req, res) => {
  const clientUrl = getClientUrl();
  const callbackURL = getGoogleCallbackURL();
  res.json({
    success: true,
    message:
      "Add these EXACT values in Google Cloud Console → Credentials → your OAuth 2.0 Web client",
    authorizedJavaScriptOrigins: [clientUrl],
    authorizedRedirectURIs: [callbackURL],
    startGoogleLogin: `${req.protocol}://${req.get("host")}/api/v1/auth/google`,
  });
});

// Standard login
authRouter.route("/login").post(validateZodSchema(userLoginSchema), loginUser);

// Change password (authenticated)
authRouter
  .route("/change-password")
  .post(authMiddleware, validateZodSchema(passwordSchema), changePassword);

// ─── Google OAuth (google-auth-library) ───────────────────────────────────────

// Step 1: redirect to Google's consent screen
authRouter.get("/google", googleRedirect);

// Step 2: Google redirects back with ?code=...
authRouter.get("/google/callback", googleCallback);

// Logout
authRouter.route("/logout").post(authMiddleware, logoutUser);

export { authRouter };
