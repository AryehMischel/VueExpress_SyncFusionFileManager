import express from "express";
const router = express.Router();

router.post("/album", (req, res) => {
  console.log("creating new album");
  res.send("Album created");
});

router.post("/delete", (req, res) => {
  console.log("deleting album");
  res.send("Album deleted");
});

router.post("/add", (req, res) => {
  console.log("adding image to album");
  res.send("Image added to album");
});

router.post("/remove", (req, res) => {
  console.log("removing image from album");
  res.send("Image removed from album");
});

export default router;