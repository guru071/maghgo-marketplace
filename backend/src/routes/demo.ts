import express from 'express';
import multer from 'multer';
import { removeBackground } from '../services/media.service';

const router = express.Router();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

router.post('/process-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image provided' });
      return;
    }

    console.log('🧪 Demo mode: Processing image...');
    
    // Call the AI background removal
    const processedBuffer = await removeBackground(req.file.buffer);

    // Return the image directly as base64 so the frontend can display it instantly without DB storage
    const base64Image = processedBuffer.toString('base64');
    const dataUri = `data:image/png;base64,${base64Image}`;

    res.json({ success: true, imageUrl: dataUri });
  } catch (error) {
    console.error('❌ Demo processing error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

export default router;
