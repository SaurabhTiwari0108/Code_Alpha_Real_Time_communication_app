import express, { Request, Response } from 'express';
import { protect } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = express.Router();

router.post('/upload', protect, upload.single('file'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }

  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  
  res.status(200).json({
    message: 'File uploaded successfully',
    file: {
      name: req.file.originalname,
      url: fileUrl,
      size: req.file.size,
      type: req.file.mimetype,
    },
  });
});

export default router;
