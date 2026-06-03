import express from 'express';
import { scanAllPatterns, scanTheStrat } from '../controllers/patternController.js';

const router = express.Router();

router.post('/all', scanAllPatterns);
router.post('/the-strat', scanTheStrat);

export default router;
