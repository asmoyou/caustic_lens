# 🔍 Caustic Lens Designer

一个基于 React + Three.js 的交互式焦散透镜设计工具，能够根据目标图像生成相应的透镜几何体，实现光影艺术创作。

## ✨ 功能特性

### 🎨 核心功能
- **图像上传与预处理** - 支持多种图像格式，自动优化处理
- **实时3D预览** - 基于 Three.js 的高质量3D渲染
- **焦散效果模拟** - 真实的光线追踪和折射计算
- **透镜参数调节** - 直观的参数面板，实时调整透镜属性
- **多材料支持** - 亚克力、玻璃、聚碳酸酯等多种材料选择

### 🔧 技术特性
- **逆向光线追踪算法** - 从目标图案反推透镜表面形状
- **几何优化引擎** - 自动优化透镜表面以获得最佳效果
- **实时渲染** - 流畅的3D交互和参数调整
- **专业报告生成** - 详细的设计报告和技术参数
- **多格式导出** - 支持 STL、OBJ 等3D打印格式

## 🚀 快速开始

### 方式一：Docker 部署（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/asmoyou/caustic_lens.git
cd caustic_lens

# 2. 使用 Docker Compose 启动
docker-compose up -d

# 3. 访问应用
# http://localhost:3000
```

### 方式二：本地开发

#### 环境要求
- **Node.js**: >= 16.0.0 (推荐 18.x LTS)
- **npm**: >= 7.0.0
- **现代浏览器**: 支持 WebGL 2.0

#### 安装和启动
```bash
# 1. 克隆项目
git clone https://github.com/asmoyou/caustic_lens.git
cd caustic_lens

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 访问应用
# http://localhost:5173
```

#### 构建生产版本
```bash
npm run build
npm run preview  # 预览构建结果
```

## 🎯 使用指南

### 1. 上传目标图像
- 点击上传区域选择图像文件
- 支持 JPG、PNG、GIF 等常见格式
- 建议使用高对比度的黑白图像以获得最佳效果

### 2. 调整透镜参数
- **尺寸设置**: 调整透镜的宽度和高度
- **光学参数**: 设置焦距、折射率、目标距离
- **材料选择**: 选择合适的透镜材料
- **优化设置**: 配置算法参数以获得最佳结果

### 3. 预览和优化
- 实时查看3D透镜模型
- 观察焦散投影效果
- 调整参数直到满意

### 4. 导出结果
- 生成详细的设计报告
- 导出3D模型文件用于制造
- 保存项目配置以便后续修改

## 🐳 Docker 部署

### 生产环境部署

```bash
# 启动生产环境
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f caustic-lens

# 停止服务
docker-compose down
```

### 开发环境部署

```bash
# 启动开发环境（支持热重载）
docker-compose -f docker-compose.dev.yaml up -d

# 进入开发容器
docker exec -it caustic-lens-dev sh
```

### 自定义配置

可以通过环境变量自定义配置：

```bash
# 自定义端口
PORT=8080 docker-compose up -d

# 或修改 docker-compose.yaml 中的端口映射
ports:
  - "8080:80"
```

## 📚 详细文档

- **[开发指南](DEVELOPMENT.md)** - 详细的开发环境设置和工作流程
- **[部署指南](DEPLOYMENT.md)** - 各种部署方式和生产环境配置
- **[API 文档](docs/API.md)** - 核心算法和组件 API
- **[贡献指南](CONTRIBUTING.md)** - 如何参与项目开发

## 🏗️ 技术架构

### 前端技术栈
- **React 18** - 现代化的用户界面框架
- **TypeScript** - 类型安全的开发体验
- **Three.js** - 强大的3D图形渲染引擎
- **React Three Fiber** - React 的 Three.js 集成
- **Ant Design** - 企业级UI组件库
- **Zustand** - 轻量级状态管理
- **Vite** - 快速的构建工具

### 核心算法
- **逆向光线追踪** - 从目标图案计算透镜形状
- **几何优化** - 梯度下降算法优化表面形状
- **光学模拟** - 真实的折射和焦散计算
- **网格生成** - 高质量的3D几何体生成

## 📁 项目结构

```
src/
├── algorithms/          # 核心算法
│   ├── causticEngine/   # 焦散计算引擎
│   ├── geometryGeneration/ # 几何生成
│   └── imageProcessing/ # 图像处理
├── components/          # React 组件
│   ├── controls/        # 参数控制面板
│   ├── export/          # 导出功能
│   ├── report/          # 报告生成
│   ├── upload/          # 文件上传
│   └── viewer/          # 3D 查看器
├── stores/              # 状态管理
├── types/               # TypeScript 类型定义
└── utils/               # 工具函数
```

## 🎨 应用场景

### 艺术创作
- 光影装置艺术
- 建筑装饰照明
- 展览展示设计
- 创意灯具设计

### 工业应用
- 光学器件设计
- 照明系统优化
- 激光加工应用
- 科研教学演示

## 🔬 算法原理

本项目采用逆向光线追踪算法，主要步骤包括：

1. **图像预处理** - 边缘检测、噪声过滤、亮度归一化
2. **光线追踪** - 模拟光线通过透镜的折射过程
3. **表面优化** - 使用梯度下降算法优化透镜表面形状
4. **几何生成** - 生成高质量的3D网格模型
5. **效果验证** - 实时计算和显示焦散效果

## ⚠️ 已知问题

目前项目存在以下两个功能问题，诚邀有识之士一起完善：

### 🔧 STEP模型导出问题
- **问题描述**: 导出的STEP格式3D模型文件存在格式或几何体转换问题
- **影响范围**: 影响用户将设计导出到CAD软件进行进一步处理
- **技术难点**: 需要完善Three.js几何体到STEP格式的转换算法
- **寻求帮助**: 熟悉CAD文件格式转换、OpenCASCADE或相关3D几何处理的开发者

### 🌊 焦散投影仿真问题  
- **问题描述**: 焦散投影仿真计算存在稳定性和准确性问题
- **影响范围**: 核心功能，影响透镜设计效果的预览和验证
- **技术难点**: 光线追踪算法优化、数值计算稳定性、渲染性能优化
- **寻求帮助**: 具备光学仿真、计算机图形学、数值计算背景的开发者

如果您在这些领域有经验并愿意贡献，请通过Issue或Discussion与我们联系！

## 🤝 贡献指南

我们欢迎所有形式的贡献！无论是报告 bug、提出新功能建议，还是提交代码改进。

### 🐛 报告问题

在提交 Issue 前，请：
1. 搜索现有 Issues，避免重复
2. 使用 Issue 模板
3. 提供详细的复现步骤
4. 包含系统信息和错误日志

### 💡 功能建议

1. 在 [Discussions](https://github.com/asmoyou/caustic_lens/discussions) 中讨论想法
2. 创建 Feature Request Issue
3. 详细描述用例和预期行为

### 🔧 代码贡献

#### 开发流程
1. **Fork 项目** - 点击右上角 Fork 按钮
2. **克隆仓库**
   ```bash
   git clone https://github.com/asmoyou/caustic_lens.git
   cd caustic_lens
   ```
3. **创建分支**
   ```bash
   git checkout -b feature/amazing-feature
   ```
4. **开发和测试**
   ```bash
   npm install
   npm run dev
   npm run test
   npm run lint
   ```
5. **提交代码**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```
6. **推送分支**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **创建 Pull Request**

#### 代码规范
- **TypeScript**: 使用严格的类型检查
- **ESLint**: 遵循项目 ESLint 配置
- **Prettier**: 统一代码格式
- **提交信息**: 使用 [Conventional Commits](https://www.conventionalcommits.org/)
- **测试**: 为新功能添加测试
- **文档**: 更新相关文档

#### 提交信息格式
```
type(scope): description

[optional body]

[optional footer]
```

类型说明：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具变动

### 📋 开发环境设置

详细的开发环境设置请参考 [开发指南](DEVELOPMENT.md)。

### 🧪 测试

```bash
# 运行所有测试
npm run test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式运行测试
npm run test:watch
```

### 📝 文档贡献

- 改进现有文档
- 添加使用示例
- 翻译文档到其他语言
- 录制教程视频

### 🎨 设计贡献

- UI/UX 改进建议
- 图标和插图设计
- 用户体验优化

### 💬 社区参与

- 回答社区问题
- 参与讨论
- 分享使用经验
- 推广项目

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Three.js](https://threejs.org/) - 强大的3D图形库
- [React Three Fiber](https://github.com/pmndrs/react-three-fiber) - React 的 Three.js 集成
- [Ant Design](https://ant.design/) - 优秀的UI组件库
- 所有为开源社区做出贡献的开发者们

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 [GitHub Issue](https://github.com/asmoyou/caustic_lens/issues)
- 发送邮件至项目维护者

---

⭐ 如果这个项目对您有帮助，请给我们一个 Star！
