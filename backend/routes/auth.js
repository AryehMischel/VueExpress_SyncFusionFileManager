import express from 'express';
import {
  initiateGoogleAuth,
  handleGoogleAuthCallback,
  handleGoogleAuthSuccess
} from '../controllers/authController.js';

const router = express.Router();

// Route to initiate Google OAuth authentication
router.get("/google", initiateGoogleAuth);

// Route to handle the callback from Google OAuth
router.get("/google/callback", handleGoogleAuthCallback, handleGoogleAuthSuccess);

export default router;