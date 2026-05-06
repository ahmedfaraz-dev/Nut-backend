import dotenv from 'dotenv';
dotenv.config();

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.models.js';

console.log('Environment variables check:');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Found' : 'Not found');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Found' : 'Not found');
console.log('CALLBACK_URL:', process.env.CALLBACK_URL);

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL || "/api/v1/auth/google/callback",
    scope: ['profile', 'email']
},
async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({
            $or: [
                { googleId: profile.id },
                { email: profile.emails[0].value }
            ]
        });
        
        if (user) {
            if(!user.googleId){
                user.googleId = profile.id;
                user.isVerified = true;
                user.provider = 'google';
                await user.save();
            }
            return done(null, user);
        } else {
            const userFullName = profile.name.givenName + ' ' + profile.name.familyName;
            const user = await User.create({
                googleId: profile.id,
                isVerified: true,
                provider: 'google',
                name: userFullName,
                email: profile.emails[0].value
            })
            return done(null, user);
        }
    } catch (error) {
        return done(error, null);
    }
}));


export default passport;
