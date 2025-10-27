const fs = require('fs');
const path = require('path');

class BattleGameBundler {
  constructor() {
    this.rootDir = __dirname;
    this.outputFile = path.join(this.rootDir, 'battle-game-complete.html');
  }

  // 获取JS文件的依赖顺序
  getJSDependencyOrder() {
    return [
      'js/utils.js',
      'js/character.js',
      // 角色文件（按照原始HTML中的顺序）
      'js/characters/aaa.js',
      'js/characters/akeman.js',
      'js/characters/bench.js',
      'js/characters/huangye.js',
      'js/characters/xiaomo.js',
      'js/characters/dongji.js',
      'js/characters/yunli.js',
      'js/characters/setsuna.js',
      'js/characters/robin.js',
      'js/characters/legeng.js',
      'js/characters/johnson.js',
      'js/characters/zhanlan.js',
      'js/characters/naitang.js',
      'js/characters/tangtang.js',
      'js/characters/tanghuang.js',
      // 主逻辑最后
      'js/main.js'
    ];
  }

  // 读取文件内容
  readFile(filePath) {
    try {
      const fullPath = path.join(this.rootDir, filePath);
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath, 'utf8');
      } else {
        console.warn(`⚠️  文件不存在: ${filePath}`);
        return '';
      }
    } catch (error) {
      console.error(`❌ 读取文件失败 ${filePath}:`, error.message);
      return '';
    }
  }

  // 构建完整的HTML
  build() {
    console.log('🚀 开始构建完整HTML文件...\n');

    // 读取HTML模板
    const htmlTemplate = this.readFile('index.html');
    if (!htmlTemplate) {
      console.error('❌ HTML模板文件不存在');
      return;
    }

    // 读取CSS
    const cssContent = this.readFile('css/style.css');
    
    // 读取并合并JS（按依赖顺序）
    let jsContent = '';
    const dependencyOrder = this.getJSDependencyOrder();
    
    dependencyOrder.forEach(filePath => {
      const content = this.readFile(filePath);
      if (content) {
        jsContent += `\n\n// === ${filePath} ===\n${content}`;
        console.log(`✅ 已处理: ${filePath}`);
      }
    });

    // 创建合并后的HTML
    const bundledHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NVN 角色对战 - 完整版</title>
    <style>
/* ===== CSS样式 ===== */
${cssContent}
    </style>
</head>
<body>
    <h1>NVN 角色对战</h1>

    <div class="controls">
        <label>模式：
            <select id="mode">
                <option value="1">1v1</option>
                <option value="2">2v2</option>
                <option value="3">3v3</option>
                <option value="4">4v4</option>
                <option value="5">5v5</option>
            </select>
        </label>
        <button id="startBattle">开始战斗</button>
        <button id="addCustomChar">新建角色</button>
    </div>

    <div class="team-selector">
        <div class="team-header">队伍A</div>
        <div id="teamA-selectors"></div>
    </div>

    <div class="team-selector">
        <div class="team-header">队伍B</div>
        <div id="teamB-selectors"></div>
    </div>

    <div id="teams"></div>
    <div id="log"></div>

    <script>
// ===== 合并的JavaScript代码 =====
${jsContent}
    </script>
</body>
</html>`;

    // 写入文件
    fs.writeFileSync(this.outputFile, bundledHTML);

    console.log(`\n🎉 构建完成!`);
    console.log(`📁 输出文件: ${this.outputFile}`);
    console.log(`📊 合并文件数: ${dependencyOrder.length + 1} (${dependencyOrder.length}个JS + 1个CSS)`);
    
    // 计算文件大小
    const stats = fs.statSync(this.outputFile);
    console.log(`📦 文件大小: ${(stats.size / 1024).toFixed(2)} KB`);
  }
}

// 运行构建
const bundler = new BattleGameBundler();
bundler.build();