/**
 * Deployment URLs — override with env vars on Railway/Vercel.
 */
const PRODUCTION = {
  clientUrl: "https://nuts-frontend-tau.vercel.app",
  apiBase: "https://nut-backend-production-73f0.up.railway.app/api/v1",
  googleCallback: "https://nut-backend-production-73f0.up.railway.app/api/v1/auth/google/callback",
};

const LOCAL = {
  clientUrl: "http://localhost:5173",
  apiBase: "http://localhost:8000/api/v1",
  googleCallback: "http://localhost:8000/api/v1/auth/google/callback",
};

const isProduction = process.env.NODE_ENV === "production";

export const getClientUrl = () => {
  const url = process.env.CLIENT_URL || (isProduction ? PRODUCTION.clientUrl : LOCAL.clientUrl);
  return url.replace(/\/$/, "");
};

export const getGoogleCallbackURL = () => {
  const url =
    process.env.GOOGLE_CALLBACK_URL ||
    process.env.CALLBACK_URL ||
    (isProduction ? PRODUCTION.googleCallback : LOCAL.googleCallback);
  return url.trim().replace(/\/$/, "");
};

export { PRODUCTION, LOCAL, isProduction };
