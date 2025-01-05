// routes/s3.js
import express from 'express';
import { generateUploadURL} from '../services/s3-service.js';
import router from express.Router();

router.get('/s3Url', async (req, res) => {
  try {
    console.log("Generating upload URL", req.body.extension);
    const url = await generateUploadURL(req.body.extension, req.body.imageFormat);
    res.send({ url });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    res.status(500).send("Error generating upload URL");
  }
});



export default router;