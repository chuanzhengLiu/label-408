# 智作 AI (Novel Gen)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.0-green.svg)

**智作 AI** 是一款基于 DeepSeek 大模型的现代化桌面端小说创作辅助工具。它通过多智能体协同（Multi-Agent）技术，为创作者提供从灵感到大纲，再到章节正文的全流程辅助。

## ✨ 核心特性

- **多智能体矩阵**: 内置大纲专家、标题大师、章节编剧等多个 AI 智能体，模拟真实编辑部工作流。
- **现代化体验**: 采用最新的玻璃拟态 (Glassmorphism) 设计语言，提供沉浸式创作环境。
- **深度定制**: 支持玄幻、都市、科幻等多种网文类型，可自定义风格标签、受众群体。
- **隐私优先**: 本地数据库 (SQLite) 存储，所有草稿和设定均在本地管理。

## 🛠️ 技术栈

- **前端**: React 18, TypeScript, TailwindCSS, Framer Motion
- **后端**: Python 3.13, FastAPI, SQLAlchemy
- **桌面框架**: Tauri 2.0
- **AI 模型**: DeepSeek V3 (via OpenAI SDK)

## 🚀 快速开始

### 环境要求

- Node.js > 16
- Python > 3.9
- Rust (Tauri 依赖)

### 安装步骤

 **初始化后端**
   ```bash
   # 创建虚拟环境
   python3 -m venv venv
   source venv/bin/activate
   
   # 安装依赖
   pip install -r backend/requirements.txt
   ```

 **初始化前端**
   ```bash
   # 安装依赖
   npm install
   ```

 **启动应用**
   ```bash
   # 一键启动 (推荐)
   # 脚本会自动检查环境并安装必要依赖
   sh start.sh
   # ⚠️ 若尚未配置环境，首次运行时间可能较长
   
   # 或手动启动
   source venv/bin/activate
   python -m backend.main & # 启动后端
   npm run tauri dev        # 启动前端
   ```

### 📦 打包与分发

如果您需要将项目交给测试人员：

1. **执行打包脚本**:
   ```bash
   sh package.sh
   ```
   这将在当前目录下生成一个 `novel_gen_brain_YYYYMMDD_HHMMSS.zip` 文件 
   (已自动去除 `node_modules`, `venv` 等臃肿文件)。

2. **接收方使用**:
   - 解压 ZIP 文件。
   - 确保电脑已安装 Node.js 和 Python。
   - 直接运行 `sh start.sh` 即可 (脚本会自动根据 requirements.txt 和 package.json 重建环境)。
   ```

### 🐳 Docker 一键部署 (推荐)

如果您希望使用 Docker 快速部署整个应用（后端 + 前端 Web 版）：

1. **环境准备**:
   - 确保已安装 Docker 和 Docker Compose。

2. **启动服务**:
   ```bash
   # 在项目根目录下运行
   docker-compose up -d --build
   ```
   这将同时启动：
   - **后端 API**: 映射到 `http://localhost:8000`
   - **前端 Web**: 映射到 `http://localhost:3000`

3. **数据持久化**:
   - 后端使用 SQLite 数据库，已通过 Docker Volume 映射到宿主机的 `novel_brain.db`。

4. **注意事项**:
   - 如果需要后端调用 AI 模型，请确保设置了 `DEEPSEEK_API_KEY` 环境变量。
   - 前端 Web 版默认连接 `http://localhost:8000`。

---

## 📖 使用指南

1. **新建作品**: 点击首页 "+" 号，在向导中配置小说类型、字数、核心梗。
2. **生成大纲**: 进入工作区，点击 "唤醒大纲智能体"，DeepSeek 将自动生成结构化大纲。
3. **章节编排**: (开发中) 基于大纲拆分卷章结构。
4. **正文生成**: (开发中) 逐章生成精彩正文。

## 🤝 贡献

欢迎提交 Issue 或 Pull Request。

## 📄 许可证

MIT License
