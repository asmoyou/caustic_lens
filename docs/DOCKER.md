# Docker 部署指南

## 自动构建的Docker镜像

本项目通过GitHub Actions自动构建并发布Docker镜像到GitHub Container Registry (GHCR)。

### 镜像标签策略

- `latest` - 主分支最新版本
- `v1.0.0` - 语义化版本标签
- `main-abc1234` - 分支名+commit SHA
- `pr-123` - Pull Request构建

### 使用预构建镜像

#### 1. 从GHCR拉取镜像

```bash
# 拉取最新版本
docker pull ghcr.io/asmoyou/caustic_lens:latest

# 拉取特定版本
docker pull ghcr.io/asmoyou/caustic_lens:v1.0.0
```

#### 2. 运行容器

```bash
# 简单运行
docker run -d -p 3000:80 ghcr.io/asmoyou/caustic_lens:latest

# 使用docker-compose
docker-compose up -d
```

#### 3. 访问应用

打开浏览器访问 `http://localhost:3000`

### 本地构建

如果需要本地构建镜像：

```bash
# 构建生产镜像
docker build -t caustic-lens .

# 构建开发镜像
docker build -f Dockerfile.dev -t caustic-lens:dev .

# 使用docker-compose构建
docker-compose build
```

### 多平台支持

镜像支持以下平台：
- `linux/amd64` (x86_64)
- `linux/arm64` (ARM64/Apple Silicon)

### 环境变量

| 变量名 | 默认值 | 描述 |
|--------|--------|------|
| `NODE_ENV` | `production` | 运行环境 |

### 健康检查

容器包含健康检查端点：
- 检查间隔：30秒
- 超时时间：3秒
- 重试次数：3次
- 检查URL：`http://localhost/`

### 故障排除

#### 1. 容器无法启动

```bash
# 查看容器日志
docker logs <container-id>

# 检查容器状态
docker ps -a
```

#### 2. 端口冲突

```bash
# 使用不同端口
docker run -d -p 8080:80 ghcr.io/asmoyou/caustic_lens:latest
```

#### 3. 权限问题

确保Docker有足够权限访问GHCR：

```bash
# 登录GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### 开发环境

使用开发版本的docker-compose：

```bash
# 启动开发环境
docker-compose -f docker-compose.dev.yaml up -d

# 查看日志
docker-compose -f docker-compose.dev.yaml logs -f
```

### 生产部署

推荐的生产部署配置：

```yaml
version: '3.8'
services:
  caustic-lens:
    image: ghcr.io/asmoyou/caustic_lens:latest
    container_name: caustic-lens-prod
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 更新镜像

```bash
# 拉取最新镜像
docker pull ghcr.io/asmoyou/caustic_lens:latest

# 重启容器
docker-compose down && docker-compose up -d
```