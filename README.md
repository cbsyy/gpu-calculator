<<<<<<< HEAD
# GPU资源计算器 🚀

一个智能的大语言模型GPU显存计算工具，帮助用户准确估算运行大模型所需的显存资源，并推荐最适合的GPU配置。

## ✨ 功能特性

### 🎯 核心功能
- **智能显存计算**: 精确计算大语言模型运行所需显存
- **GPU推荐系统**: 基于计算结果推荐最适合的GPU配置
- **多模型支持**: 支持HuggingFace和ModelScope平台的热门模型
- **实时模型数据**: 自动获取最新的模型信息和排行榜数据
- **多精度支持**: 支持FP32、FP16、INT8等不同精度计算
- **批处理计算**: 支持不同批次大小的显存需求计算

### 🔧 技术特性
- **响应式设计**: 完美适配桌面和移动设备
- **实时搜索**: 快速筛选和查找模型
- **自动化更新**: GitHub Actions自动更新模型数据
- **容错机制**: 网络异常时自动回退到预定义模型列表
- **TypeScript**: 完整的类型安全支持

## 🛠️ 技术栈

- **前端框架**: Next.js 14 + React 18
- **样式**: Tailwind CSS
- **语言**: TypeScript
- **图标**: Lucide React
- **数据获取**: Axios + Cheerio
- **自动化**: GitHub Actions

## 📦 项目结构

```
GPU/
├── .github/workflows/     # GitHub Actions工作流
│   └── fetch-models.yml   # 自动更新模型数据
├── scripts/               # 脚本文件
│   ├── fetch-models.js    # 模型数据获取脚本
│   └── test-fetch.js      # 测试脚本
├── src/
│   ├── app/               # Next.js应用页面
│   │   ├── page.tsx       # 主页面
│   │   ├── layout.tsx     # 布局组件
│   │   └── globals.css    # 全局样式
│   ├── config/            # 配置文件
│   │   ├── models.json    # 模型数据
│   │   └── gpus.json      # GPU配置数据
│   └── utils/             # 工具函数
│       ├── memoryCalculator.ts    # 显存计算逻辑
│       ├── gpuRecommendation.ts   # GPU推荐逻辑
│       └── huggingfaceApi.ts      # HuggingFace API
├── package.json
└── README.md
```

## 🚀 快速开始

### 环境要求
- Node.js 18.0+
- npm 或 yarn

### 本地开发

1. **克隆项目**
```bash
git clone https://github.com/your-username/gpu-calculator.git
cd gpu-calculator
```

2. **安装依赖**
```bash
npm install
# 或
yarn install
```

3. **启动开发服务器**
```bash
npm run dev
# 或
yarn dev
```

4. **访问应用**
打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 生产部署

#### Vercel部署（推荐）

1. 将项目推送到GitHub
2. 访问 [Vercel](https://vercel.com)
3. 导入GitHub仓库
4. 自动部署完成

#### 手动构建

```bash
# 构建项目
npm run build

# 启动生产服务器
npm start
```

## 📊 数据更新

项目使用GitHub Actions自动更新模型数据：

- **定时更新**: 每天UTC时间00:00自动运行
- **手动触发**: 可在GitHub Actions页面手动触发
- **数据来源**: HuggingFace开放LLM排行榜
- **容错机制**: 获取失败时使用预定义模型列表

### 手动更新模型数据

```bash
npm run fetch-models
```

## 🎮 使用指南

### 基本使用

1. **选择模型**: 从模型列表中选择或搜索目标模型
2. **输入自定义仓库**: 可输入HuggingFace或ModelScope仓库地址
3. **配置参数**: 设置精度、批次大小、序列长度等参数
4. **查看结果**: 获得显存需求和GPU推荐

### 参数说明

- **精度类型**:
  - FP32: 32位浮点数（最高精度，显存需求最大）
  - FP16: 16位浮点数（平衡精度和效率）
  - INT8: 8位整数（最低显存需求，可能影响精度）

- **批次大小**: 同时处理的样本数量
- **序列长度**: 输入文本的最大长度
- **训练模式**: 是否用于模型训练（需要额外显存）

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

### 开发规范

- 使用TypeScript编写代码
- 遵循ESLint规则
- 添加适当的注释
- 确保代码通过测试

## 📝 更新日志

### v0.1.0 (2024-01-XX)
- ✨ 初始版本发布
- 🎯 支持基础显存计算功能
- 🔧 集成HuggingFace API
- 📱 响应式界面设计
- 🤖 自动化模型数据更新

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [HuggingFace](https://huggingface.co/) - 提供模型数据和API
- [Next.js](https://nextjs.org/) - 优秀的React框架
- [Tailwind CSS](https://tailwindcss.com/) - 实用的CSS框架
- [Lucide](https://lucide.dev/) - 精美的图标库

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 创建 [Issue](https://github.com/your-username/gpu-calculator/issues)
- 发送邮件至: your-email@example.com

---

⭐ 如果这个项目对你有帮助，请给个Star支持一下！
