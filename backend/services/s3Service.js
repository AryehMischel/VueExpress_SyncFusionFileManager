import dotenv from 'dotenv';
import aws from 'aws-sdk';
import crypto from 'crypto';
import { promisify } from 'util';
import db from "./dbService.js";
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

export async function generateUploadURL(extension, imageFormat) {
  const rawBytes = await randomBytes(16)
  const imageName = `${rawBytes.toString('hex')}.${extension}`;

  const metadata = {
    'x-amz-meta-360-format': imageFormat,  // e.g., cubemap, equirectangular, etc.
  };
  
  const params = ({
    Bucket: bucketName,
    Key: imageName,
    Expires: 60,
    Metadata: metadata,
  })
  
  const uploadURL = await s3.getSignedUrlPromise('putObject', params)
  return uploadURL
}


// export const getS3URL = async (req) => {
//   console.log("getting s3 urls...");
//   //eqrt: 1, stereoEqrt: 2, cubemap: 6, stereoCubemap: 12
//   let {
//     imageGroupId,
//     height,
//     width,
//     path,
//     fileExtension,
//     imageFormat,
//   } = req.body;

//   const url = await generateUploadURL(fileExtension, imageFormat); //this will only matter when handling unprocessed images. like eqrt

//   let sqlInsertStatement = "INSERT INTO images (s3_key, group_id, height, width) VALUES (?, ?, ?, ?)";

//   const objectKey = url.split("?")[0].split("/").pop(); //url.split("/").pop() + "." + req.body.extension;
//   const objectKeyWithoutExtension = objectKey.substring(0, objectKey.lastIndexOf("."));

//   return new Promise((resolve, reject) => {
//     db.query(
//       sqlInsertStatement,
//       [objectKeyWithoutExtension, imageGroupId, height, width],
//       (err, result) => {
//         if (err) {
//           console.error(err);
//           return reject(new Error("An error occurred while inserting into the database"));
//         }

//         resolve({
//           cwd: null,
//           file: {
//             dateModified: new Date().toISOString(),
//             dateCreated: new Date().toISOString(),
//             filterPath: path,
//             hasChild: false,
//             isFile: true,
//             size: 0,
//             type: "",
//             url: url,
//           },
//           details: null,
//           error: null,
//         });
//       }
//     );
//   });
// };

export const getS3URL = async (req) => {
  console.log("getting s3 urls...");
  //eqrt: 1, stereoEqrt: 2, cubemap: 6, stereoCubemap: 12
  let {
    imageGroupId,
    height,
    width,
    path,
    fileExtension,
    imageFormat,
  } = req.body;

  const url = await generateUploadURL(fileExtension, imageFormat); //this will only matter when handling unprocessed images. like eqrt

  let sqlInsertStatement = "INSERT INTO images (s3_key, group_id, height, width) VALUES (?, ?, ?, ?)";

  const objectKey = url.split("?")[0].split("/").pop(); //url.split("/").pop() + "." + req.body.extension;
  // const objectKeyWithoutExtension = objectKey.substring(0, objectKey.lastIndexOf("."));

  return new Promise((resolve, reject) => {
    db.query(
      sqlInsertStatement,
      [objectKey, imageGroupId, height, width],
      (err, result) => {
        if (err) {
          console.error(err);
          return reject(new Error("An error occurred while inserting into the database"));
        }

        resolve({
          cwd: null,
          file: {
            dateModified: new Date().toISOString(),
            dateCreated: new Date().toISOString(),
            filterPath: path,
            hasChild: false,
            isFile: true,
            size: 0,
            type: "",
            url: url,
          },
          details: null,
          error: null,
        });
      }
    );
  });
};

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
