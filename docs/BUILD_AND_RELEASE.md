# 构建和发布说明

本文档详细介绍如何使用GitHub Actions自动构建和发布ExperimentComparator的跨平台安装包。

## 🔧 GitHub Actions工作流

我们提供了三个不同的GitHub Actions工作流：

### 1. 测试构建 (test-build.yml)
- **触发条件**: 推送到main分支或创建PR时
- **功能**: 测试代码是否能够正常构建
- **平台**: Windows、macOS、Linux
- **输出**: 仅测试构建，不生成发布包

### 2. 手动构建 (build.yml)
- **触发条件**: 手动触发
- **功能**: 构建跨平台安装包
- **平台**: Windows、macOS、Linux
- **输出**: 构建产物上传到GitHub Actions Artifacts

### 3. 发布构建 (release.yml)
- **触发条件**: 推送版本标签 (v*)
- **功能**: 自动构建并发布到GitHub Releases
- **平台**: Windows、macOS、Linux
- **输出**: 自动创建GitHub Release

## 📦 构建输出

每个平台会生成以下文件：

### Windows
- `ExperimentComparator_1.0.0_x64_en-US.msi` - MSI安装包
- `ExperimentComparator_1.0.0_x64-setup.exe` - EXE安装程序

### macOS
- `ExperimentComparator.app.tar.gz` - 应用程序包
- `ExperimentComparator_1.0.0_x64.dmg` - DMG镜像文件

### Linux
- `experiment-comparator_1.0.0_amd64.deb` - Debian包
- `experiment-comparator_1.0.0_amd64.AppImage` - AppImage便携版

## 🚀 发布流程

### 自动发布
1. **更新版本号**
   ```bash
   # 更新 src-tauri/tauri.conf.json 中的版本号
   # 更新 src-tauri/Cargo.toml 中的版本号
   # 更新 package.json 中的版本号
   ```

2. **创建并推送标签**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **自动构建**
   - GitHub Actions会自动检测标签推送
   - 在三个平台上并行构建安装包
   - 创建GitHub Release并上传构建产物

### 手动发布
1. **手动触发构建**
   - 进入GitHub仓库页面
   - 点击Actions → Build → Run workflow
   - 等待构建完成

2. **下载构建产物**
   - 从Actions页面下载构建产物
   - 手动创建Release并上传文件

## 🔐 代码签名配置

### macOS 代码签名
如果你有Apple开发者账户，可以配置代码签名：

1. **添加GitHub Secrets**
   ```
   APPLE_CERTIFICATE: base64编码的证书
   APPLE_CERTIFICATE_PASSWORD: 证书密码
   APPLE_SIGNING_IDENTITY: 签名身份
   APPLE_ID: Apple ID
   APPLE_PASSWORD: 应用专用密码
   ```

2. **更新tauri.conf.json**
   ```json
   {
     "bundle": {
       "macOS": {
         "signingIdentity": "Developer ID Application: Your Name",
         "entitlements": "path/to/entitlements.plist"
       }
     }
   }
   ```

### Windows 代码签名
如果你有代码签名证书：

1. **添加GitHub Secrets**
   ```
   WINDOWS_CERTIFICATE: base64编码的证书
   WINDOWS_CERTIFICATE_PASSWORD: 证书密码
   ```

2. **更新tauri.conf.json**
   ```json
   {
     "bundle": {
       "windows": {
         "certificateThumbprint": "证书指纹",
         "digestAlgorithm": "sha256",
         "timestampUrl": "http://timestamp.digicert.com"
       }
     }
   }
   ```

## 🔧 高级配置

### 自定义构建脚本
可以在`package.json`中添加自定义脚本：

```json
{
  "scripts": {
    "tauri:build": "tauri build",
    "tauri:build:debug": "tauri build --debug",
    "tauri:build:release": "tauri build --no-bundle",
    "build:win": "tauri build --target x86_64-pc-windows-msvc",
    "build:mac": "tauri build --target universal-apple-darwin",
    "build:linux": "tauri build --target x86_64-unknown-linux-gnu"
  }
}
```

### 条件编译
可以根据平台设置不同的构建参数：

```yaml
- name: Build the app
  run: |
    if [ "$RUNNER_OS" == "macOS" ]; then
      npm run tauri build -- --target universal-apple-darwin
    else
      npm run tauri build
    fi
```

## 🐛 常见问题

### 构建失败
1. **检查依赖**: 确保所有依赖都已正确安装
2. **检查权限**: 确保GitHub Actions有足够的权限
3. **检查配置**: 验证tauri.conf.json配置是否正确

### 文件大小过大
1. **启用压缩**: 在bundle配置中启用压缩
2. **移除调试信息**: 使用release模式构建
3. **优化资源**: 压缩图像和其他资源文件

### 签名问题
1. **证书有效性**: 确保证书仍然有效
2. **权限配置**: 检查签名权限配置
3. **网络连接**: 确保时间戳服务器可访问

## 📋 检查清单

发布前请确保：

- [ ] 版本号已更新
- [ ] 测试构建通过
- [ ] 代码签名配置正确（如果适用）
- [ ] Release notes已准备
- [ ] 文档已更新

## 🔗 相关链接

- [Tauri官方文档](https://tauri.app/v1/guides/building/)
- [GitHub Actions文档](https://docs.github.com/en/actions)
- [代码签名指南](https://tauri.app/v1/guides/distribution/sign-macos)

## 📞 支持

如果在构建过程中遇到问题，请：
1. 检查Actions日志
2. 查看相关文档
3. 在GitHub Issues中提问 