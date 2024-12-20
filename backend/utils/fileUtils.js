import fs from "fs";

export const createUploadsDir = () => {
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
  }
};