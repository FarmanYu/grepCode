/**
 * 首页路由
 */

const fs = require('fs');
const path = require('path');

// 读取配置获取项目路径
let projectPath = process.cwd();
try {
  const config = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')
  );
  projectPath = config.projectPath || projectPath;
} catch (e) {
  // 使用默认路径
}

/**
 * 渲染首页
 */
function index(req, res) {
  res.render('index', { 
    projectPath,
    title: 'grep-Commander Online'
  });
}

module.exports = { index };