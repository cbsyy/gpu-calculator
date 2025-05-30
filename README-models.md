# 🤖 HuggingFace开源模型自动抓取系统

这个系统可以自动从 [HuggingFace Open LLM Leaderboard](https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard) 抓取最新的开源模型排行榜数据，并生成标准化的配置文件。

## ✨ 功能特性

- 🕒 **定时自动抓取**: 每天自动更新模型列表
- 📊 **智能数据处理**: 自动解析模型信息、参数、得分等
- 🔄 **增量更新**: 智能合并新旧数据，避免重复
- 📁 **标准化输出**: 生成结构化的JSON配置文件
- 🚀 **GitHub Actions**: 完全自动化的CI/CD流程
- 📈 **详细报告**: 每次执行都生成详细的摘要报告

## 📁 项目结构

```
.
├── .github/
│   └── workflows/
│       └── fetch-models.yml     # GitHub Actions工作流
├── scripts/
│   ├── fetch-models.js          # 主抓取脚本
│   └── test-fetch.js            # 测试脚本
├── src/
│   └── config/
│       └── models.json          # 生成的模型配置文件
├── package.json                 # 项目依赖配置
└── README-models.md            # 本文档
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 手动运行抓取

```bash
# 运行抓取脚本
npm run fetch-models

# 或者直接运行
node scripts/fetch-models.js
```

### 3. 测试功能

```bash
# 运行测试脚本
npm run test-fetch

# 或者直接运行
node scripts/test-fetch.js
```

## ⚙️ 自动化配置

### GitHub Actions 设置

系统使用 GitHub Actions 实现自动化抓取：

- **定时执行**: 每天北京时间上午9点自动运行
- **手动触发**: 支持在 GitHub 界面手动触发
- **代码更新触发**: 当抓取脚本更新时自动运行

### 工作流程

1. **环境准备**: 设置 Node.js 环境并安装依赖
2. **数据抓取**: 从 HuggingFace 排行榜抓取最新数据
3. **数据处理**: 解析并标准化模型信息
4. **智能合并**: 与现有配置合并，避免数据丢失
5. **自动提交**: 如果有更新，自动提交到仓库
6. **生成报告**: 创建详细的执行摘要

## 📊 生成的配置文件格式

生成的 `src/config/models.json` 文件结构如下：

```json
{
  "models": [
    {
      "id": "llama-2-70b-chat-hf",
      "name": "Llama 2 70B Chat HF",
      "huggingface_repo": "meta-llama/Llama-2-70b-chat-hf",
      "description": "开源模型排行榜第1名，平均得分85.2",
      "category": "对话模型",
      "parameters": "70B",
      "context_length": 4096,
      "avg_score": 85.2,
      "license": "Custom",
      "last_updated": "2024-01-15T01:00:00.000Z"
    }
  ],
  "last_updated": "2024-01-15T01:00:00.000Z",
  "source": "HuggingFace Open LLM Leaderboard",
  "total_models": 150
}
```

### 字段说明

- `id`: 模型的唯一标识符
- `name`: 模型显示名称
- `huggingface_repo`: HuggingFace仓库路径
- `description`: 模型描述（包含排名和得分）
- `category`: 模型类别（自动分类）
- `parameters`: 模型参数规模
- `context_length`: 上下文长度（估算）
- `avg_score`: 平均得分
- `license`: 许可证类型
- `last_updated`: 最后更新时间

## 🔧 自定义配置

### 修改抓取频率

编辑 `.github/workflows/fetch-models.yml` 中的 cron 表达式：

```yaml
schedule:
  # 每天上午9点 (UTC 1点)
  - cron: '0 1 * * *'
  # 每12小时一次
  # - cron: '0 */12 * * *'
  # 每周一次
  # - cron: '0 1 * * 1'
```

### 自定义模型分类

在 `scripts/fetch-models.js` 中修改分类逻辑：

```javascript
// 确定模型类别
let category = '通用对话';
if (modelName.toLowerCase().includes('code')) {
  category = '代码生成';
} else if (modelName.toLowerCase().includes('math')) {
  category = '数学推理';
}
// 添加更多分类规则...
```

### 修改输出路径

在 `scripts/fetch-models.js` 中修改 `OUTPUT_PATH` 常量：

```javascript
const OUTPUT_PATH = path.join(__dirname, '../src/config/models.json');
```

## 🐛 故障排除

### 常见问题

1. **抓取失败**
   - 检查网络连接
   - 确认 HuggingFace 网站可访问
   - 查看 GitHub Actions 日志

2. **依赖安装失败**
   ```bash
   # 清理缓存重新安装
   npm cache clean --force
   npm install
   ```

3. **权限问题**
   - 确保 GitHub Actions 有写入权限
   - 检查仓库设置中的 Actions 权限

### 调试模式

运行测试脚本查看详细信息：

```bash
node scripts/test-fetch.js
```

## 📈 监控和报告

### GitHub Actions 报告

每次执行后，在 GitHub Actions 页面可以看到：
- 执行时间和状态
- 抓取的模型数量
- 是否有配置更新
- 详细的执行日志

### 手动检查

```bash
# 查看最新配置
cat src/config/models.json | jq '.total_models, .last_updated'

# 查看前10个模型
cat src/config/models.json | jq '.models[:10] | .[].name'
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支: `git checkout -b feature/new-feature`
3. 提交更改: `git commit -am 'Add new feature'`
4. 推送分支: `git push origin feature/new-feature`
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🔗 相关链接

- [HuggingFace Open LLM Leaderboard](https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Node.js 官网](https://nodejs.org/)
- [Cheerio 文档](https://cheerio.js.org/)

---

🎉 **享受自动化的便利！** 如果有任何问题或建议，欢迎提交 Issue 或 Pull Request。