// backend/routes/photos.js
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const auth = require('../middleware/auth');
const Photo = require('../models/Photo');
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- NEW PUBLIC ROUTE ---
// Get all photos for the public gallery. No authentication required.
router.get('/public', async (req, res) => {
    try {
        // Find all photos and sort by the newest ones first.
        const photos = await Photo.find({}).sort({ createdAt: -1 });
        res.json(photos);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


// --- EXISTING ROUTES FOR LOGGED-IN USERS ---

// Upload a photo (requires user to be logged in)
router.post('/upload', [auth, upload.single('image')], async (req, res) => {
    const { title } = req.body;
    if (!req.file) {
        return res.status(400).json({ msg: 'Please upload a file' });
    }

    let upload_stream = cloudinary.uploader.upload_stream(
        { folder: "photo_app" },
        async (error, result) => {
            if (error) {
                console.error('Cloudinary Error:', error);
                return res.status(500).send('Image upload failed');
            }
            try {
                const newPhoto = new Photo({
                    user: req.user.id,
                    title,
                    imageUrl: result.secure_url,
                    publicId: result.public_id,
                });
                const photo = await newPhoto.save();
                res.json(photo);
            } catch (err) {
                console.error(err.message);
                res.status(500).send('Server error');
            }
        }
    );
    streamifier.createReadStream(req.file.buffer).pipe(upload_stream);
});

// Get a specific user's photos (requires user to be logged in)
router.get('/', auth, async (req, res) => {
    try {
        const photos = await Photo.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(photos);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Delete a photo (requires user to be the owner)
router.delete('/:id', auth, async (req, res) => {
    try {
        const photo = await Photo.findById(req.params.id);
        if (!photo) {
            return res.status(404).json({ msg: 'Photo not found' });
        }
        if (photo.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        // Delete from Cloudinary
        await cloudinary.uploader.destroy(photo.publicId);
        // Delete from DB
        await Photo.findByIdAndRemove(req.params.id);

        res.json({ msg: 'Photo removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
