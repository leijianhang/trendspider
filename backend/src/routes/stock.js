import express from 'express';
import { getStockList, getStockKline, searchStock } from '../controllers/stockController.js';

const router = express.Router();

// 获取股票列表
router.get('/list', getStockList);

// 搜索股票
router.get('/search', searchStock);

// 获取K线数据
router.get('/kline/:symbol', getStockKline);

export default router;
