import express from 'express';
import passport from 'passport';
const router = express.Router();

// Route to initiate Google OAuth authentication
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"], // Use profile and email scopes
  })
);

// Route to handle the callback from Google OAuth
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => { // Include req and res parameters
    // Successful authentication, redirect home.
    res.redirect("/");
  }
);

export default router;