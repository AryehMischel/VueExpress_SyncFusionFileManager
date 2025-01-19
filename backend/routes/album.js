import express from 'express';
const router = express.Router();


// Construct __dirname in ES module
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// Route to handle public album access via token
router.get('/:token', (req, res) => {
    const token = req.params.token;

    console.log("token:", token);

    // Query the database to validate the token and retrieve the album
    db.query(
        'SELECT * FROM albums WHERE shareable_link = ? AND (expires_at IS NULL OR expires_at > NOW())',
        [token]
    )
    .then(album => {
        if (!album.length) {
            return res.status(404).json({ error: 'Album not found or link expired.' });
        }

        // Respond with the album data
        res.sendFile(path.join(__dirname, 'public/dist', 'index.html'));
    })
    .catch(error => {
        console.error('Error fetching album:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    });
});

export default router;