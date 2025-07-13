# 贡献指南

感谢你考虑为 ExperimentComparator 项目贡献！

## 开发环境设置

1. **Fork 本项目**
2. **克隆你的fork**
   ```bash
   git clone https://github.com/your-username/ExperimentComparator.git
   cd ExperimentComparator
   ```

3. **安装依赖**
   ```bash
   npm install
   ```

4. **运行开发服务器**
   ```bash
   npm run tauri dev
   ```

## 提交规范

### 分支命名
- `feature/xxx` - 新功能
- `fix/xxx` - Bug修复
- `docs/xxx` - 文档更新
- `refactor/xxx` - 代码重构

### 提交消息格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

类型：
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式修改
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例：
```
feat(comparison): add accuracy metrics calculation

- Add accuracy calculation alongside IOU
- Update UI to display both metrics
- Add color coding for performance visualization

Closes #123
```

## 代码规范

### TypeScript
- 使用严格的TypeScript配置
- 为所有函数和组件添加类型注释
- 优先使用接口而非类型别名

### React
- 使用函数式组件和Hooks
- 遵循React最佳实践
- 优先使用自定义Hooks进行状态管理

### Rust
- 遵循Rust标准编码规范
- 添加适当的错误处理
- 编写必要的单元测试

## 拉取请求流程

1. **确保你的分支是最新的**
   ```bash
   git checkout main
   git pull upstream main
   ```

2. **创建特性分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **进行更改并提交**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

4. **推送到你的fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **创建Pull Request**
   - 确保PR标题清晰描述更改
   - 在描述中解释更改的原因和方式
   - 关联相关的issue

## 代码审查

所有的Pull Request都需要经过代码审查：

- 确保代码符合项目的编码规范
- 测试所有新功能
- 更新相关文档
- 确保没有破坏现有功能

## 报告问题

如果你发现了bug或有功能建议，请：

1. 检查是否已有相关的issue
2. 创建新的issue，包含：
   - 清晰的标题和描述
   - 重现步骤（如果是bug）
   - 期望的行为
   - 实际的行为
   - 系统信息（操作系统、浏览器等）

## 许可证

通过贡献，你同意你的贡献将按照MIT许可证授权。 