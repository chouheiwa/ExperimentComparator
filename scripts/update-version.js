#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 获取命令行参数
const versionType = process.argv[2]; // patch, minor, major
if (!['patch', 'minor', 'major'].includes(versionType)) {
    console.error('请指定版本更新类型: patch, minor, 或 major');
    process.exit(1);
}

// 读取当前版本
function getCurrentVersion() {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
}

// 计算新版本
function calculateNewVersion(currentVersion, type) {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    switch (type) {
        case 'patch':
            return `${major}.${minor}.${patch + 1}`;
        case 'minor':
            return `${major}.${minor + 1}.0`;
        case 'major':
            return `${major + 1}.0.0`;
        default:
            throw new Error('无效的版本类型');
    }
}

// 更新 package.json
function updatePackageJson(newVersion) {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ 已更新 package.json 版本为 ${newVersion}`);
}

// 更新 Cargo.toml
function updateCargoToml(newVersion) {
    const cargoTomlPath = path.join(projectRoot, 'src-tauri', 'Cargo.toml');
    let content = fs.readFileSync(cargoTomlPath, 'utf8');
    content = content.replace(/^version = ".*"$/m, `version = "${newVersion}"`);
    fs.writeFileSync(cargoTomlPath, content);
    console.log(`✅ 已更新 Cargo.toml 版本为 ${newVersion}`);
}

// 更新 tauri.conf.json
function updateTauriConfig(newVersion) {
    const tauriConfigPath = path.join(projectRoot, 'src-tauri', 'tauri.conf.json');
    const config = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
    config.version = newVersion;
    fs.writeFileSync(tauriConfigPath, JSON.stringify(config, null, 2) + '\n');
    console.log(`✅ 已更新 tauri.conf.json 版本为 ${newVersion}`);
}

// 主函数
function main() {
    try {
        const currentVersion = getCurrentVersion();
        const newVersion = calculateNewVersion(currentVersion, versionType);
        
        console.log(`🚀 更新版本从 ${currentVersion} 到 ${newVersion} (${versionType})`);
        
        // 更新所有文件
        updatePackageJson(newVersion);
        updateCargoToml(newVersion);
        updateTauriConfig(newVersion);
        
        console.log(`\n🎉 版本更新完成！`);
        console.log(`📦 新版本: ${newVersion}`);
        console.log(`\n💡 接下来你可以执行：`);
        console.log(`   npm run package        # 打包应用`);
        console.log(`   npm run package:debug  # 打包调试版本`);
        console.log(`   npm run package:all    # 打包所有平台`);
        
    } catch (error) {
        console.error('❌ 版本更新失败:', error.message);
        process.exit(1);
    }
}

main();