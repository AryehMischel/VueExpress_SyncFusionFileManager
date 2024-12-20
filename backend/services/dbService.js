import mysql from "mysql2";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE, 
});

export const connectToDatabase = () => {
  db.getConnection((err) => {
    if (err) {
      console.error("Database connection failed:", err);
    } else {
      console.log("Database connection successful");
    }
  });
};

export default db;