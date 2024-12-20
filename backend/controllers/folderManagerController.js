import db from "../services/dbService.js";

// Function to create a new folder
export const createFolder = (req, res) => {
  const { name, parentId } = req.body;
  const sql = "INSERT INTO folders (name, parent_id) VALUES (?, ?)";
  db.query(sql, [name, parentId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("An error occurred");
    } else {
      const newFolderId = result.insertId;
      res.json({ success: true, id: newFolderId, name, parentId });
    }
  });
};

// Function to get folder details
export const getFolderDetails = (req, res) => {
  const { folderId } = req.params;
  const sql = "SELECT * FROM folders WHERE id = ?";
  db.query(sql, [folderId], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("An error occurred");
    } else if (results.length === 0) {
      res.status(404).send("Folder not found");
    } else {
      res.json(results[0]);
    }
  });
};

// Function to delete a folder
export const deleteFolder = (req, res) => {
  const { folderId } = req.params;
  const sql = "DELETE FROM folders WHERE id = ?";
  db.query(sql, [folderId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("An error occurred");
    } else if (result.affectedRows === 0) {
      res.status(404).send("Folder not found");
    } else {
      res.json({ success: true, message: "Folder deleted" });
    }
  });
};