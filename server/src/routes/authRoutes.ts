import express from 'express';
import { body } from 'express-validator';
import { signup, login, getMe } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post(
  '/signup',
  [
    body('name', 'Name is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  ],
  signup
);

router.post('/login', login);

router.get('/me', protect, getMe);

export default router;
