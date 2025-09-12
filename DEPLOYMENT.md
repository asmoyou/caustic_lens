# 🚀 部署指南

本文档详细说明了 Caustic Lens Designer 的各种部署方式和配置选项。

## 📋 目录

- [部署方式概览](#部署方式概览)
- [Docker 部署](#docker-部署)
- [传统部署](#传统部署)
- [云平台部署](#云平台部署)
- [性能优化](#性能优化)
- [监控和日志](#监控和日志)
- [安全配置](#安全配置)
- [故障排除](#故障排除)

## 🎯 部署方式概览

| 部署方式 | 适用场景 | 复杂度 | 推荐指数 |
|---------|---------|--------|----------|
| Docker Compose | 单机部署、开发测试 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 静态文件部署 | CDN、静态托管 | ⭐ | ⭐⭐⭐⭐ |
| Kubernetes | 大规模生产环境 | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 云平台托管 | 快速上线 | ⭐ | ⭐⭐⭐⭐ |

## 🐳 Docker 部署

### 快速部署

```bash
# 1. 克隆项目
git clone https://github.com/your-username/caustic_lens.git
cd caustic_lens

# 2. 启动服务
docker-compose up -d

# 3. 访问应用
# http://localhost:3000
```

### 生产环境配置

#### 1. 环境变量配置

创建 `.env.production` 文件：

```env
# 应用配置
APP_ENV=production
APP_PORT=3000
APP_HOST=0.0.0.0

# 安全配置
SECURE_HEADERS=true
HTTPS_REDIRECT=false

# 性能配置
ENABLE_GZIP=true
CACHE_MAX_AGE=31536000

# 监控配置
ENABLE_HEALTH_CHECK=true
HEALTH_CHECK_INTERVAL=30
```

#### 2. 生产环境 Docker Compose

创建 `docker-compose.prod.yaml`：

```yaml
version: '3.8'

services:
  caustic-lens:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: caustic-lens-prod
    ports:
      - "80:80"
      - "443:443"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
      - ./logs:/var/log/nginx
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - caustic-network
    labels:
      - "com.docker.compose.project=caustic-lens"
      - "com.docker.compose.service=web"

  # 可选：监控服务
  prometheus:
    image: prom/prometheus:latest
    container_name: caustic-lens-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    networks:
      - caustic-network

  grafana:
    image: grafana/grafana:latest
    container_name: caustic-lens-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - caustic-network

networks:
  caustic-network:
    driver: bridge
    name: caustic-lens-prod-network

volumes:
  prometheus-data:
  grafana-data:
```

#### 3. SSL/HTTPS 配置

```bash
# 生成自签名证书（开发用）
mkdir ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/nginx.key -out ssl/nginx.crt

# 或使用 Let's Encrypt（生产用）
certbot certonly --standalone -d your-domain.com
```

更新 `nginx.conf` 添加 HTTPS 支持：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/nginx.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx.key;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # 其他配置...
}
```

### 开发环境部署

```bash
# 启动开发环境
docker-compose -f docker-compose.dev.yaml up -d

# 查看日志
docker-compose -f docker-compose.dev.yaml logs -f

# 进入容器调试
docker exec -it caustic-lens-dev sh
```

## 📦 传统部署

### 静态文件部署

#### 1. 构建项目

```bash
# 安装依赖
npm install

# 构建生产版本
npm run build

# 构建产物在 dist/ 目录
```

#### 2. Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/caustic-lens/dist;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

#### 3. Apache 配置

创建 `.htaccess` 文件：

```apache
RewriteEngine On
RewriteBase /

# 处理 SPA 路由
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# 启用压缩
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# 设置缓存
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>
```

## ☁️ 云平台部署

### Vercel 部署

1. **安装 Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **部署项目**
   ```bash
   vercel --prod
   ```

3. **配置文件** (`vercel.json`)
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "package.json",
         "use": "@vercel/static-build",
         "config": {
           "distDir": "dist"
         }
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "/index.html"
       }
     ]
   }
   ```

### Netlify 部署

1. **配置文件** (`netlify.toml`)
   ```toml
   [build]
     publish = "dist"
     command = "npm run build"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200

   [build.environment]
     NODE_VERSION = "18"
   ```

2. **部署**
   - 连接 GitHub 仓库
   - 自动部署

### AWS S3 + CloudFront 部署

1. **创建 S3 存储桶**
   ```bash
   aws s3 mb s3://caustic-lens-app
   ```

2. **上传文件**
   ```bash
   aws s3 sync dist/ s3://caustic-lens-app --delete
   ```

3. **配置 CloudFront**
   - 创建分发
   - 设置错误页面重定向到 index.html

## ⚡ 性能优化

### 1. 构建优化

```javascript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          ui: ['antd']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
```

### 2. 缓存策略

```nginx
# 静态资源长期缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary "Accept-Encoding";
}

# HTML 文件不缓存
location ~* \.html$ {
    expires -1;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

### 3. CDN 配置

```javascript
// 使用 CDN 加速
const CDN_BASE = 'https://cdn.example.com/caustic-lens'

// 在构建时替换资源路径
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? CDN_BASE : '/'
})
```

## 📊 监控和日志

### 1. 健康检查

```bash
# 检查应用状态
curl -f http://localhost:3000/health

# 检查容器状态
docker ps
docker stats caustic-lens-app
```

### 2. 日志配置

```yaml
# docker-compose.yaml
services:
  caustic-lens:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 3. 监控指标

- **响应时间**: < 2s
- **可用性**: > 99.9%
- **错误率**: < 0.1%
- **内存使用**: < 512MB
- **CPU 使用**: < 50%

## 🔒 安全配置

### 1. 安全头配置

```nginx
# 安全头
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 2. 防火墙配置

```bash
# 只开放必要端口
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

### 3. 定期更新

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 更新 Docker 镜像
docker-compose pull
docker-compose up -d
```

## 🔧 故障排除

### 常见问题

#### 1. 容器启动失败

```bash
# 查看容器日志
docker logs caustic-lens-app

# 检查容器状态
docker ps -a

# 重启容器
docker-compose restart
```

#### 2. 内存不足

```bash
# 检查内存使用
free -h
docker stats

# 清理未使用的镜像
docker system prune -f
```

#### 3. 网络问题

```bash
# 检查端口占用
netstat -tulpn | grep :3000

# 检查防火墙
ufw status

# 测试网络连接
curl -I http://localhost:3000
```

### 性能问题诊断

1. **使用浏览器开发者工具**
   - Network 面板检查资源加载
   - Performance 面板分析性能
   - Lighthouse 评估整体性能

2. **服务器监控**
   ```bash
   # CPU 和内存使用
   top
   htop
   
   # 磁盘使用
   df -h
   
   # 网络连接
   ss -tulpn
   ```

3. **应用监控**
   - 使用 Prometheus + Grafana
   - 配置告警规则
   - 监控关键指标

## 📞 获取支持

- **文档**: 查看完整文档
- **Issues**: [GitHub Issues](https://github.com/your-username/caustic_lens/issues)
- **社区**: [Discord/Slack 社区]()

---

📝 **注意**: 部署前请确保已经充分测试，并备份重要数据。