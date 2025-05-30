# 部署指南 📚

本文档详细介绍如何将GPU资源计算器项目部署到GitHub并设置协作环境。

## 🚀 GitHub部署步骤

### 1. 初始化Git仓库

在项目根目录执行以下命令：

```bash
# 初始化Git仓库
git init

# 添加所有文件
git add .

# 创建初始提交
git commit -m "Initial commit: GPU Calculator project"
```

### 2. 创建GitHub仓库

1. 访问 [GitHub](https://github.com)
2. 点击右上角的 "+" 按钮，选择 "New repository"
3. 填写仓库信息：
   - **Repository name**: `gpu-calculator`
   - **Description**: `智能大语言模型GPU显存计算工具`
   - **Visibility**: 选择 Public 或 Private
   - **不要**勾选 "Initialize this repository with a README"

### 3. 连接本地仓库到GitHub

```bash
# 添加远程仓库（替换为你的GitHub用户名）
git remote add origin https://github.com/YOUR_USERNAME/gpu-calculator.git

# 推送代码到GitHub
git branch -M main
git push -u origin main
```

### 4. 验证部署

访问你的GitHub仓库页面，确认所有文件已成功上传。

## 👥 协作设置

### 邀请协作者

1. 在GitHub仓库页面，点击 "Settings" 标签
2. 在左侧菜单中选择 "Collaborators"
3. 点击 "Add people" 按钮
4. 输入协作者的GitHub用户名或邮箱
5. 选择权限级别：
   - **Read**: 只读权限
   - **Write**: 读写权限
   - **Admin**: 管理员权限
6. 发送邀请

### 设置分支保护规则

为了保护主分支，建议设置分支保护规则：

1. 进入 "Settings" > "Branches"
2. 点击 "Add rule" 按钮
3. 配置保护规则：
   - **Branch name pattern**: `main`
   - 勾选 "Require pull request reviews before merging"
   - 勾选 "Require status checks to pass before merging"
   - 勾选 "Restrict pushes that create files larger than 100MB"

## 🌐 在线部署

### Vercel部署（推荐）

1. **连接GitHub**
   - 访问 [Vercel](https://vercel.com)
   - 使用GitHub账号登录
   - 点击 "New Project"

2. **导入仓库**
   - 选择你的 `gpu-calculator` 仓库
   - 点击 "Import"

3. **配置项目**
   - **Project Name**: `gpu-calculator`
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

4. **部署**
   - 点击 "Deploy" 按钮
   - 等待部署完成
   - 获得部署URL

### Netlify部署（备选）

1. 访问 [Netlify](https://netlify.com)
2. 点击 "New site from Git"
3. 选择GitHub并授权
4. 选择 `gpu-calculator` 仓库
5. 配置构建设置：
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
6. 点击 "Deploy site"

## 🔧 环境变量配置

如果项目需要环境变量，在部署平台中设置：

### Vercel环境变量
1. 进入项目设置页面
2. 选择 "Environment Variables"
3. 添加所需的环境变量

### 常用环境变量
```bash
# HuggingFace API Token（如果需要）
HUGGINGFACE_API_TOKEN=your_token_here

# 其他API密钥
NEXT_PUBLIC_API_URL=https://api.example.com
```

## 🔄 自动化部署

项目已配置GitHub Actions，支持：

- **自动模型数据更新**: 每天UTC 00:00执行
- **代码质量检查**: 每次Push和PR时执行
- **自动部署**: 推送到main分支时自动部署

### GitHub Actions配置

查看 `.github/workflows/fetch-models.yml` 文件了解详细配置。

## 📋 协作工作流

### 标准Git工作流

1. **克隆仓库**
```bash
git clone https://github.com/YOUR_USERNAME/gpu-calculator.git
cd gpu-calculator
```

2. **创建功能分支**
```bash
git checkout -b feature/new-feature
```

3. **开发和提交**
```bash
# 开发代码...
git add .
git commit -m "Add new feature: description"
```

4. **推送分支**
```bash
git push origin feature/new-feature
```

5. **创建Pull Request**
   - 在GitHub页面创建PR
   - 添加描述和标签
   - 请求代码审查

6. **合并代码**
   - 审查通过后合并到main分支
   - 删除功能分支

### 提交信息规范

使用语义化提交信息：

```bash
# 功能添加
git commit -m "feat: add GPU memory calculation feature"

# 问题修复
git commit -m "fix: resolve model loading timeout issue"

# 文档更新
git commit -m "docs: update README with deployment guide"

# 样式调整
git commit -m "style: improve responsive design for mobile"

# 重构代码
git commit -m "refactor: optimize memory calculation algorithm"

# 测试相关
git commit -m "test: add unit tests for GPU recommendation"
```

## 🛠️ 开发环境设置

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 代码格式化
npm run lint
```

### 推荐的开发工具

- **IDE**: Visual Studio Code
- **插件**:
  - ES7+ React/Redux/React-Native snippets
  - Tailwind CSS IntelliSense
  - TypeScript Importer
  - GitLens
  - Prettier

## 🔍 故障排除

### 常见问题

1. **部署失败**
   - 检查构建日志
   - 确认依赖版本兼容性
   - 验证环境变量配置

2. **模型数据更新失败**
   - 检查GitHub Actions日志
   - 验证网络连接
   - 确认API限制

3. **协作权限问题**
   - 确认协作者邀请已接受
   - 检查分支保护规则
   - 验证访问权限

### 获取帮助

- 查看项目Issues页面
- 阅读相关文档
- 联系项目维护者

---

🎉 **恭喜！** 你的GPU资源计算器项目现在已经成功部署到GitHub，可以开始协作开发了！