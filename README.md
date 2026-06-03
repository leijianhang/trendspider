# A股和期货技术分析平台

一个功能完整的股票和期货技术分析平台，提供专业的K线图表、技术指标和实时数据分析。

## 项目预览

### 主要功能
- 📊 专业K线图表 (基于TradingView Lightweight Charts)
- 🔍 股票/期货实时搜索
- ⏱️ 多时间周期 (1分钟到月线)
- 📈 丰富的技术指标 (MA, EMA, MACD, RSI, KDJ, BOLL)
- 🎨 暗色主题UI设计
- 💹 A股复权处理
- 🔄 实时数据更新

## 技术栈

### 后端
- Node.js + Express
- Axios (数据获取)
- Node-Cache (缓存)

### 前端
- React 18
- Vite
- Ant Design
- TradingView Lightweight Charts
- Zustand (状态管理)

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 启动服务

#### 方式一：分别启动

**启动后端服务:**
```bash
cd backend
npm run dev
```
后端服务运行在 `http://localhost:3001`

**启动前端服务:**
```bash
cd frontend
npm run dev
```
前端应用运行在 `http://localhost:3000`

#### 方式二：使用启动脚本 (推荐)

Windows:
```bash
./start.bat
```

Linux/Mac:
```bash
chmod +x start.sh
./start.sh
```

### 访问应用

打开浏览器访问: `http://localhost:3000`

## 项目结构

```
trendspider/
├── backend/              # 后端服务
│   ├── src/
│   │   ├── controllers/  # 控制器
│   │   ├── routes/       # 路由
│   │   ├── services/     # 业务逻辑
│   │   └── index.js      # 入口文件
│   ├── package.json
│   └── README.md
│
├── frontend/             # 前端应用
│   ├── src/
│   │   ├── components/   # React组件
│   │   ├── services/     # API服务
│   │   ├── store/        # 状态管理
│   │   ├── styles/       # 样式文件
│   │   ├── App.jsx       # 主应用
│   │   └── main.jsx      # 入口文件
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── README.md
│
└── README.md             # 项目说明
```

## 功能说明

### 1. 股票/期货搜索
- 支持按代码或名称搜索
- A股和期货分类显示
- 实时搜索结果

### 2. K线图表
- 专业蜡烛图显示
- 成交量柱状图
- 支持缩放、拖动
- 十字光标数据跟踪

### 3. 时间周期
- **分钟级**: 1分、5分、15分、30分、60分
- **日线**: 日K线
- **周线**: 周K线
- **月线**: 月K线

### 4. 技术指标

#### 趋势指标
- **MA (移动平均线)**: 支持多周期 (5, 10, 20, 60)
- **EMA (指数移动平均)**: 快速响应价格变化

#### 摆动指标
- **MACD**: 趋势和动量指标
- **RSI**: 相对强弱指标
- **KDJ**: 随机指标

#### 其他指标
- **BOLL (布林带)**: 波动率指标

### 5. A股特色功能
- **前复权**: 以当前价格为基准向前复权
- **后复权**: 以上市价格为基准向后复权
- **不复权**: 显示真实历史价格

## API接口

### 股票接口
```
GET  /api/stock/list          # 获取股票列表
GET  /api/stock/search        # 搜索股票
GET  /api/stock/kline/:symbol # 获取K线数据
```

### 期货接口
```
GET  /api/futures/list          # 获取期货列表
GET  /api/futures/search        # 搜索期货
GET  /api/futures/kline/:symbol # 获取K线数据
```

### 指标接口
```
POST /api/indicator/calculate   # 计算技术指标
```

## 数据源

当前使用模拟数据和新浪财经免费API（有15分钟延迟）。

### 生产环境数据源建议

**A股数据:**
- [Tushare Pro](https://tushare.pro/) - 专业金融数据接口
- [聚宽](https://www.joinquant.com/) - 量化数据平台
- [米筐](https://www.ricequant.com/) - 量化数据平台

**期货数据:**
- 上期所、大商所、郑商所、中金所官方API
- 文华财经数据接口
- 博易大师数据接口

## 开发计划

### 已完成 ✅
- [x] 基础项目架构
- [x] 后端API服务
- [x] 前端React应用
- [x] K线图表组件
- [x] 技术指标计算
- [x] 股票/期货搜索
- [x] 多周期切换
- [x] 复权处理

### 进行中 🚧
- [ ] WebSocket实时数据推送
- [ ] 绘图工具 (趋势线、水平线等)
- [ ] 价格预警系统

### 计划中 📋
- [ ] 用户认证系统
- [ ] 自选股管理
- [ ] 图表模板保存
- [ ] 分时图
- [ ] 龙虎榜数据
- [ ] 资金流向分析
- [ ] 移动端适配
- [ ] 数据回测功能

## 配置说明

### 后端配置
复制 `backend/.env.example` 为 `backend/.env`:
```bash
PORT=3001
NODE_ENV=development
TUSHARE_TOKEN=your_token_here  # 可选
```

### 前端配置
创建 `frontend/.env`:
```bash
VITE_API_BASE_URL=http://localhost:3001/api
```

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

建议使用最新版本的现代浏览器。

## 常见问题

### 1. 端口被占用
修改 `backend/.env` 中的 `PORT` 和 `frontend/vite.config.js` 中的端口配置。

### 2. 数据加载失败
检查后端服务是否正常运行，查看浏览器控制台错误信息。

### 3. 图表不显示
确保浏览器支持Canvas，清除浏览器缓存后重试。

## 贡献指南

欢迎提交Issue和Pull Request！

## 许可证

MIT License

## 联系方式

如有问题或建议，欢迎提Issue。

---

**注意**: 本项目仅供学习和研究使用，不构成任何投资建议。投资有风险，入市需谨慎。
