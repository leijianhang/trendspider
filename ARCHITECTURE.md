# 项目架构说明

## 整体架构

```
┌─────────────┐         HTTP/REST API        ┌─────────────┐
│             │ ◄──────────────────────────► │             │
│   前端应用   │                              │   后端服务   │
│  (React)    │                              │  (Node.js)  │
│             │                              │             │
└─────────────┘                              └──────┬──────┘
                                                    │
                                                    │ 数据获取
                                                    ▼
                                             ┌─────────────┐
                                             │  数据源API   │
                                             │ (新浪/Tushare)│
                                             └─────────────┘
```

## 后端架构

### 目录结构
```
backend/
├── src/
│   ├── controllers/      # 控制器层 - 处理HTTP请求
│   │   ├── stockController.js
│   │   ├── futuresController.js
│   │   └── indicatorController.js
│   │
│   ├── routes/          # 路由层 - 定义API端点
│   │   ├── stock.js
│   │   ├── futures.js
│   │   └── indicator.js
│   │
│   ├── services/        # 服务层 - 业务逻辑
│   │   ├── stockService.js      # 股票数据获取
│   │   ├── futuresService.js    # 期货数据获取
│   │   └── indicatorService.js  # 技术指标计算
│   │
│   ├── utils/           # 工具函数
│   ├── config/          # 配置文件
│   └── index.js         # 应用入口
│
├── package.json
└── .env.example
```

### 数据流
```
HTTP请求 → 路由 → 控制器 → 服务层 → 数据源API
                              ↓
                            缓存层
                              ↓
HTTP响应 ← JSON ← 数据处理 ← 原始数据
```

### 技术选型
- **Express**: Web框架
- **Axios**: HTTP客户端，用于获取外部数据
- **Node-Cache**: 内存缓存，减少API调用
- **ES Modules**: 使用现代JavaScript模块系统

## 前端架构

### 目录结构
```
frontend/
├── src/
│   ├── components/           # React组件
│   │   ├── KlineChart.jsx       # K线图表组件
│   │   ├── KlineChart.css
│   │   ├── SearchPanel.jsx      # 搜索面板
│   │   ├── SearchPanel.css
│   │   ├── IndicatorPanel.jsx   # 指标面板
│   │   ├── IndicatorPanel.css
│   │   ├── Toolbar.jsx          # 工具栏
│   │   └── Toolbar.css
│   │
│   ├── services/            # API服务
│   │   └── api.js              # 封装后端API调用
│   │
│   ├── store/               # 状态管理
│   │   └── chartStore.js       # 图表状态（Zustand）
│   │
│   ├── styles/              # 全局样式
│   │   └── index.css
│   │
│   ├── App.jsx              # 主应用组件
│   ├── App.css
│   └── main.jsx             # 应用入口
│
├── index.html
├── vite.config.js
└── package.json
```

### 组件层次
```
App
├── Header (顶部导航)
├── Layout
│   ├── LeftSider
│   │   └── SearchPanel (搜索面板)
│   │
│   ├── Content
│   │   ├── Toolbar (工具栏)
│   │   └── KlineChart (K线图表)
│   │
│   └── RightSider
│       └── IndicatorPanel (指标面板)
```

### 状态管理
使用 Zustand 进行全局状态管理：

```javascript
chartStore {
  currentSymbol,      // 当前品种代码
  currentName,        // 当前品种名称
  currentType,        // 类型 (stock/futures)
  klineData,          // K线数据
  period,             // 时间周期
  adjust,             // 复权类型
  indicators,         // 技术指标配置
  loading,            // 加载状态
  error               // 错误信息
}
```

### 技术选型
- **React 18**: UI框架
- **Vite**: 构建工具，快速开发体验
- **Ant Design**: UI组件库
- **TradingView Lightweight Charts**: 专业图表库
- **Zustand**: 轻量级状态管理
- **Axios**: HTTP客户端

## 数据流

### 1. 搜索流程
```
用户输入 → SearchPanel → API调用 → 后端搜索
                                      ↓
显示结果 ← SearchPanel ← JSON响应 ← 数据库/缓存
```

### 2. K线数据加载流程
```
选择品种 → chartStore更新 → useEffect触发
                              ↓
                         API调用后端
                              ↓
                    后端获取/生成数据
                              ↓
                         返回JSON
                              ↓
                    chartStore更新数据
                              ↓
                    KlineChart重新渲染
```

### 3. 技术指标计算流程
```
方案A: 前端计算 (当前实现)
K线数据 → 前端计算函数 → 指标数据 → 图表显示

方案B: 后端计算 (可选)
K线数据 → 后端API → 计算服务 → 指标数据 → 前端显示
```

## API设计

### RESTful规范
```
GET    /api/stock/list           # 获取列表
GET    /api/stock/search         # 搜索
GET    /api/stock/kline/:symbol  # 获取详情
POST   /api/indicator/calculate  # 计算操作
```

### 响应格式
```json
{
  "success": true,
  "data": [...],
  "error": null
}
```

## 性能优化

### 后端优化
1. **缓存策略**: 使用Node-Cache缓存K线数据（5分钟TTL）
2. **数据压缩**: 返回数据时使用gzip压缩
3. **限流**: 防止API滥用

### 前端优化
1. **虚拟化**: 图表库自带虚拟化，只渲染可见区域
2. **懒加载**: 组件按需加载
3. **防抖**: 搜索输入使用防抖
4. **Memo**: 使用React.memo优化组件渲染

## 扩展性设计

### 添加新数据源
1. 在 `backend/src/services/` 创建新的service
2. 实现统一的数据接口
3. 在controller中调用

### 添加新技术指标
1. 在 `backend/src/services/indicatorService.js` 添加计算函数
2. 在 `frontend/src/components/KlineChart.jsx` 添加渲染逻辑
3. 在 `frontend/src/components/IndicatorPanel.jsx` 添加配置UI

### 添加新功能模块
1. 创建新的组件
2. 添加到状态管理
3. 集成到主应用布局

## 安全考虑

1. **API密钥**: 存储在环境变量中，不提交到代码库
2. **CORS**: 配置允许的来源
3. **输入验证**: 验证所有用户输入
4. **错误处理**: 不暴露敏感信息

## 部署架构

### 开发环境
```
前端: Vite Dev Server (localhost:3000)
后端: Node.js (localhost:3001)
```

### 生产环境建议
```
前端: Nginx + 静态文件
后端: PM2 + Node.js
数据库: Redis (缓存) + PostgreSQL (持久化)
反向代理: Nginx
```

## 监控和日志

### 建议添加
1. **日志系统**: Winston/Pino
2. **性能监控**: New Relic/DataDog
3. **错误追踪**: Sentry
4. **API监控**: 响应时间、错误率

## 测试策略

### 后端测试
- 单元测试: Jest
- API测试: Supertest
- 集成测试: 测试完整数据流

### 前端测试
- 组件测试: React Testing Library
- E2E测试: Playwright/Cypress
- 视觉回归测试: Percy

## 技术债务和改进方向

1. **WebSocket**: 实现实时数据推送
2. **数据库**: 添加持久化存储
3. **用户系统**: 实现认证和授权
4. **微服务**: 拆分为独立服务
5. **容器化**: Docker部署
6. **CI/CD**: 自动化部署流程
