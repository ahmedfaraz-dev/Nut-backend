import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { connectDB } from "./src/config/connectDB.config.js";
import { getGoogleCallbackURL, getClientUrl } from "./src/config/appUrls.js";

const PORT = process.env.PORT || 4000;




//  server gracefullt shutdown 
//   unhadnled promise  exception handle 

connectDB()
    .then(()=>{
        app.listen(PORT, () => {
            const clientUrl = getClientUrl();
            const callbackURL = getGoogleCallbackURL();
            console.log(`Server is running on port ${PORT}`);
            console.log("\n--- Google OAuth (local) ---");
            console.log(`Add to Google Console → Authorized redirect URIs:\n  ${callbackURL}`);
            console.log(`Add to Google Console → Authorized JavaScript origins:\n  ${clientUrl}`);
            console.log(`Verify setup: http://localhost:${PORT}/api/v1/auth/oauth-setup\n`);
        });
    }).catch((err)=>{
        console.error(`Failed to connect to the database: ${err?.message || err}`);
    })

