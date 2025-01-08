

// Middleware to ensure the user is authenticated
export function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/fail"); // Redirect to fail page if not authenticated
}