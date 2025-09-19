# 🛠️ 开发指南

本文档提供了 Caustic Lens Designer 项目的详细开发、安装和使用说明。

## 📋 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [开发环境设置](#开发环境设置)
- [Docker 部署](#docker-部署)
- [项目结构](#项目结构)
- [开发工作流](#开发工作流)
- [测试](#测试)
- [构建和部署](#构建和部署)
- [故障排除](#故障排除)

## 🔧 环境要求

### 基础要求
- **Node.js**: >= 16.0.0 (推荐使用 18.x LTS)
- **npm**: >= 7.0.0 (或 yarn >= 1.22.0)
- **Git**: >= 2.20.0

### 推荐开发工具
- **IDE**: Visual Studio Code
- **浏览器**: Chrome/Firefox (支持 WebGL 2.0)
- **Docker**: >= 20.10.0 (可选，用于容器化部署)

### 系统要求
- **内存**: 至少 4GB RAM
- **显卡**: 支持 WebGL 2.0 的现代显卡
- **操作系统**: Windows 10+, macOS 10.15+, Ubuntu 18.04+

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/caustic_lens.git
cd caustic_lens
```

### 2. 安装依赖

```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install
```

### 3. 启动开发服务器

```bash
# 使用 npm
npm run dev

# 或使用 yarn
yarn dev
```

### 4. 访问应用

打开浏览器访问 [http://localhost:5173](http://localhost:5173)

## 🔨 开发环境设置

### VS Code 扩展推荐

在项目根目录创建 `.vscode/extensions.json`：

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### 环境变量配置

创建 `.env.local` 文件（可选）：

```env
# 开发环境配置
VITE_APP_TITLE=Caustic Lens Designer
VITE_APP_VERSION=1.0.0

# API 配置（如果有后端服务）
# VITE_API_BASE_URL=http://localhost:3001

# 调试模式
VITE_DEBUG_MODE=true
```

### 代码规范配置

项目已配置 ESLint 和 Prettier，确保代码质量：

```bash
# 检查代码规范
npm run lint

# 自动修复代码格式
npm run lint:fix
```

## 🐳 Docker 部署

### 生产环境部署

```bash
# 构建并启动生产环境
docker-compose up -d

# 查看日志
docker-compose logs -f caustic-lens

# 停止服务
docker-compose down
```

### 开发环境部署

```bash
# 使用开发环境配置
docker-compose -f docker-compose.dev.yaml up -d

# 进入开发容器
docker exec -it caustic-lens-dev sh
```

### Docker 命令参考

```bash
# 重新构建镜像
docker-compose build --no-cache

# 查看容器状态
docker-compose ps

# 查看资源使用情况
docker stats caustic-lens-app

# 清理未使用的镜像
docker image prune -f
```

## 📁 项目结构详解

```
caustic_lens/
├── public/                 # 静态资源
│   └── vite.svg           # 网站图标
├── src/
│   ├── algorithms/        # 核心算法模块
│   │   ├── causticEngine.ts      # 焦散计算引擎
│   │   ├── causticsEngineering/  # 焦散工程算法
│   │   └── imageProcessing/      # 图像处理算法
│   ├── components/        # React 组件
│   │   ├── controls/      # 参数控制组件
│   │   ├── export/        # 导出功能组件
│   │   ├── progress/      # 进度显示组件
│   │   ├── report/        # 报告生成组件
│   │   ├── test/          # 测试组件
│   │   ├── upload/        # 文件上传组件
│   │   └── viewer/        # 3D 查看器组件
│   ├── pages/             # 页面组件
│   │   └── DiagnosticPage.tsx    # 诊断页面
│   ├── stores/            # 状态管理
│   │   └── projectStore.ts       # 项目状态存储
│   ├── styles/            # 样式文件
│   │   ├── custom.css     # 自定义样式
│   │   └── global.css     # 全局样式
│   ├── test/              # 测试文件
│   ├── types/             # TypeScript 类型定义
│   ├── utils/             # 工具函数
│   ├── App.tsx            # 主应用组件
│   └── main.tsx           # 应用入口
├── docker-compose.yaml    # Docker 生产环境配置
├── docker-compose.dev.yaml # Docker 开发环境配置
├── Dockerfile             # 生产环境镜像
├── Dockerfile.dev         # 开发环境镜像
├── nginx.conf             # Nginx 配置
├── package.json           # 项目依赖配置
├── tsconfig.json          # TypeScript 配置
├── vite.config.ts         # Vite 构建配置
└── tailwind.config.js     # Tailwind CSS 配置
```

## 🔄 开发工作流

### 1. 功能开发流程

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发功能
# 编写代码...

# 3. 运行测试
npm run test

# 4. 检查代码规范
npm run lint

# 5. 提交代码
git add .
git commit -m "feat: add new feature"

# 6. 推送分支
git push origin feature/new-feature
```

### 2. 代码提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建过程或辅助工具的变动
```

### 3. 分支管理策略

- `main`: 主分支，保持稳定
- `develop`: 开发分支
- `feature/*`: 功能分支
- `hotfix/*`: 热修复分支
- `release/*`: 发布分支

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
npm run test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式运行测试
npm run test:watch
```

### 测试文件结构

```
src/
├── __tests__/             # 全局测试
├── components/
│   └── __tests__/         # 组件测试
└── algorithms/
    └── __tests__/         # 算法测试
```

## 🏗️ 构建和部署

### 本地构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 生产部署

```bash
# 使用 Docker 部署
docker-compose up -d

# 或直接部署构建产物
npm run build
# 将 dist/ 目录部署到 Web 服务器
```

### 性能优化

- **代码分割**: 使用动态导入分割代码
- **资源压缩**: Vite 自动压缩资源
- **缓存策略**: 配置适当的缓存头
- **CDN**: 使用 CDN 加速静态资源

## 🔧 故障排除

### 常见问题

#### 1. 依赖安装失败

```bash
# 清除缓存重新安装
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### 2. 端口被占用

```bash
# 查找占用端口的进程
netstat -ano | findstr :5173

# 或使用不同端口
npm run dev -- --port 3000
```

#### 3. WebGL 相关错误

- 确保浏览器支持 WebGL 2.0
- 更新显卡驱动
- 检查硬件加速是否启用

#### 4. Docker 构建失败

```bash
# 清理 Docker 缓存
docker system prune -f

# 重新构建镜像
docker-compose build --no-cache
```

### 调试技巧

1. **使用浏览器开发者工具**
   - Console 查看错误信息
   - Network 检查资源加载
   - Performance 分析性能

2. **启用调试模式**
   ```env
   VITE_DEBUG_MODE=true
   ```

3. **查看详细日志**
   ```bash
   npm run dev -- --debug
   ```

## 📞 获取帮助

- **文档**: 查看项目 README.md
- **Issues**: [GitHub Issues](https://github.com/your-username/caustic_lens/issues)
- **讨论**: [GitHub Discussions](https://github.com/your-username/caustic_lens/discussions)

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

详细贡献指南请参考 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

📝 **注意**: 本文档会随着项目发展持续更新，请定期查看最新版本。