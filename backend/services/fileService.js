import db from "./dbService.js";
import { generateUploadURL } from "./s3-service.js";

export const getActiveFilesAndFolders = (path, filterPath, res) => {
  if (path === "/") {
    const sqlFiles = "SELECT * FROM files WHERE folder_id IS NULL";
    const sqlFolders = "SELECT * FROM folders WHERE parent_id IS NULL";

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
          format_360: file.format_360,
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
    getCWDId(path, (err, folderId) => {
      if (err) {
        console.error("Error getting folder ID by path:", err);
        return res.status(500).send("An error occurred");
      }

      const sqlFiles = "SELECT * FROM files WHERE folder_id = ?";
      const sqlFolders = "SELECT * FROM folders WHERE parent_id = ?";

      db.query(sqlFiles, [folderId], (err, fileResults) => {
        if (err) {
          console.error("Error querying files:", err);
          return res.status(500).send("An error occurred");
        }

        db.query(sqlFolders, [folderId], (err, folderResults) => {
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
            format_360: file.format_360,
          }));

          console.log("files", files);

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
    });
  }
};

export const deleteFilesFromDatabase = (data, callback) => {
  const path = data.path;
  const names = data.names;
  getCWDId(path, (err, folderId) => {
    if (err) {
      return res.status(500).send("An error occurred");
    }
    const placeholders = names.map(() => "?").join(",");

    var sql;
    if (folderId === null) {
      sql = `DELETE FROM files WHERE folder_id is ? AND name IN (${placeholders})`;
    } else {
      sql = `DELETE FROM files WHERE folder_id= ? AND name IN (${placeholders})`;
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
  });
};

export const deleteFoldersFromDatabase = (data, callback) => {
  const path = data.path;
  const names = data.names;
  console.log(path, names);
  getCWDId(path, (err, parentId) => {
    if (err) {
      console.error("Error getting folder ID by path:", err);
      return callback(err);
    }

    const placeholders = names.map(() => "?").join(",");
    var sql;
    if (parentId === null) {
      sql = `DELETE FROM folders WHERE parent_id is ? AND name IN (${placeholders})`;
    } else {
      sql = `DELETE FROM folders WHERE parent_id = ? AND name IN (${placeholders})`;
    }

    db.query(sql, [parentId, ...names], (err, result) => {
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
  });
};

export const getCWDId = (path, callback) => {
  if (path === "/") {
    return callback(null, null); // Root folder
  }
  console.log("handling non root directory");
  ``;
  const pathSegments = path.split("/").filter((segment) => segment);
  let currentParentId = null;

  const getNextFolderId = (index) => {
    if (index >= pathSegments.length) {
      return callback(null, currentParentId);
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
        return callback(err);
      }
      if (results.length === 0) {
        return callback(new Error("Folder not found"));
      }
      currentParentId = results[0].id;
      getNextFolderId(index + 1);
    });
  };

  getNextFolderId(0);
};

export const deleteItemsFromDatabase = (data, res) => {
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

export const createFolder = (data, res) => {
  const name = data.name;
  console.log("name", name);
  getCWDId(data.path, (err, parent_id) => {
    const sql = "INSERT INTO folders (name, parent_id) VALUES (?, ?)";
    db.query(sql, [name, parent_id], (err, result) => {
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
                filterPath: data.path,
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
  });
};

export const uploadFile = (req, res) => {
  console.log(req.body);
  console.log("uploading file from upload file function...");
  var name = req.body.name;
  var path = req.body.path;
  console.log("name", name);
  console.log("path", path);
  console.log(req.body);

  getCWDId(path, (err, folderId) => {
    if (err) {
      console.error("Error getting folder ID by path:", err);
      return res.status(500).send("An error occurred");
    }
    var sql;
    if (folderId === null) {
      sql = `INSERT INTO files (name, format_360, processed) VALUES (?, ?, false)`;
    } else {
      sql = `INSERT INTO files (name, format_360, folder_id, processed) VALUES (?, ?, ?, false)`;
    }
    db.query(sql, [name, "processing", folderId], (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send("An error occurred");
      } else {
        const insertedId = result.insertId;
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
  });
};

export const checkDuplicateFile = (name, folderId, callback) => {
  let sql;

  if (folderId === null) {
    sql = "SELECT * FROM files WHERE name = ? AND folder_id is ?";
  } else {
    sql = "SELECT * FROM files WHERE name = ? AND folder_id = ?";
  }
  db.query(sql, [name, folderId], (err, results) => {
    if (err) {
      return callback(err);
    }
    console.log("results", results);
    return callback(null, results.length > 0);
  });
};

//update the database and get presigned url from s3
export const update = async (req, res) => {
  let url;
  try {
    console.log("Generating upload URL", req.body.extension);
    url = await generateUploadURL(req.body.extension);
  } catch (error) {
    console.error("Error generating upload URL:", error);
    res.status(500).send("Error generating upload URL");
  }



  try {
    const { format, id, path, name } = req.body;
    const objectKey = url.split('?')[0].split('/').pop(); //url.split("/").pop() + "." + req.body.extension;
    const objectKeyWithoutExtension = objectKey.substring(0, objectKey.lastIndexOf('.'));
    const sql = "UPDATE files SET format_360 = ?, s3_key = ? WHERE id = ?";
    db.query(sql, [format, objectKeyWithoutExtension, id], (err, result) => {
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
    });
  } catch (err) {
    console.error("Error updating file:", err);
    return res.status(500).send("An error occurred");
  }
};
