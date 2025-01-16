import db from "./dbService.js";
import { generateUploadURL } from "./s3Service.js";

export const getActiveFilesAndFolders = async (
  userId,
  path,
  filterPath,
  textureFormat,
  res
) => {




  if (path === "/") {

    let sqlFiles;
    if(textureFormat === "astc_4x4") {
       sqlFiles = `CALL GetImageGroupsWithASTC(${null}, ${userId})`;
    }else{
      sqlFiles = `CALL GetImageGroupsWithFaces(${null}, ${userId})`;
    }
    const sqlFolders = `SELECT * FROM folders WHERE parent_id IS NULL and user_id = ${userId}`;

    db.query(sqlFiles, (err, fileResults) => {
      if (err) {
        console.error("Error querying files:", err);
        return res.status(500).send("An error occurred");
      }

      db.query(sqlFolders, (err, folderResults) => {
        if (err) {
          console.error("Error querying folders:", err);
          return res.status(500).send("An error occurred");
        }


        const filesArray = fileResults[0]; // Access the first element of fileResults
        // console.log("filesArray", filesArray);

        const files = filesArray.map((file) => ({
          name: file.name,
          size: 0,
          dateModified: new Date().toISOString(),
          type: "file",
          isFile: true,
          format_360: file.image_format,
          textureFormat: textureFormat,
          hasChild: false,
          filterPath: "/",
          processed: file.processed,
          faces: file.images,
          groupId: file.group_id,
          width: file.width,
          height: file.height,
          processed: file.processed,
        }));

        const folders = folderResults.map((folder) => ({
          name: folder.name,
          size: 0,
          dateModified: new Date().toISOString(),
          type: "directory",
          isFile: false,
          hasChild: true,
          filterPath: "/",
        }));

        res.json({
          cwd: {
            name: "Root",
            size: 0,
            dateModified: new Date().toISOString(),
            type: "directory",
            isFile: false,
            hasChild: files.length > 0 || folders.length > 0,
            filterPath: "/",
          },
          files: [...folders, ...files],
        });
      });
    });
  } else {
    let folderId;
    try {
      folderId = await getCWDId(path);
    } catch (err) {
      console.error("Error getting folder ID by path:", err);
      return res.status(500).send("An error occurred");
    }

    let sqlFiles;
    if(textureFormat === "astc_4x4") {
      sqlFiles = `CALL GetImageGroupsWithASTC(${folderId}, ${userId})`;
    }else{
      sqlFiles = `CALL GetImageGroupsWithFaces(${folderId}, ${userId})`;
    }
    const sqlFolders = "SELECT * FROM folders WHERE parent_id = ? and user_id = ?"; //we could also make folder id's unique if we wanted to simplify this query

    db.query(sqlFiles, [folderId, userId], (err, fileResults) => {
      if (err) {
        console.error("Error querying files:", err);
        return res.status(500).send("An error occurred");
      }

      db.query(sqlFolders, [folderId, userId], (err, folderResults) => {
        if (err) {
          console.error("Error querying folders:", err);
          return res.status(500).send("An error occurred");
        }

        const filesArray = fileResults[0]; // Access the first element of fileResults
        console.log("filesArray", filesArray);


        const files = filesArray.map((file) => ({
          name: file.name,
          size: 0,
          dateModified: new Date().toISOString(),
          type: "file",
          isFile: true,
          hasChild: false,
          filterPath: filterPath,
          id: file.id,
          textureFormat: textureFormat,
          format_360: file.image_format,
          faces: file.images,
          groupId: file.group_id,
          width: file.width,
          height: file.height,
          processed: file.processed,
        }));

        const folders = folderResults.map((folder) => ({
          name: folder.name,
          size: 0,
          dateModified: new Date().toISOString(),
          type: "directory",
          isFile: false,
          hasChild: true,
          filterPath: filterPath,
        }));

        res.json({
          cwd: {
            name: path,
            size: 0,
            dateModified: new Date().toISOString(),
            type: "directory",
            isFile: false,
            hasChild: files.length > 0 || folders.length > 0,
            filterPath: filterPath,
          },
          files: [...folders, ...files],
        });
      });
    });
  }
};

export const deleteFilesFromDatabase = async (data, userId, callback) => {
  const path = data.path;
  const names = data.names;

  let folderId;
  try {
    folderId = await getCWDId(path);
  } catch (err) {
    console.error("Error getting folder ID by path:", err);
  }
  const placeholders = names.map(() => "?").join(",");

  var sql;
  if (folderId === null) {
    sql = `DELETE FROM image_groups WHERE folder_id is ? AND name IN (${placeholders}) and user_id = ${userId}`;
  } else {
    sql = `DELETE FROM image_groups WHERE folder_id= ? AND name IN (${placeholders}) and user_id = ${userId}`;
  }

  db.query(sql, [folderId, ...names], (err, result) => {
    if (err) {
      return callback(err);
    }

    return callback(null, {
      cwd: null,
      files: names.map((name) => ({
        name: name,
        size: 0,
        dateModified: new Date().toISOString(),
        dateCreated: new Date().toISOString(),
        hasChild: false,
        isFile: true,
        type: ".pdf",
        filterPath: path,
      })),
      error: null,
      details: null,
    });
  });
};

export const deleteFoldersFromDatabase = async (data, userId, callback) => {
  const path = data.path;
  const names = data.names;

  let folderId;
  try {
    folderId = await getCWDId(path);
  } catch (err) {
    console.error("Error getting folder ID by path:", err);
    return res.status(500).send("An error occurred");
  }

  const placeholders = names.map(() => "?").join(",");
  var sql;
  if (folderId === null) {
    sql = `DELETE FROM folders WHERE parent_id is ? AND name IN (${placeholders}) and user_id = ${userId}`;
  } else {
    sql = `DELETE FROM folders WHERE parent_id = ? AND name IN (${placeholders}) and user_id = ${userId}`;
  }

  db.query(sql, [folderId, ...names], (err, result) => {
    if (err) {
      console.error(err, "error in deleteFoldersFromDatabase");
      return callback(err);
    }

    return callback(null, {
      cwd: null,
      folders: names.map((name) => ({
        name: name,
        size: 0,
        dateModified: new Date().toISOString(),
        dateCreated: new Date().toISOString(),
        hasChild: false,
        isFile: false,
        type: "directory",
        filterPath: path,
      })),
      error: null,
      details: null,
    });
  });
};

export const getCWDId = (path) => {
  return new Promise((resolve, reject) => {
    if (path === "/") {
      return resolve(null); // Root folder
    }
    // console.log("handling non root directory");

    const pathSegments = path.split("/").filter((segment) => segment);
    let currentParentId = null;

    const getNextFolderId = (index) => {
      if (index >= pathSegments.length) {
        return resolve(currentParentId);
      }
      const segment = pathSegments[index];
      let sql;
      let params;
      if (currentParentId === null) {
        sql = "SELECT id FROM folders WHERE name = ? AND parent_id IS NULL";
        params = [segment];
      } else {
        sql = "SELECT id FROM folders WHERE name = ? AND parent_id = ?";
        params = [segment, currentParentId];
      }
      db.query(sql, params, (err, results) => {
        if (err) {
          return reject(err);
        }
        if (results.length === 0) {
          return reject(new Error("Folder not found"));
        }
        currentParentId = results[0].id;
        getNextFolderId(index + 1);
      });
    };

    getNextFolderId(0);
  });
};

export const deleteItemsFromDatabase = (data, userId, res) => {
  const { path, names, data: items } = data;
  const files = items.filter((item) => item.isFile);
  const folders = items.filter((item) => !item.isFile);
  let folderResults = [];
  let fileResults = [];

  const handleResponse = () => {
    res.json({
      success: true,
      message: "Files & folders deleted successfully",
      files: fileResults,
      folders: folderResults,
    });
  };

  const deleteFiles = (callback) => {
    if (files.length > 0) {
      deleteFilesFromDatabase(
        { path, names: files.map((file) => file.name) },
        userId,
        (fileErr, fileResult) => {
          if (fileErr) {
            console.error("Error deleting files:", fileErr);
            return res
              .status(500)
              .send("An error occurred while deleting files");
          } else {
            fileResults = fileResult.files;
            callback();
          }
        }
      );
    } else {
      callback();
    }
  };

  const deleteFolders = (callback) => {
    if (folders.length > 0) {
      console.log("is this firing?");
      deleteFoldersFromDatabase(
        { path, names: folders.map((folder) => folder.name) },
        userId,
        (folderErr, folderResult) => {
          if (folderErr) {
            console.error("Error deleting folders:", folderErr);
            return res
              .status(500)
              .send("An error occurred while deleting folders");
          } else {
            folderResults = folderResult.folders;
            callback();
          }
        }
      );
    } else {
      callback();
    }
  };

  deleteFiles(() => {
    deleteFolders(handleResponse);
  });
};

export const createFolder = async (folderName, path, userId, res) => {
  const name = folderName;
  console.log("userid: ", userId);

  let folderId;
  try {
    folderId = await getCWDId(path);
  } catch (err) {
    console.error("Error getting folder ID by path:", err);
    return res.status(500).send("An error occurred");
  }

  const sql = "INSERT INTO folders (name, parent_id, user_id) VALUES (?, ?, ?)";
  db.query(sql, [name, folderId, userId], (err, result) => {
    if (err) {
      console.error("Error getting parent ID:", err);
      return res.status(500).json({
        action: "create",
        error: {
          message: err.message,
          code: err.code || "UNKNOWN_ERROR",
        },
        name: "failure",
      });
    } else {
      // const newFolderId = result.insertId;
      if (!res.headersSent) {
        console.log("new folder created");
        return res.json({
          cwd: null,
          files: [
            {
              dateModified: new Date().toISOString(),
              dateCreated: new Date().toISOString(),
              filterPath: path,
              hasChild: false,
              isFile: false,
              name: name,
              size: 0,
              type: "directory",
            },
          ],
          details: null,
          error: null,
        });
      }
    }
  });
};

export const uploadFile = async (userId, name, path) => {
  let folderId;
  try {
    folderId = await getCWDId(path);
  } catch (err) {
    console.error("Error getting folder ID by path:", err);
    throw new Error("An error occurred while getting folder ID");
  }

  const sql = folderId === null
    ? `INSERT INTO image_groups (name, image_format, processed, user_id) VALUES (?, ?, false, ${userId})`
    : `INSERT INTO image_groups (name, image_format, folder_id, processed, user_id) VALUES (?, ?, ?, false, ${userId})`;

  return new Promise((resolve, reject) => {
    db.query(sql, [name, "processing", folderId], (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return reject(new Error("An error occurred while inserting into the database"));
      }

      const insertedId = result.insertId;
      console.log("insertedId", insertedId);
      resolve({
        cwd: null,
        files: [
          {
            dateModified: new Date().toISOString(),
            dateCreated: new Date().toISOString(),
            filterPath: path,
            hasChild: false,
            isFile: true,
            name: name,
            id: insertedId,
            size: 0,
            type: "",
            processed: false,
          },
        ],
        details: null,
        error: null,
      });
    });
  });
};

// export const uploadFile = async (req, res) => {
//   let userId = req.user.userId;
//   var name = req.body.name;
//   var path = req.body.path;
//   let folderId;
//   try {
//     folderId = await getCWDId(path);
//   } catch (err) {
//     console.error("Error getting folder ID by path:", err);
//     return res.status(500).send("An error occurred");
//   }

//   var sql;
//   if (folderId === null) {
//     sql = `INSERT INTO image_groups (name, image_format, processed, user_id) VALUES (?, ?, false, ${userId})`;
//   } else {
//     sql = `INSERT INTO image_groups (name, image_format, folder_id, processed, user_id) VALUES (?, ?, ?, false, ${userId})`;
//   }
//   db.query(sql, [name, "processing", folderId], (err, result) => {
//     if (err) {
//       console.error(err);
//       res.status(500).send("An error occurred");
//     } else {
//       const insertedId = result.insertId;
//       console.log("insertedId", insertedId);
//       return res.json({
//         cwd: null,
//         files: [
//           {
//             dateModified: new Date().toISOString(),
//             dateCreated: new Date().toISOString(),
//             filterPath: path,
//             hasChild: false,
//             isFile: true,
//             name: name,
//             id: insertedId,
//             size: 0,
//             type: "",
//             processed: false,
//           },
//         ],
//         details: null,
//         error: null,
//       });
//     }
//   });
// };

export const checkDuplicateFile = (name, folderId, userID, callback) => {
  let sql;

  if (folderId === null) {
    sql ="SELECT * FROM image_groups WHERE name = ? AND folder_id is ? and user_id = ? ";
  } else {
    sql =
      "SELECT * FROM image_groups WHERE name = ? AND folder_id = ? and user_id = ? ";
  }
  db.query(sql, [name, folderId, userID], (err, results) => {
    if (err) {
      return callback(err);
    }
    console.log("results", results);
    return callback(null, results.length > 0);
  });
};

export const checkDuplicateFolder = (name, folderId, userID, callback) => {
  let sql;

  if (folderId === null) {
    sql ="SELECT * FROM folders WHERE name = ? AND parent_id is ? and user_id = ? ";
  } else {
    sql =
      "SELECT * FROM folders WHERE name = ? AND parent_id = ? and user_id = ? ";
  }
  db.query(sql, [name, folderId, userID], (err, results) => {
    if (err) {
      return callback(err);
    }
    console.log("results", results);
    return callback(null, results.length > 0);
  });
};


export const updateImageFormat = async (format, id, userId) => {
  const sql = "UPDATE image_groups SET image_format = ? WHERE id = ? and user_id = ?";
  
  return new Promise((resolve, reject) => {
    db.query(sql, [format, id, userId], (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return reject(new Error("An error occurred while updating the image format"));
      }
      resolve({
        success: true,
        message: "Image group updated successfully",
      });
    });
  });
};

export const getUserImages = async (userId, groupId ) => {
  const sqlFiles = `CALL GetImageGroupsWithFaces(${groupId}, ${userId})`;
  db.query(sqlFiles, (err, fileResults) => {
    if (err) {
      console.error("Error querying files:", err);
      return res.status(500).send("An error occurred");
    }
    console.log("fileResults", fileResults);
  });
};

