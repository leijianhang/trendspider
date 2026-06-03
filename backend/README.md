# A股和期货技术分析平台 - 后端服务

## 功能特性

- ✅ A股实时/历史K线数据
- ✅ 期货实时/历史K线数据
- ✅ 技术指标计算 (MA, EMA, MACD, RSI, KDJ, BOLL)
- ✅ 股票/期货搜索
- ✅ 数据缓存优化
- ✅ RESTful API

## 技术栈

- Node.js + Express
- Axios (HTTP客户端)
- Node-Cache (内存缓存)

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env` 并配置：

```bash
cp .env.example .env
```

### 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务将运行在 `http://localhost:3001`

## API文档

### 股票相关

#### 获取股票列表
```
GET /api/stock/list?market=sh
```

#### 搜索股票
```
GET /api/stock/search?keyword=茅台
```

#### 获取K线数据
```
GET /api/stock/kline/:symbol?period=daily&adjust=qfq
```

参数：
- `symbol`: 股票代码 (如: 600519)
- `period`: 周期 (1min, 5min, 15min, 30min, 60min, daily, weekly, monthly)
- `adjust`: 复权类型 (qfq: 前复权, hfq: 后复权, none: 不复权)

### 期货相关

#### 获取期货列表
```
GET /api/futures/list?exchange=SHFE
```

#### 搜索期货
```
GET /api/futures/search?keyword=铜
```

#### 获取期货K线数据
```
GET /api/futures/kline/:symbol?period=daily
```

### 技术指标

#### 计算指标
```
POST /api/indicator/calculate
Content-Type: application/json

{
  "type": "MA",
  "data": [
    {"close": 100.5},
    {"close": 101.2},
    ...
  ],
  "params": {
    "period": 5
  }
}
```

支持的指标类型：
- `MA`: 简单移动平均线
- `EMA`: 指数移动平均线
- `MACD`: 平滑异同移动平均线
- `RSI`: 相对强弱指标
- `KDJ`: 随机指标
- `BOLL`: 布林带

## 数据源

当前使用模拟数据和新浪财经免费API（有延迟）。

生产环境建议使用：
- **Tushare Pro**: 专业A股数据
- **聚宽/米筐**: 量化数据平台
- **交易所官方API**: 期货数据

## 项目结构

```
backend/
├── src/
│   ├── controllers/     # 控制器
│   ├── routes/          # 路由
│   ├── services/        # 业务逻辑
│   ├── utils/           # 工具函数
│   ├── config/          # 配置文件
│   └── index.js         # 入口文件
├── package.json
└── .env.example
```

## 下一步开发

- [ ] WebSocket实时推送
- [ ] Redis缓存
- [ ] 用户认证系统
- [ ] 价格预警功能
- [ ] 数据库持久化
- [ ] 对接专业数据源
