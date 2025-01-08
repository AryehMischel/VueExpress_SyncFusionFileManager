import passport from 'passport';

export const initiateGoogleAuth = passport.authenticate("google", {
  scope: ["profile", "email"], // Use profile and email scopes
});

export const handleGoogleAuthCallback = passport.authenticate("google", { failureRedirect: "/" });

export const handleGoogleAuthSuccess = (req, res) => {
  // Successful authentication, redirect home.
  res.redirect("/");
};