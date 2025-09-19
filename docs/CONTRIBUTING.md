# 🤝 贡献指南

欢迎参与 Caustic Lens Designer 项目！我们非常感谢社区的每一份贡献，无论是代码、文档、设计还是反馈建议。

## 📋 目录

- [快速开始](#快速开始)
- [贡献方式](#贡献方式)
- [开发环境设置](#开发环境设置)
- [代码规范](#代码规范)
- [提交流程](#提交流程)
- [问题报告](#问题报告)
- [功能建议](#功能建议)
- [文档贡献](#文档贡献)
- [社区准则](#社区准则)

## 🚀 快速开始

### 1. Fork 项目

点击 GitHub 页面右上角的 "Fork" 按钮，将项目复制到你的账户下。

### 2. 克隆仓库

```bash
git clone https://github.com/YOUR_USERNAME/caustic_lens.git
cd caustic_lens
```

### 3. 添加上游仓库

```bash
git remote add upstream https://github.com/asmoyou/caustic_lens.git
```

### 4. 创建开发分支

```bash
git checkout -b feature/your-feature-name
```

## 🎯 贡献方式

### 🐛 Bug 修复
- 修复已知问题
- 改进错误处理
- 提升系统稳定性

### ✨ 新功能开发
- 实现新的算法
- 添加用户界面功能
- 扩展导出格式支持

### 📚 文档改进
- 完善 API 文档
- 添加使用教程
- 翻译文档

### 🎨 设计优化
- 改进用户界面
- 优化用户体验
- 设计图标和插图

### 🧪 测试贡献
- 编写单元测试
- 添加集成测试
- 性能测试

## 🛠️ 开发环境设置

### 环境要求

- **Node.js**: >= 16.0.0 (推荐 18.x LTS)
- **npm**: >= 7.0.0
- **Git**: 最新版本
- **现代浏览器**: 支持 WebGL 2.0

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 在浏览器中访问
# http://localhost:5173
```

### Docker 开发环境

```bash
# 启动开发环境
docker-compose -f docker-compose.dev.yaml up -d

# 进入开发容器
docker exec -it caustic-lens-dev sh
```

### 项目结构

```
src/
├── algorithms/          # 核心算法模块
│   ├── causticEngine.ts      # 主引擎
│   ├── causticsEngineering/  # 焦散工程算法
│   └── imageProcessing/      # 图像处理
├── components/          # React 组件
│   ├── controls/        # 控制面板
│   ├── export/          # 导出功能
│   ├── progress/        # 进度显示
│   ├── report/          # 报告生成
│   ├── test/            # 测试组件
│   ├── upload/          # 文件上传
│   └── viewer/          # 3D 查看器
├── pages/               # 页面组件
├── stores/              # 状态管理
├── styles/              # 样式文件
├── test/                # 测试文件
├── types/               # TypeScript 类型
└── utils/               # 工具函数
```

## 📝 代码规范

### TypeScript 规范

```typescript
// ✅ 好的示例
interface CausticParameters {
  focalLength: number;
  resolution: number;
  material: string;
}

class CausticEngine {
  private parameters: CausticParameters;
  
  constructor(parameters: CausticParameters) {
    this.parameters = parameters;
  }
  
  public async generateLens(): Promise<LensGeometry> {
    // 实现逻辑
  }
}

// ❌ 避免的写法
var engine; // 使用 const/let
function process(data) { // 缺少类型注解
  return data.map(x => x * 2); // 缺少明确的类型
}
```

### React 组件规范

```typescript
// ✅ 推荐的组件写法
interface LensViewerProps {
  geometry?: LensGeometry;
  parameters: CausticParameters;
  onParameterChange?: (params: CausticParameters) => void;
}

const LensViewer: React.FC<LensViewerProps> = ({
  geometry,
  parameters,
  onParameterChange
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // 副作用逻辑
  }, [parameters]);
  
  return (
    <div className="lens-viewer">
      {/* JSX 内容 */}
    </div>
  );
};

export default LensViewer;
```

### 命名规范

- **文件名**: 使用 PascalCase (如 `LensViewer.tsx`)
- **组件名**: 使用 PascalCase (如 `LensViewer`)
- **函数名**: 使用 camelCase (如 `generateLens`)
- **变量名**: 使用 camelCase (如 `focalLength`)
- **常量名**: 使用 UPPER_SNAKE_CASE (如 `DEFAULT_FOCAL_LENGTH`)
- **接口名**: 使用 PascalCase (如 `CausticParameters`)

### 注释规范

```typescript
/**
 * 生成焦散透镜几何体
 * @param targetShape 目标形状数据
 * @param onProgress 进度回调函数
 * @param options 可选配置参数
 * @returns Promise<LensGeometry> 生成的透镜几何体
 * @throws {CausticAlgorithmError} 当算法执行失败时抛出
 */
async generateLensGeometry(
  targetShape: number[][],
  onProgress?: (progress: number, status: string) => void,
  options?: GenerationOptions
): Promise<LensGeometry> {
  // 实现逻辑
}
```

## 🔄 提交流程

### 1. 保持代码同步

```bash
# 获取最新代码
git fetch upstream
git checkout main
git merge upstream/main
```

### 2. 创建功能分支

```bash
git checkout -b feature/your-feature-name
```

### 3. 开发和测试

```bash
# 运行测试
npm run test

# 代码检查
npm run lint

# 类型检查
npm run type-check

# 构建检查
npm run build
```

### 4. 提交代码

```bash
git add .
git commit -m "feat: add new caustic algorithm"
```

### 5. 推送分支

```bash
git push origin feature/your-feature-name
```

### 6. 创建 Pull Request

在 GitHub 上创建 Pull Request，填写详细的描述信息。

## 📝 提交信息规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
type(scope): description

[optional body]

[optional footer]
```

### 提交类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具变动
- `ci`: CI/CD 相关

### 示例

```bash
# 新功能
git commit -m "feat(algorithm): add GPU-accelerated ray tracing"

# Bug 修复
git commit -m "fix(viewer): resolve infinite recursion in useCallback"

# 文档更新
git commit -m "docs(api): add comprehensive API documentation"

# 重构
git commit -m "refactor(components): extract common hooks"
```

## 🐛 问题报告

### 报告 Bug

在提交 Issue 前，请：

1. **搜索现有 Issues** - 避免重复报告
2. **使用最新版本** - 确认问题在最新版本中仍然存在
3. **提供详细信息** - 使用 Issue 模板

### Bug 报告模板

```markdown
## Bug 描述
简要描述遇到的问题

## 复现步骤
1. 打开应用
2. 点击 '...'
3. 输入 '...'
4. 看到错误

## 期望行为
描述你期望发生的情况

## 实际行为
描述实际发生的情况

## 环境信息
- 操作系统: [如 Windows 11]
- 浏览器: [如 Chrome 120]
- Node.js 版本: [如 18.17.0]
- 项目版本: [如 v1.0.0]

## 附加信息
- 错误截图
- 控制台日志
- 相关配置文件
```

## 💡 功能建议

### 提出新功能

1. **在 Discussions 中讨论** - 先在社区讨论想法
2. **创建 Feature Request** - 使用 Issue 模板
3. **详细描述用例** - 说明功能的使用场景

### 功能建议模板

```markdown
## 功能描述
简要描述建议的新功能

## 问题背景
描述当前存在的问题或需求

## 解决方案
详细描述建议的解决方案

## 替代方案
描述考虑过的其他解决方案

## 用例场景
- 场景1: ...
- 场景2: ...

## 实现考虑
- 技术难点
- 性能影响
- 兼容性考虑
```

## 📚 文档贡献

### 文档类型

- **API 文档** - 接口和函数说明
- **用户指南** - 使用教程和示例
- **开发文档** - 开发环境和架构说明
- **部署文档** - 部署和运维指南

### 文档规范

```markdown
# 标题使用 H1
## 主要章节使用 H2
### 子章节使用 H3

- 使用清晰的列表
- 提供代码示例
- 添加适当的链接

```typescript
// 代码块要有语言标识
const example = "示例代码";
```

**重要信息使用粗体**
*强调内容使用斜体*
`代码片段使用反引号`
```

## 🧪 测试指南

### 测试类型

- **单元测试** - 测试单个函数或组件
- **集成测试** - 测试组件间交互
- **端到端测试** - 测试完整用户流程

### 编写测试

```typescript
// 单元测试示例
import { CausticEngine } from '../algorithms/causticEngine';

describe('CausticEngine', () => {
  let engine: CausticEngine;
  
  beforeEach(() => {
    engine = new CausticEngine(mockParameters);
  });
  
  it('should generate lens geometry', async () => {
    const result = await engine.generateLensGeometry(mockTargetShape);
    expect(result).toBeDefined();
    expect(result.vertices).toHaveLength(expectedVertexCount);
  });
  
  it('should handle invalid input', () => {
    expect(() => {
      engine.generateLensGeometry([]);
    }).toThrow('Invalid target shape');
  });
});
```

### 运行测试

```bash
# 运行所有测试
npm run test

# 运行特定测试文件
npm run test -- CausticEngine.test.ts

# 生成覆盖率报告
npm run test:coverage

# 监听模式
npm run test:watch
```

## 🎨 设计贡献

### UI/UX 改进

- **用户界面设计** - 改进组件外观和布局
- **用户体验优化** - 简化操作流程
- **响应式设计** - 适配不同设备
- **无障碍设计** - 提升可访问性

### 设计资源

- **颜色方案** - 使用项目调色板
- **图标库** - 使用 Ant Design 图标
- **字体** - 使用系统字体栈
- **间距** - 遵循 8px 网格系统

## 🌍 国际化

### 添加新语言

1. 在 `src/locales/` 目录下创建语言文件
2. 翻译所有文本内容
3. 更新语言选择器
4. 测试新语言的显示效果

### 翻译规范

```json
{
  "common": {
    "save": "保存",
    "cancel": "取消",
    "confirm": "确认"
  },
  "lens": {
    "focalLength": "焦距",
    "material": "材料",
    "generate": "生成透镜"
  }
}
```

## 🚀 性能优化

### 优化建议

- **代码分割** - 使用动态导入
- **懒加载** - 延迟加载非关键组件
- **缓存策略** - 合理使用缓存
- **算法优化** - 改进计算效率

### 性能测试

```typescript
// 性能测试示例
import { performance } from 'perf_hooks';

describe('Performance Tests', () => {
  it('should generate lens within time limit', async () => {
    const start = performance.now();
    await engine.generateLensGeometry(targetShape);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(30000); // 30秒内完成
  });
});
```

## 🔒 安全考虑

### 安全最佳实践

- **输入验证** - 验证所有用户输入
- **错误处理** - 不暴露敏感信息
- **依赖管理** - 定期更新依赖包
- **代码审查** - 仔细审查安全相关代码

## 📋 Pull Request 检查清单

在提交 PR 前，请确认：

- [ ] 代码遵循项目规范
- [ ] 添加了必要的测试
- [ ] 测试全部通过
- [ ] 文档已更新
- [ ] 提交信息符合规范
- [ ] 没有合并冲突
- [ ] 功能完整且稳定

## 🏆 贡献者认可

我们会在以下方式认可贡献者：

- **README 贡献者列表** - 列出所有贡献者
- **Release Notes** - 感谢重要贡献
- **社区展示** - 在社交媒体展示优秀贡献
- **特殊徽章** - 为活跃贡献者提供徽章

## 📞 获得帮助

如果你在贡献过程中遇到问题：

- **GitHub Discussions** - 提问和讨论
- **Issue 标签** - 查找 `good first issue` 和 `help wanted`
- **代码审查** - 在 PR 中请求帮助
- **社区聊天** - 加入开发者交流群

## 🤝 社区准则

### 行为准则

我们致力于创建一个友好、包容的社区环境：

- **尊重他人** - 尊重不同观点和经验
- **建设性反馈** - 提供有帮助的建议
- **协作精神** - 乐于分享和学习
- **专业态度** - 保持专业和礼貌

### 不当行为

以下行为不被接受：

- 人身攻击或侮辱
- 骚扰或歧视
- 发布不当内容
- 恶意破坏或垃圾信息

## 📄 许可证

通过贡献代码，你同意你的贡献将在 MIT 许可证下发布。

## 🙏 致谢

感谢所有为项目做出贡献的开发者、设计师、测试者和用户！你们的参与让这个项目变得更好。

---

**开始贡献吧！** 🚀

无论你是经验丰富的开发者还是初学者，我们都欢迎你的参与。每一个贡献都很重要，让我们一起打造更好的 Caustic Lens Designer！