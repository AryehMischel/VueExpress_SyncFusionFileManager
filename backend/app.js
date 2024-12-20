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

// Create uploads directory if it doesn't exist
createUploadsDir();

// Use routes
app.use("/api/filemanager", fileManagerRoutes);
app.use("/api/folder", folderRoutes);


// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
// // filepath: /c:/xampp/htdocs/projects/2025/test/Test/app.js
// import express from "express";
// import bodyParser from "body-parser";
// import cors from "cors";
// import mysql from "mysql2";
// import multer from "multer";
// import path from "path";
// import fs from "fs";
// import { get } from "http";

// const app = express();
// app.use(cors());
// app.use(bodyParser.json());
// // Database connection
// const db = mysql.createPool({
//   host: process.env.DB_HOST || "localhost",
//   user: process.env.DB_USER || "root",
//   password: process.env.DB_PASS || "root",
//   database: process.env.DB_NAME || "testdb",
// });

// app.get("/api/test-db", (req, res) => {
//   db.query("SELECT 1 + 1 AS solution", (err, results) => {
//     if (err) {
//       console.error("Database connection failed:", err);
//       res.status(500).json({
//         success: false,
//         message: "Database connection failed",
//         error: err,
//       });
//     } else {
//       console.log("Database connection successful:", results);
//       res.json({
//         success: true,
//         message: "Database connection successful",
//         results: results,
//       });
//     }
//   });
// });

// // Multer setup for file uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads/");
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname));
//   },
// });

// const upload = multer({ storage: storage });

// // Create uploads directory if it doesn't exist
// if (!fs.existsSync("uploads")) {
//   fs.mkdirSync("uploads");
// }

// // API Endpoints for File Manager
// app.post("/api/filemanager/upload", upload.single("file"), (req, res) => {
//   console.log("hitting upload endoints");
//   const file = req.file;
//   const folderId = req.body.folderId || null;
//   const sql = "INSERT INTO files (name, path, folder_id) VALUES (?, ?, ?)";
//   db.query(sql, [file.filename, file.path, folderId], (err, result) => {
//     if (err) {
//       console.error(err);
//       res.status(500).send("An error occurred");
//     } else {
//       res.json({ success: true, file: file });
//     }
//   });
// });

// app.post("/api/filemanager/actions", (req, res) => {
//   const { action, path, filterPath, name } = req.body;
//   if(!filterPath){console.log("what the actual fuck ddawg"); filterPath === "/"}
//   console.log("full req body", req.body);
//   switch (action) {
//     case "read":
//       console.log(req.body);
//       getActiveFilesAndFolders(path, filterPath, res);
//       // handleFileManagerActions(path, res);
//       break;
//     case "create":
//       getFolderIdByPath(path, (err, folderId) => {
//         if (err) {
//           console.log("error", err);
//           if (!res.headersSent) {
//             res.status(500).send("An error occurred");
//           }
//         } else {
//           console.log("folder id", folderId);
//           createFolder(name, folderId, res);
//         }
//       });
//       break;
//     case "delete":
//       let filePath = req.body.path;
//       console.log("file path", filePath);
//       let names = req.body.names;
//       let fileIDs = [];

//       if(filePath === "/") {
//         console.log("root shit motherfucker")
//         getIdsByFolder(null, names, (err, fileIDs) => {
//             if (err) {
//               console.log("error", err);
//             } else {
//               console.log("file ids", fileIDs);
//             }
//           });
//       }else{

//       getFolderIdByPath(filePath, (err, folderId) => {
//         if (err) {
//           console.log("error", err);
//         } else {
//           getIdsByFolder(folderId, names, (err, fileIDs) => {
//             if (err) {
//               console.log("error", err);
//             } else {
//                 deleteFilesFromDatabase(fileIDs, (err, result) => {
//                     if (err) {
//                         console.log("error", err);
//                         res.status(500).send("An error occurred");
//                     } else {




//                         return res.json({
//                             cwd: null,           // Current working directory info - null for delete
//                             files: names.map(name => ({    // Array of deleted files/folders
//                               name: name,
//                               size: 0,           // Size of deleted item
//                               dateModified: new Date().toISOString(),
//                               dateCreated: new Date().toISOString(),
//                               hasChild: false,
//                               isFile: true,      // true for files, false for folders
//                               type: ".pdf", // File extension with dot
//                               filterPath: path   // Path where deletion occurred
//                             })),
//                             error: null,         // null means no error
//                             details: null        // Additional details, null for delete operation
//                           });
//                     }
//                 });
       
//             }
//           });
//         }
//       });
//     }

//       break;
//   }
// });

// app.get("/api/filemanager/actions", (req, res) => {
//   console.log("i don't know how any of this fucking works")
// });


// function deleteFilesFromDatabase(fileIds, callback) {
//     if (fileIds.length === 0) {
//         return callback(null, { success: true, message: "No files to delete" });
//     }

//     const placeholders = fileIds.map(() => '?').join(',');
//     const sql = `DELETE FROM files WHERE id IN (${placeholders})`;

//     db.query(sql, fileIds, (err, result) => {
//         if (err) {
//             console.error(err);
//             return callback(err);
//         }
//         if (callback) {
//             callback(null, { success: true, affectedRows: result.affectedRows, files: fileIds });
//         }else{
//             console.log("wtg")
//         }
//     });
// }

// function getIdsByFolder(folderID, names, callback) {
//   const placeholders = names.map(() => "?").join(",");

//   if(folderID === null){
//     console.log("root folder");
//     const sql = `SELECT id FROM files WHERE folder_id is NULL AND name IN (${placeholders})`;
//     db.query(sql, [names], (err, results) => {
//       if (err) {
//         console.error(err);
//         return callback(err);
//       }
//       if (results.length === 0) {
//         return callback(new Error("Files not found"));
//       }
//       const IDs = results.map((result) => result.id);
//       console.log("ids", IDs);
//       callback(null, IDs);
//     });


//   }else{
//     const sql = `SELECT id FROM files WHERE folder_id = ? AND name IN (${placeholders})`;
//     db.query(sql, [folderID, ...names], (err, results) => {
//       if (err) {
//         console.error(err);
//         return callback(err);
//       }
//       if (results.length === 0) {
//         return callback(new Error("Files not found"));
//       }
//       const IDs = results.map((result) => result.id);
//       console.log("ids", IDs);
//       callback(null, IDs);
//     });

//   }

// }

// function getIdByFolder(folderID, name, callback) {
//   const sql = "SELECT id FROM files WHERE folder_id = ? AND name = ?";
//   db.query(sql, [folderID, name], (err, results) => {
//     if (err) {
//       console.error(err);
//       return callback(err);
//     }
//     if (results.length === 0) {
//       return callback(new Error("File not found"));
//     }
//     const fileID = results[0].id;
//     callback(null, fileID);
//   });
// }

// function createFolder(name, parentId, res) {
//   const sql = "INSERT INTO folders (name, parent_id) VALUES (?, ?)";
//   db.query(sql, [name, parentId], (err, result) => {
//     if (err) {
//       console.error(err);
//       if (!res.headersSent) {
//         res.status(500).send("An error occurred");
//       }
//     } else {
//       const newFolderId = result.insertId;
//       if (!res.headersSent) {
//         res.json({ success: true, id: newFolderId, name, parentId });
//       }
//     }
//   });
// }



// // Server
// const PORT = 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });

// // Function to get folder ID based on path
// const getFolderIdByPath = (path, callback) => {
//   if (path === "/") {
//     return callback(null, null); // Root folder
//   }
//   console.log("handling non root directory");
//   ``;
//   const pathSegments = path.split("/").filter((segment) => segment);
//   let currentParentId = null;

//   const getNextFolderId = (index) => {
//     if (index >= pathSegments.length) {
//       return callback(null, currentParentId);
//     }
//     const segment = pathSegments[index];
//     let sql;
//     let params;
//     if (currentParentId === null) {
//       sql = "SELECT id FROM folders WHERE name = ? AND parent_id IS NULL";
//       params = [segment];
//     } else {
//       sql = "SELECT id FROM folders WHERE name = ? AND parent_id = ?";
//       params = [segment, currentParentId];
//     }
//     db.query(sql, params, (err, results) => {
//       if (err) {
//         return callback(err);
//       }
//       if (results.length === 0) {
//         return callback(new Error("Folder not found"));
//       }
//       currentParentId = results[0].id;
//       getNextFolderId(index + 1);
//     });
//   };

//   getNextFolderId(0);
// };



// // Function to handle file manager actions
// function getActiveFilesAndFolders(path, filterPath, res){
//  // Log the path

//   if (path === "/") {

//     // Handle root directory
//     const sqlFiles = "SELECT * FROM files WHERE folder_id IS NULL";
//     const sqlFolders = "SELECT * FROM folders WHERE parent_id IS NULL";

//     db.query(sqlFiles, (err, fileResults) => {
//       if (err) {
//         console.error("Error querying files:", err);
//         return res.status(500).send("An error occurred");
//       }

//       db.query(sqlFolders, (err, folderResults) => {
//         if (err) {
//           console.error("Error querying folders:", err);
//           return res.status(500).send("An error occurred");
//         }

//         const files = fileResults.map((file) => ({
//           name: file.name,
//           size: 0, // You can update this to the actual file size if available
//           dateModified: new Date().toISOString(),
//           type: "file",
//           isFile: true,
//           hasChild: false,
//           filterPath: "/",
//         }));

//         const folders = folderResults.map((folder) => ({
//           name: folder.name,
//           size: 0,
//           dateModified: new Date().toISOString(),
//           type: "directory",
//           isFile: false,
//           hasChild: true,
//           filterPath: "/",
//         }));

//         res.json({
//           cwd: {
//             name: "Root",
//             size: 0,
//             dateModified: new Date().toISOString(),
//             type: "directory",
//             isFile: false,
//             hasChild: files.length > 0 || folders.length > 0,
//             filterPath: "/",
//           },
//           files: [...folders, ...files],
//         });
//       });
//     });
//   } else {
//     // Handle non-root directories
//     getFolderIdByPath(path, (err, folderId) => {
//       if (err) {
//         console.error("Error getting folder ID by path:", err);
//         return res.status(500).send("An error occurred");
//       }

//       const sqlFiles = "SELECT * FROM files WHERE folder_id = ?";
//       const sqlFolders = "SELECT * FROM folders WHERE parent_id = ?";

//       db.query(sqlFiles, [folderId], (err, fileResults) => {
//         if (err) {
//           console.error("Error querying files:", err);
//           return res.status(500).send("An error occurred");
//         }

//         db.query(sqlFolders, [folderId], (err, folderResults) => {
//           if (err) {
//             console.error("Error querying folders:", err);
//             return res.status(500).send("An error occurred");
//           }

//           const files = fileResults.map((file) => ({
//             name: file.name,
//             size: 0, // You can update this to the actual file size if available
//             dateModified: new Date().toISOString(),
//             type: "file",
//             isFile: true,
//             hasChild: false,
//             filterPath: filterPath ,
//           }));

//           const folders = folderResults.map((folder) => ({
//             name: folder.name,
//             size: 0,
//             dateModified: new Date().toISOString(),
//             type: "directory",
//             isFile: false,
//             hasChild: true,
//             filterPath: filterPath,
//           }));

//           res.json({
//             cwd: {
//               name: path
//                 .split("/")
//                 .filter((segment) => segment)
//                 .pop(),
//               size: 0,
//               dateModified: new Date().toISOString(),
//               type: "directory",
//               isFile: false,
//               hasChild: files.length > 0 || folders.length > 0,
//               filterPath: filterPath,
//             },
//             files: [...folders, ...files],
//           });
//         });
//       });
//     });
    
//   }
// };
