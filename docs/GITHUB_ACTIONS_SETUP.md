# GitHub Actions 自动发布 Docker 镜像设置指南

## 概述

本项目配置了自动化的CI/CD流水线，可以：
- 自动构建Docker镜像
- 发布到GitHub Container Registry (GHCR)
- 支持多平台构建 (AMD64/ARM64)
- 自动标签管理
- 部署到GitHub Pages

## 设置步骤

### 1. 启用GitHub Container Registry

1. 进入GitHub仓库设置
2. 导航到 `Settings` > `Actions` > `General`
3. 在 "Workflow permissions" 部分选择 "Read and write permissions"
4. 勾选 "Allow GitHub Actions to create and approve pull requests"

### 2. 配置包权限

1. 进入 `Settings` > `Actions` > `General`
2. 确保 "Workflow permissions" 设置为 "Read and write permissions"
3. 这允许Actions写入到GitHub Container Registry

### 3. 工作流文件说明

#### `docker-publish.yml` - 主要发布工作流
- **触发条件**: 推送到main/master分支，创建标签，PR
- **功能**: 构建并发布Docker镜像到GHCR
- **平台**: linux/amd64, linux/arm64
- **缓存**: 使用GitHub Actions缓存加速构建

#### `docker-test.yml` - 测试工作流
- **触发条件**: 手动触发，Docker相关文件变更的PR
- **功能**: 测试Docker构建和容器运行
- **用途**: 验证配置正确性

#### `deploy.yml` - GitHub Pages部署
- **触发条件**: 推送到main/master分支
- **功能**: 构建并部署到GitHub Pages

### 4. 镜像标签策略

| 触发事件 | 生成的标签 | 示例 |
|----------|------------|------|
| 推送到main分支 | `latest`, `main-<sha>` | `latest`, `main-abc1234` |
| 创建版本标签 | `v1.0.0`, `1.0`, `1` | `v1.2.3`, `1.2`, `1` |
| Pull Request | `pr-<number>` | `pr-123` |
| 其他分支 | `<branch>-<sha>` | `feature-abc1234` |

### 5. 使用发布的镜像

#### 拉取镜像
```bash
# 最新版本
docker pull ghcr.io/asmoyou/caustic_lens:latest

# 特定版本
docker pull ghcr.io/asmoyou/caustic_lens:v1.0.0
```

#### 运行容器
```bash
# 直接运行
docker run -d -p 3000:80 ghcr.io/asmoyou/caustic_lens:latest

# 使用docker-compose
docker-compose up -d
```

### 6. 版本发布流程

#### 创建新版本
```bash
# 创建并推送标签
git tag v1.0.0
git push origin v1.0.0
```

这将自动触发：
1. Docker镜像构建
2. 发布到GHCR
3. 创建多个版本标签

#### 查看构建状态
1. 进入GitHub仓库的 "Actions" 标签页
2. 查看工作流运行状态
3. 点击具体的运行查看详细日志

### 7. 故障排除

#### 权限错误
```
Error: failed to solve: failed to push ghcr.io/user/repo:latest: insufficient_scope
```

**解决方案**:
1. 检查仓库的Actions权限设置
2. 确保启用了 "Read and write permissions"

#### 构建失败
```
Error: buildx failed with: ERROR: failed to solve: process "/bin/sh -c npm ci" didn't complete successfully
```

**解决方案**:
1. 检查package.json和package-lock.json
2. 确保Dockerfile中的Node.js版本正确
3. 查看详细的构建日志

#### 多平台构建问题
```
Error: multiple platforms feature is currently not supported for docker driver
```

**解决方案**:
- 工作流已配置使用 `docker/setup-buildx-action@v3`
- 这会自动设置支持多平台构建的buildx

### 8. 高级配置

#### 自定义构建参数
在 `docker-publish.yml` 中添加构建参数：

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: .
    platforms: linux/amd64,linux/arm64
    push: ${{ github.event_name != 'pull_request' }}
    tags: ${{ steps.meta.outputs.tags }}
    labels: ${{ steps.meta.outputs.labels }}
    build-args: |
      NODE_ENV=production
      BUILD_DATE=${{ github.event.head_commit.timestamp }}
```

#### 添加安全扫描
```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
    format: 'sarif'
    output: 'trivy-results.sarif'
```

### 9. 监控和维护

#### 查看已发布的镜像
1. 进入GitHub仓库主页
2. 点击右侧的 "Packages" 链接
3. 查看所有已发布的镜像版本

#### 清理旧镜像
GitHub会自动保留一定数量的镜像版本，但可以手动删除不需要的版本。

#### 更新工作流
定期更新Actions版本：
- `actions/checkout@v4`
- `docker/setup-buildx-action@v3`
- `docker/build-push-action@v5`

### 10. 安全最佳实践

1. **不要在代码中硬编码敏感信息**
2. **使用GitHub Secrets存储敏感数据**
3. **定期更新依赖和Actions版本**
4. **启用Dependabot自动更新**
5. **使用镜像签名和验证**

## 总结

配置完成后，每次推送代码到main分支或创建版本标签时，都会自动：
1. 构建Docker镜像
2. 发布到GitHub Container Registry
3. 支持多平台架构
4. 自动生成合适的标签

这样就实现了完全自动化的Docker镜像发布流程！