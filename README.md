# ExperimentComparator - 模型实验结果对比工具

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

一个基于 Tauri + React 的现代化桌面应用，专为机器学习模型实验结果对比而设计。

[English](README_EN.md) | 中文

</div>

## ✨ 功能特性

### 🎯 核心功能
- **📁 智能文件夹选择**：支持拖拽选择GT图、实验数据和多个对比数据文件夹
- **✅ 自动文件验证**：智能检查所有文件夹中的同名图片文件
- **📊 多指标计算**：同时计算IOU和准确率(Accuracy)两个关键指标
- **🖼️ 逐一对比查看**：支持键盘导航，逐张查看对比结果
- **🎨 现代化界面**：基于Ant Design的美观UI，支持中文

### 🚀 高级特性
- **🗂️ 历史记录管理**：自动保存配置历史，支持JSON导入导出
- **🏷️ 自定义命名**：支持为对比实验自定义名称
- **⌨️ 键盘导航**：左右箭头键快速切换图片
- **🔄 智能去重**：防止重复保存相同配置的历史记录
- **📈 性能可视化**：颜色编码显示性能指标（绿色≥90%，黄色≥70%，红色<70%）

## 🏗️ 技术栈

- **前端框架**: React 18 + TypeScript
- **UI组件库**: Ant Design 5.x
- **桌面框架**: Tauri 1.x
- **后端语言**: Rust
- **图像处理**: Rust image crate
- **状态管理**: 自定义React Hooks
- **构建工具**: Vite

## 📦 安装要求

### 开发环境
- **Node.js** 18+ 
- **Rust** 1.60+
- **pnpm/npm** 包管理器

### 系统要求
- **Windows** 10+
- **macOS** 10.15+
- **Linux** (Ubuntu 18.04+)

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/chouheiwa/ExperimentComparator.git
cd ExperimentComparator
```

### 2. 安装依赖
```bash
npm install
```

### 3. 运行开发服务器
```bash
npm run tauri dev
```

### 4. 构建发布版本
```bash
npm run tauri build
```

## 📖 使用指南

### 基本工作流程

1. **📁 选择文件夹**
   - 拖拽或点击选择GT图片文件夹（Ground Truth）
   - 选择您的实验数据文件夹
   - 选择一个或多个对比数据文件夹

2. **✅ 验证文件**
   - 系统自动检查所有文件夹中的同名图片
   - 显示验证结果和缺失文件信息

3. **📊 查看结果**
   - 系统计算IOU和准确率指标
   - 支持逐张查看对比结果
   - 使用键盘方向键快速导航

4. **💾 保存历史**
   - 自动保存成功的配置到历史记录
   - 支持历史记录的导入导出

### 键盘快捷键

- `←/→` 切换图片
- `Esc` 返回上级
- `Space` 确认操作

## 🎯 指标说明

### IOU (Intersection over Union)
- 计算预测掩码与真实掩码的交集与并集比值
- 取值范围：0-1，越接近1表示效果越好

### 准确率 (Accuracy)
- 计算像素级别的分类准确率
- 取值范围：0-100%，越高表示效果越好

### 颜色编码
- 🟢 **绿色**: 性能优秀 (≥90%)
- 🟡 **黄色**: 性能良好 (≥70%)
- 🔴 **红色**: 性能待提升 (<70%)

## 🗂️ 项目结构

```
ExperimentComparator/
├── src/                      # React前端源码
│   ├── components/           # React组件
│   │   ├── ComparisonView.tsx
│   │   ├── FolderSelection.tsx
│   │   ├── ValidationResults.tsx
│   │   ├── HistoryPanel.tsx
│   │   └── SafeImage.tsx
│   ├── hooks/               # 自定义Hooks
│   │   └── useAppState.ts
│   ├── types/               # TypeScript类型定义
│   │   └── index.ts
│   ├── utils/               # 工具函数
│   │   └── history.ts
│   ├── App.tsx              # 主应用组件
│   └── main.tsx             # 入口文件
├── src-tauri/               # Tauri后端源码
│   ├── src/
│   │   └── main.rs          # Rust主文件
│   ├── Cargo.toml           # Rust依赖配置
│   └── tauri.conf.json      # Tauri配置
├── package.json             # 前端依赖配置
└── README.md                # 项目说明
```

## 🔧 开发指南

### 添加新功能

1. **前端组件**：在 `src/components/` 中添加新的React组件
2. **后端API**：在 `src-tauri/src/main.rs` 中添加新的Tauri命令
3. **类型定义**：在 `src/types/` 中添加TypeScript类型
4. **状态管理**：在 `src/hooks/` 中扩展useAppState Hook

### 代码规范

- 使用TypeScript进行类型检查
- 遵循Ant Design设计规范
- 使用ESLint进行代码质量检查
- 采用函数式组件和Hooks

## 🐛 故障排除

### 常见问题

**构建失败**
- 确保已安装Rust和Node.js
- 检查网络连接，某些依赖可能需要从外网下载

**图片无法显示**
- 检查图片路径是否正确
- 确保图片格式受支持（JPEG、PNG、BMP、TIFF、WebP）

**指标计算异常**
- 确保图片尺寸一致
- 检查图片是否为正确的分割掩码格式

## 🤝 贡献

我们欢迎各种形式的贡献！请参考以下步骤：

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

## 📄 许可证

本项目采用MIT许可证。详情请参考 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [Tauri](https://tauri.app/) - 优秀的桌面应用框架
- [Ant Design](https://ant.design/) - 专业的UI组件库
- [React](https://reactjs.org/) - 强大的前端框架
- [Rust](https://www.rust-lang.org/) - 高性能系统编程语言

---

<div align="center">

如果这个项目对你有帮助，请考虑给一个 ⭐️ 

Made with ❤️ by [chouheiwa](https://github.com/chouheiwa)

</div> 