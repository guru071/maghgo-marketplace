import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { removeBackground } from '../services/media.service';

const router = express.Router();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Every call here spends money (remove.bg is a paid API) and the endpoint is
// anonymous. Without a ceiling, a loop of POSTs drains the API quota — a
// financial denial-of-service. A real visitor plays with the demo a few times.
const demoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demo limit reached — please try again in a few minutes.' },
});

router.post('/process-image', demoLimiter, upload.single('image'), async (req, res) => {
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
