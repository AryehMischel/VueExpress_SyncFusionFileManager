import db from "./dbService.js";
import { generateUploadURL } from "./s3-service.js";

export const getActiveFilesAndFolders = async (
  userId,
  path,
  filterPath,
  res
) => {
  if (path === "/") {
    const sqlFiles = `SELECT * FROM image_groups WHERE folder_id IS NULL and user_id = ${userId}`;
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

        const files = fileResults.map((file) => ({
          name: file.name,
          size: 0,
          dateModified: new Date().toISOString(),
          type: "file",
          isFile: true,
          format_360: file.image_format,
          hasChild: false,
          filterPath: "/",
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

    const sqlFiles =
      "SELECT * FROM image_groups WHERE folder_id = ? and user_id = ?";
    const sqlFolders =
      "SELECT * FROM folders WHERE parent_id = ? and user_id = ?"; //we could also make folder id's unique if we wanted to simplify this query

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

        const files = fileResults.map((file) => ({
          name: file.name,
          size: 0,
          dateModified: new Date().toISOString(),
          type: "file",
          isFile: true,
          hasChild: false,
          filterPath: filterPath,
          id: file.id,
          format_360: file.image_format,
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

export const uploadFile = async (req, res) => {
  let userId = req.user.userId;
  var name = req.body.name;
  var path = req.body.path;
  let folderId;
  try {
    folderId = await getCWDId(path);
  } catch (err) {
    console.error("Error getting folder ID by path:", err);
    return res.status(500).send("An error occurred");
  }

  var sql;
  if (folderId === null) {
    sql = `INSERT INTO image_groups (name, image_format, processed, user_id) VALUES (?, ?, false, ${userId})`;
  } else {
    sql = `INSERT INTO image_groups (name, image_format, folder_id, processed, user_id) VALUES (?, ?, ?, false, ${userId})`;
  }
  db.query(sql, [name, "processing", folderId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("An error occurred");
    } else {
      const insertedId = result.insertId;
      console.log("insertedId", insertedId);
      return res.json({
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
    }
  });
};

export const checkDuplicateFile = (name, folderId, userID, callback) => {
  let sql;

  if (folderId === null) {
    sql =
      "SELECT * FROM image_groups WHERE name = ? AND folder_id is ? and user_id = ? ";
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

// split this into seperate functions.

//update the database and get presigned url from s3

//updates image group with image type
//inserts image into images table for eqrt image
// generating s3 upload url

export const update = async (req, res) => {
  let url;
  try {
    console.log("Generating upload URL", req.body.extension);
    url = await generateUploadURL(req.body.extension);
  } catch (error) {
    console.error("Error generating upload URL:", error);
    res.status(500).send("Error generating upload URL");
  }

  // , s3_key = ? objectKeyWithoutExtension,

  try {
    const { format, id, path, name } = req.body;
    const objectKey = url.split("?")[0].split("/").pop(); //url.split("/").pop() + "." + req.body.extension;
    const objectKeyWithoutExtension = objectKey.substring(
      0,
      objectKey.lastIndexOf(".")
    );
    //update image_groups
    const sql =
      "UPDATE image_groups SET image_format = ? WHERE id = ? and user_id = ?";

    //update images -> this will obviously need to be refactored to handle multiple images
    const sql2 =
      "INSERT INTO images (s3_key, group_id, face_index, height, width) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [format, id, req.user.userId], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send("An error occurred");
      }

      db.query(
        sql2,
        [
          objectKeyWithoutExtension,
          id,
          req.body.face,
          req.body.height,
          req.body.width,
        ],
        (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).send("An error occurred");
          }

          return res.json({
            cwd: null,
            files: [
              {
                dateModified: new Date().toISOString(),
                dateCreated: new Date().toISOString(),
                filterPath: path,
                hasChild: false,
                isFile: true,
                name: name,
                id: id,
                size: 0,
                type: "",
                url: url,
              },
            ],
            details: null,
            error: null,
          });
        }
      );
    });
  } catch (err) {
    console.error("Error updating file:", err);
    return res.status(500).send("An error occurred");
  }
};

//update the image group with the image format
export const updateImageGroup = async (req, res) => {
  const { format, id } = req.body;
  const sql =
    "UPDATE image_groups SET image_format = ? WHERE id = ? and user_id = ?";
  db.query(sql, [format, id, req.user.userId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("An error occurred");
    } else {
      res.json({
        success: true,
        message: "Image group updated successfully",
      });
    }
  });
};

// here we first create all the images for the image group based on the image format
// then we generate the s3 urls for each image
// then we update the images with the s3 urls
// then we send the s3 urls back to the client

//bulk insert
// const values = [];
// for (let i = 0; i < faceCount; i++) {
//   values.push([urls[i], imageGroupId, i, height, width]);
// }

// const sqlInsertStatement = `
//   INSERT INTO images (s3_key, group_id, face_index, height, width)
//   VALUES ?
// `;

// db.query(sqlInsertStatement, [values], (err, result) => {
//   if (err) {
//     console.error(err);
//     return res.status(500).send("An error occurred");
//   }
//   res.status(200).send("Images inserted successfully");
// });

export const getS3URLS = async (req, res) => {
 console.log("getting s3 urls...")
 //eqrt: 1, stereoEqrt: 2, cubemap: 6, stereoCubemap: 12
  let urls = [];
  let { imageGroupId, faceCount, height, width, path} = req.body;

  for (let i = 0; i < faceCount; i++) {
    const url = await generateUploadURL(req.body.extension); //this will only matter when handling unprocessed images. like eqrt
    urls.push(url);
  }

  let sqlInsertStatement =
    "INSERT INTO images (s3_key, group_id, face_index, height, width) VALUES (?, ?, ?, ?, ?)";

  for (let i = 0; i < faceCount; i++) {
    const objectKey = urls[i].split("?")[0].split("/").pop(); //url.split("/").pop() + "." + req.body.extension;
    const objectKeyWithoutExtension = objectKey.substring( 0, objectKey.lastIndexOf("."));
    db.query(
      sqlInsertStatement,
      [objectKeyWithoutExtension, imageGroupId, i, height, width],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).send("An error occurred");
        }
      }
    );
  }

  return res.json({
    cwd: null,
    files: [
      {
        dateModified: new Date().toISOString(),
        dateCreated: new Date().toISOString(),
        filterPath: path,
        hasChild: false,
        isFile: true,
        // id: id,
        size: 0,
        type: "",
        urls: urls,
      },
    ],
    details: null,
    error: null,
  });
};

//update the images if the images are successfully uploaded to s3
export const updateImages = async (req, res) => {};
