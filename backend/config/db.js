import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(process.env.RDS_DATABASE,
  process.env.RDS_USER, process.env.RDS_PASSWORD, {
  host: process.env.RDS_ENDPOINT,
  dialect: 'mysql',
  port: process.env.RDS_PORT,
});

export default sequelize;