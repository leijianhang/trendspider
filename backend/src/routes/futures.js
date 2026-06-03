import express from 'express';
import { getFuturesKline, getFuturesList, searchFutures } from '../controllers/futuresController.js';

const router = express.Router();

router.get('/list', getFuturesList);
router.get('/search', searchFutures);
router.get('/kline/:symbol', getFuturesKline);

export default router;
