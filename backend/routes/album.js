import express from 'express';
const router = express.Router();

// Route to handle public album access via token
router.get('/albums/:token', async (req, res) => {
    const token = req.params.token;

    console.log("token:", token);

    // try {
    //     // Query the database to validate the token and retrieve the album
    //     const album = await db.query(
    //         'SELECT * FROM albums WHERE shareable_link = ? AND (expires_at IS NULL OR expires_at > NOW())',
    //         [token]
    //     );

    //     if (!album.length) {
    //         return res.status(404).json({ error: 'Album not found or link expired.' });
    //     }

    //     // Respond with the album data
    //     res.json({ album: album[0] });
    // } catch (error) {
    //     console.error('Error fetching album:', error);
    //     res.status(500).json({ error: 'Internal Server Error' });
    // }
});

export default router;