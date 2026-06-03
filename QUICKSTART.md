# 快速启动指南

## 第一次使用

### 1. 安装依赖

**Windows用户:**
```bash
# 后端
cd backend
npm install

# 前端
cd ../frontend
npm install
```

**Linux/Mac用户:**
```bash
# 后端
cd backend
npm install

# 前端
cd ../frontend
npm install
```

### 2. 配置环境变量（可选）

**后端配置:**
```bash
cd backend
cp .env.example .env
# 编辑 .env 文件，配置数据源token等
```

### 3. 启动服务

**方式一：使用启动脚本（推荐）**

Windows:
```bash
start.bat
```

Linux/Mac:
```bash
chmod +x start.sh
./start.sh
```

**方式二：手动启动**

打开两个终端窗口：

终端1 - 启动后端:
```bash
cd backend
npm run dev
```

终端2 - 启动前端:
```bash
cd frontend
npm run dev
```

### 4. 访问应用

打开浏览器访问: http://localhost:3000

## 使用说明

### 搜索股票/期货
1. 点击左侧面板的"A股"或"期货"标签
2. 在搜索框输入代码或名称
3. 点击搜索结果选择品种

### 切换时间周期
使用顶部工具栏的周期按钮切换（1分、5分、15分、30分、60分、日线、周线、月线）

### 添加技术指标
1. 在右侧指标面板勾选需要的指标
2. 可以调整指标参数
3. 指标会实时显示在图表上

### 复权设置（仅A股）
使用顶部工具栏的复权按钮选择：
- 不复权：显示真实历史价格
- 前复权：以当前价格为基准
- 后复权：以上市价格为基准

## 常见问题

### Q: 端口被占用怎么办？
A: 修改配置文件中的端口：
- 后端: `backend/.env` 中的 `PORT`
- 前端: `frontend/vite.config.js` 中的 `server.port`

### Q: 数据加载失败？
A: 
1. 确认后端服务已启动（http://localhost:3001/health 应该返回正常）
2. 检查浏览器控制台是否有错误信息
3. 当前使用模拟数据，如需真实数据请配置数据源

### Q: 图表不显示？
A: 
1. 确保使用现代浏览器（Chrome/Firefox/Edge最新版）
2. 清除浏览器缓存
3. 检查浏览器控制台是否有JavaScript错误

### Q: 如何获取真实数据？
A: 
1. 注册 Tushare Pro 账号获取token
2. 在 `backend/.env` 中配置 `TUSHARE_TOKEN`
3. 修改 `backend/src/services/stockService.js` 对接真实API

## 技术支持

如遇到问题，请查看：
- 后端README: `backend/README.md`
- 前端README: `frontend/README.md`
- 项目README: `README.md`

## 下一步

- 探索更多技术指标
- 尝试不同的时间周期
- 对接真实数据源
- 添加自选股功能
