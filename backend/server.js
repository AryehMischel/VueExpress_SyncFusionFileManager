import express from "express";
import passport from "passport";
import session from "express-session";
import bodyParser from "body-parser";
import path from "path";

import dotenv from "dotenv";
dotenv.config();
import "./config/passport-config.js";
import cors from "cors";
import connectSessionSequelize from "connect-session-sequelize";
const SequelizeStore = connectSessionSequelize(session.Store);
import { createUploadsDir } from "./utils/fileUtils.js";
import { connectToDatabase, connectToDatabase2 } from "./services/dbService.js";

// Routes
import fileManagerRoutes from "./routes/fileManagerRoutes.js";
import indexRoutes from "./routes/index.js";
import authRoutes from "./routes/auth.js";
import s3Routes from "./routes/s3Routes.js";



import sequelize from "./config/db.js";
const app = express();

// Construct __dirname in ES module
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



const sessionStore = new SequelizeStore({
  db: sequelize,
});

app.use(
  session({
    secret: "your_secret_key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
  })
);


// Sync the session store
sessionStore.sync();

// Reset the session store
// sessionStore.sync({ force: true }).then(() => {
//   console.log('Session store reset');
// });

app.use(passport.initialize());
app.use(passport.session());

app.use(cors());
app.use(bodyParser.json());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "public/dist")));

// Connect to the database
connectToDatabase();
connectToDatabase2();

// // Create uploads directory if it doesn't exist
// createUploadsDir();

// Use routes
app.use("/api/filemanager", fileManagerRoutes);
app.use('/auth', authRoutes); 
app.use("/api/s3", s3Routes); 
app.use("/", indexRoutes);

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});