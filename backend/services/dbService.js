import mysql from "mysql2";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const db = mysql.createPool({
  host: process.env.RDS_ENDPOINT, // RDS endpoint
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DATABASE,
  port: process.env.RDS_PORT || 3306, // Default MySQL port
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Connection pool for the second database
const db2 = mysql.createPool({
  host: process.env.RDS_ENDPOINT, // RDS endpoint for the second database
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DATABASE_2,
  port: process.env.RDS_PORT || 3306, // Default MySQL port
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
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

export const connectToDatabase2 = () => {
  db2.getConnection((err) => {
    if (err) {
      console.error("Second database connection failed:", err);
    } else {
      console.log("Second database connection successful");
    }
  });
};

export default db;
export { db2 };