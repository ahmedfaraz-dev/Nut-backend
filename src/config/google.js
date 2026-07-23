import { OAuth2Client } from 'google-auth-library';
import { getGoogleCallbackURL } from './appUrls.js';

const createOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callback = getGoogleCallbackURL();

  // small runtime debug to help with missing env issues
  // remove or reduce logging in production if desired
  if (!clientId) console.warn('Warning: GOOGLE_CLIENT_ID is not set at runtime');

  return new OAuth2Client(clientId, clientSecret, callback);
};

/**
 * Returns the Google OAuth2 redirect URL.
 * The user is sent here to grant permission.
 */
export const getGoogleAuthUrl = () => {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    prompt: 'select_account',
  });
};

/**
 * Exchanges the authorization code for tokens,
 * then fetches the user's Google profile via tokeninfo / userinfo.
 */
export const getGoogleUserInfo = async (code) => {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // Fetch profile from Google's userinfo endpoint
  const res = await client.request({
    url: 'https://www.googleapis.com/oauth2/v3/userinfo',
  });

  return res.data; // { sub, name, given_name, family_name, email, picture, email_verified }
};
