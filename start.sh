#!/bin/bash

echo "数据选择对比工具 - 快速启动脚本"
echo "=================================="

# 检查是否安装了Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18 或更高版本"
    exit 1
fi

# 检查是否安装了Rust
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust 未安装，请先安装 Rust"
    echo "运行以下命令安装 Rust:"
    echo "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# 检查是否安装了Tauri CLI
if ! command -v tauri &> /dev/null; then
    echo "📦 安装 Tauri CLI..."
    npm install -g @tauri-apps/cli
fi

# 安装前端依赖
echo "📦 安装前端依赖..."
npm install

# 启动开发服务器
echo "🚀 启动应用..."
npm run tauri dev 