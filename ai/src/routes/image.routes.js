import express from 'express';
import multer from 'multer';
import { classifyImage, classifyImageFromURL, analyzeImage } from '../controllers/image.controller.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Image classification endpoints with file upload
router.post('/classify/image', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
    }
    classifyImage(req, res);
});

router.post('/classify/image/url', classifyImageFromURL);

router.post('/classify/image/analyze', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
    }
    analyzeImage(req, res);
});

export default router;
