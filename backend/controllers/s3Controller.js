import { getS3URL } from "../services/s3Service.js";

export const getPresignedURL = async (req, res) => {
    try {
      const result = await getS3URL(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };