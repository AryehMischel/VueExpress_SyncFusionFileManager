import passport from "passport";
import dotenv from "dotenv";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import mysql from "mysql2/promise";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const connection = await mysql.createConnection({
          host: process.env.RDS_ENDPOINT,
          user: process.env.RDS_USER,
          password: process.env.RDS_PASSWORD,
          database: process.env.RDS_DATABASE,
          port: process.env.RDS_PORT,
        });

        // Query the database to find or create the user
        const [rows] = await connection.execute(
          `SELECT id FROM users WHERE google_id = '${profile.id}'`
        );

        let userId;
        if (rows.length === 0) {
          // Create a new user
          const [result] = await connection.execute(
            `INSERT INTO users (google_id) VALUES ('${profile.id}')`
          );
          userId = result.insertId;
        } else {
          userId = rows[0].id;
        }

        connection.end();

        // Store the internal user ID in the session
        profile.userId = userId;
        return done(null, profile);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

export default passport;