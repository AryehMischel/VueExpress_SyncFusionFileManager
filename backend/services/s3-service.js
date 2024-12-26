import dotenv from 'dotenv';
import aws from 'aws-sdk';
import crypto from 'crypto';
import { promisify } from 'util';
// import { deleteImageFromDatabase, getKeyFromImageName } from './db-service.js';


const randomBytes = promisify(crypto.randomBytes);
dotenv.config()
const region = process.env.S3_REGION
const bucketName = process.env.S3_BUCKET
const accessKeyId = process.env.S3_ACCESS_KEY_ID
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY

const s3 = new aws.S3({
  region,
  accessKeyId,
  secretAccessKey,
  signatureVersion: 'v4'
})

export async function generateUploadURL(extension) {
  const rawBytes = await randomBytes(16)
  const imageName = `${rawBytes.toString('hex')}.${extension}`;

  const params = ({
    Bucket: bucketName,
    Key: imageName,
    Expires: 60
  })
  
  const uploadURL = await s3.getSignedUrlPromise('putObject', params)
  return uploadURL
}
// module.exports = {generateUploadURL}  


// async function deleteObjectFromS3(imageName, userId) {


//   let key = await getKeyFromImageName(imageName, userId);

//   const params = ({
//     Bucket: bucketName, 
//     Key: key,
//   });

//   try {
//     await s3.deleteObject(params).promise();
//     console.log(`Object with key ${key} deleted successfully`);
//     await deleteImageFromDatabase(key);
//     console.log(`Image ${imageName} deleted successfully from the database`);
//   } catch (error) {
//     console.error(`Error deleting object with key ${key}:`, error);
//     throw error;
//   }
// }

// , deleteObjectFromS3
