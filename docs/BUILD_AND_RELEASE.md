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

### 无签名打包 (默认)
当前配置支持无签名打包，这对于开源项目是完全可行的：

**优势:**
- 无需 Apple 开发者账户（$99/年）
- 构建流程简单
- 适合个人和开源项目

**用户体验:**
- 用户需要右键打开应用或在系统设置中授权
- 仅第一次运行需要授权
- 功能完全不受影响

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

### 从无签名升级到有签名
如果将来想要添加代码签名：

1. **注册 Apple Developer Program** ($99/年)
2. **创建证书**：在 Apple Developer 门户创建分发证书
3. **导出证书**：将证书导出为 .p12 文件
4. **更新配置**：在 tauri.conf.json 中配置签名身份
5. **设置 GitHub Secrets**：添加证书和密码到 GitHub

### 测试无签名打包
在本地测试无签名打包：

```bash
# 构建 DMG
npm run tauri build -- --bundles dmg

# 测试安装
open src-tauri/target/release/bundle/dmg/ExperimentComparator_1.0.0_x64.dmg
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

**构建脚本说明：**
- `tauri:build`: 完整构建，包含所有默认安装包
- `tauri:build:debug`: 调试模式构建
- `tauri:build:fast`: 快速构建，仅编译不打包（使用 `--bundles none`）
- `build:win/mac/linux`: 针对特定平台的构建

```json
{
  "scripts": {
    "tauri:build": "tauri build",
    "tauri:build:debug": "tauri build --debug",
    "tauri:build:fast": "tauri build --bundles none",
    "build:win": "tauri build --target x86_64-pc-windows-msvc",
    "build:mac": "tauri build --target universal-apple-darwin",
    "build:linux": "tauri build --target x86_64-unknown-linux-gnu"
  }
}
```

### bundles 参数说明
Tauri 构建支持以下 bundles 参数：

**可用的 bundle 格式：**
- `deb`: Debian 包格式 (Linux)
- `rpm`: RPM 包格式 (Linux)
- `appimage`: AppImage 便携格式 (Linux)
- `msi`: MSI 安装包 (Windows)
- `app`: 应用程序包 (macOS)
- `dmg`: DMG 镜像文件 (macOS)
- `updater`: 更新器包 (所有平台)
- `none`: 跳过打包过程

**使用示例：**
```bash
# 仅构建 DMG 格式
npm run tauri build -- --bundles dmg

# 构建多种格式
npm run tauri build -- --bundles deb,appimage

# 跳过打包（仅编译测试）
npm run tauri build -- --bundles none
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
4. **参数错误**: 如果遇到 `--no-bundle` 参数错误，请使用 `--bundles none` 替代

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