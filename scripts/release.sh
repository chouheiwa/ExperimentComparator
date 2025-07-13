#!/bin/bash

# 发布脚本 - 自动化版本更新和发布流程
# 使用方法: ./scripts/release.sh 1.0.1

set -e

# 检查参数
if [ $# -eq 0 ]; then
    echo "错误: 请提供版本号"
    echo "使用方法: ./scripts/release.sh 1.0.1"
    exit 1
fi

VERSION=$1
echo "🚀 开始发布版本 $VERSION..."

# 验证版本号格式
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "错误: 版本号格式不正确。应该是 x.y.z 格式"
    exit 1
fi

# 检查是否在main分支
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "警告: 当前不在main分支，是否继续? (y/n)"
    read -r CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "已取消发布"
        exit 0
    fi
fi

# 检查工作区是否干净
if [ -n "$(git status --porcelain)" ]; then
    echo "错误: 工作区有未提交的更改，请先提交或存储"
    exit 1
fi

# 更新版本号
echo "📝 更新版本号..."

# 更新 package.json
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" package.json

# 更新 src-tauri/Cargo.toml
sed -i '' "s/version = \"[^\"]*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml

# 更新 src-tauri/tauri.conf.json
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json

echo "✅ 版本号已更新为 $VERSION"

# 测试构建
echo "🔧 执行测试构建..."
npm run build
if [ $? -ne 0 ]; then
    echo "错误: 构建失败"
    exit 1
fi

echo "✅ 构建测试通过"

# 提交更改
echo "💾 提交版本更新..."
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore: bump version to $VERSION"

# 创建标签
echo "🏷️  创建标签..."
git tag -a "v$VERSION" -m "Release v$VERSION"

# 推送到远程
echo "⬆️  推送到远程仓库..."
git push origin main
git push origin "v$VERSION"

echo "🎉 发布流程完成！"
echo "📦 GitHub Actions 将自动构建并发布到 GitHub Releases"
echo "🔗 查看构建状态: https://github.com/chouheiwa/ExperimentComparator/actions"

# 打开浏览器查看构建状态 (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "https://github.com/chouheiwa/ExperimentComparator/actions"
fi 