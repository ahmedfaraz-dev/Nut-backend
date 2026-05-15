import dotenv from 'dotenv';
dotenv.config();

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.models.js';

import { getGoogleCallbackURL } from './appUrls.js';

const googleCallbackURL = getGoogleCallbackURL();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: googleCallbackURL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({
          $or: [
            { googleId: profile.id },
            { email: profile.emails?.[0]?.value },
          ],
        });

        if (user) {
          if (!user.googleId) {
            user.googleId = profile.id;
            user.isVerified = true;
            user.provider = 'google';
            await user.save();
          }
          return done(null, user);
        }

        let name;
        if (profile.name) {
          name = `${profile.name.givenName || ''} ${profile.name.familyName || ''}`.trim();
        } else {
          name = profile.displayName || 'No Name';
        }
        const newUser = await User.create({
          googleId: profile.id,
          name: name,
          email: profile.emails?.[0]?.value,
          provider: 'google',
          isVerified: true,
        });

        return done(null, newUser);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

export { getGoogleCallbackURL };
export default passport;