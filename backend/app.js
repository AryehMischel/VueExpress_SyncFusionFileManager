import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { createUploadsDir } from "./utils/fileUtils.js";
import { connectToDatabase } from "./services/dbService.js";
import fileManagerRoutes from "./routes/fileManagerRoutes.js";
import folderRoutes from "./routes/folderRoutes.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Connect to the database
connectToDatabase();

// // Create uploads directory if it doesn't exist
// createUploadsDir();

// Use routes
app.use("/api/filemanager", fileManagerRoutes);
app.use("/api/folder", folderRoutes);


// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});