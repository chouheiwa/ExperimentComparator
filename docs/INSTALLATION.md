# 安装指南

## 📦 下载安装包

请从 [Releases](https://github.com/chouheiwa/ExperimentComparator/releases) 页面下载适合您操作系统的安装包：

- **Windows**: 下载 `.exe` 或 `.msi` 文件
- **macOS**: 下载 `.dmg` 文件
- **Linux**: 下载 `.AppImage` 或 `.deb` 文件

## 🍎 macOS 安装指南

### 重要提示
ExperimentComparator 是一个开源项目，为了保持免费，我们没有购买 Apple 开发者证书进行代码签名。这意味着 macOS 会显示安全警告，但应用本身是完全安全的。

### 安装步骤

#### 方法1：右键打开（推荐）
1. **下载并挂载**: 双击 `.dmg` 文件挂载磁盘映像
2. **拖拽安装**: 将 ExperimentComparator 拖拽到"应用程序"文件夹
3. **右键打开**: 
   - 在"应用程序"文件夹中找到 ExperimentComparator
   - **右键点击**应用图标
   - 选择"打开"
4. **确认打开**: 在弹出的对话框中点击"打开"

#### 方法2：系统设置授权
1. **正常尝试**: 双击应用尝试打开
2. **查看警告**: 系统会显示安全警告并阻止运行
3. **系统设置**: 打开"系统设置" → "隐私与安全性"
4. **允许运行**: 在"安全性"部分找到被阻止的应用，点击"仍要打开"
5. **确认**: 在弹出的对话框中点击"打开"

### 常见问题

**Q: 为什么会显示"无法打开，因为它来自身份不明的开发者"？**
A: 这是因为我们没有购买 Apple 开发者证书。这是正常的，请使用上述方法绕过。

**Q: 应用安全吗？**
A: 是的，ExperimentComparator 是完全开源的，您可以在 GitHub 上查看所有源代码。

**Q: 每次启动都需要授权吗？**
A: 不需要，只有第一次运行需要授权，之后就可以正常使用。

## 🐧 Linux 安装指南

### AppImage (推荐)
1. 下载 `.AppImage` 文件
2. 添加执行权限：
   ```bash
   chmod +x ExperimentComparator-1.0.0.AppImage
   ```
3. 双击运行或在终端中执行：
   ```bash
   ./ExperimentComparator-1.0.0.AppImage
   ```

### Debian/Ubuntu (.deb)
```bash
sudo dpkg -i experiment-comparator_1.0.0_amd64.deb
```

如果有依赖问题，请运行：
```bash
sudo apt-get install -f
```

## 🪟 Windows 安装指南

### EXE 安装程序
1. 下载 `.exe` 文件
2. 双击运行安装程序
3. 按照向导提示完成安装

### MSI 安装包
1. 下载 `.msi` 文件
2. 双击运行或使用命令行：
   ```cmd
   msiexec /i ExperimentComparator-1.0.0.msi
   ```

### Windows Defender 说明
Windows Defender 可能会警告未签名的应用。如果出现此情况：
1. 点击"更多信息"
2. 选择"仍要运行"

## 🔧 卸载

### macOS
- 从"应用程序"文件夹中删除 ExperimentComparator

### Windows
- 通过"控制面板" → "程序和功能"卸载
- 或通过"设置" → "应用"卸载

### Linux
- AppImage: 直接删除文件
- Debian: `sudo apt-get remove experiment-comparator`

## 📞 支持

如果安装过程中遇到问题，请：
1. 查看 [常见问题](https://github.com/chouheiwa/ExperimentComparator/issues?q=is%3Aissue+label%3Aquestion)
2. 提交新的 [Issue](https://github.com/chouheiwa/ExperimentComparator/issues/new) 