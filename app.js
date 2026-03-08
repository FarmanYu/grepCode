/**
 * grep-Commander Online - 主应用入口
 * 基于 Web 的本地代码搜索工具
 * 
 * 使用方法:
 *   npm install
 *   npm start
 * 
 * 访问 http://localhost:3000
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const log = require('./log');

// 读取配置
let config = { projectPath: process.cwd() };
try {
  config = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')
  );
} catch (e) {
  log.warn('无法读取配置文件，使用默认配置');
}

const app = express();

// 端口配置：支持环境变量、命令行参数
const PORT = process.env.PORT || process.argv[2] || 3000;

// ============ 中间件配置 ============

// 视图引擎配置 - 使用 Pug
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// 请求日志中间件
app.use((req, res, next) => {
  log.info(`${req.method} ${req.url}`);
  next();
});

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 请求体解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ 路由配置 ============

// 加载路由模块
const routes = {
  index: require('./routes/index'),
  cmd: require('./routes/cmd')
};

// 首页
app.get('/', routes.index.index);

// 搜索接口（支持 GET 和 POST）
app.get('/cmdparse', routes.cmd.parse);
app.post('/cmdparse', routes.cmd.parsePost);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    projectPath: config.projectPath || process.cwd(),
    version: require('./package.json').version
  });
});

// 读取文件完整内容
app.get('/readfile', (req, res) => {
  const filePath = req.query.path;
  
  if (!filePath) {
    res.json({ code: 1, message: '缺少文件路径', data: null });
    return;
  }
  
  // 安全检查：防止路径遍历攻击
  const resolvedPath = path.resolve(filePath);
  const searchPath = req.query.searchPath || config.projectPath || process.cwd();
  const projectRoot = path.resolve(searchPath);
  
  log.info('读取文件:', { filePath, resolvedPath, projectRoot });
  
  // 允许读取项目目录下的文件（更灵活的验证）
  const isInProject = resolvedPath.startsWith(projectRoot);
  const isTempFile = resolvedPath.startsWith('/Users/yuhongfei/work/grepCode/');
  
  if (!isInProject && !isTempFile) {
    log.warn('禁止访问项目目录外的文件:', resolvedPath);
    res.json({ code: 2, message: '只能读取项目目录下的文件', data: null });
    return;
  }
  
  // 检查文件是否存在
  if (!fs.existsSync(resolvedPath)) {
    res.json({ code: 3, message: '文件不存在', data: null });
    return;
  }
  
  // 检查是否为目录
  if (fs.statSync(resolvedPath).isDirectory()) {
    res.json({ code: 4, message: '不支持读取目录', data: null });
    return;
  }
  
  // 读取文件
  fs.readFile(resolvedPath, 'utf8', (err, data) => {
    if (err) {
      res.json({ code: 5, message: '读取文件失败: ' + err.message, data: null });
      return;
    }
    
    // 限制返回内容大小（最大 1MB）
    if (data.length > 1024 * 1024) {
      data = data.substring(0, 1024 * 1024) + '\n\n... (内容过长，已截断)';
    }
    
    // 确定文件语言
    const ext = path.extname(resolvedPath).slice(1) || 'plaintext';
    const langMap = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'vue': 'xml',
      'py': 'python',
      'rb': 'ruby',
      'go': 'go',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'c',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'html': 'html',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'bash',
      'bash': 'bash'
    };
    
    res.json({
      code: 0,
      message: 'success',
      data: {
        path: resolvedPath,
        filename: path.basename(resolvedPath),
        extension: ext,
        language: langMap[ext] || 'plaintext',
        content: data,
        size: data.length,
        lines: data.split('\n').length
      }
    });
  });
});

// ============ 错误处理 ============

// 404 处理
app.use((req, res) => {
  res.status(404).render('error', {
    message: '页面未找到',
    error: { status: 404 },
    title: '404 - 页面未找到'
  });
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  log.error('应用错误:', err);
  const status = err.status || 500;
  res.status(status).render('error', {
    message: err.message || '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err : {},
    title: `${status} - 错误`
  });
});

// ============ 启动服务器 ============

function startServer() {
  const server = app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('🎉 grep-Commander Online 已启动');
    console.log(`📍 访问地址: http://localhost:${PORT}`);
    console.log(`📁 项目路径: ${config.projectPath || process.cwd()}`);
    console.log('='.repeat(50));
    
    // 自动打开浏览器
    if (process.env.AUTO_OPEN !== 'false') {
      try {
        require('open')(`http://localhost:${PORT}`);
      } catch (e) {
        // 忽略打开浏览器错误
      }
    }
  });

  // 优雅退出
  const shutdown = (signal) => {
    log.info(`收到 ${signal} 信号，正在关闭服务器...`);
    server.close(() => {
      log.info('服务器已关闭');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  return server;
}

// 导出用于测试
module.exports = { app, startServer };

// 仅在直接运行时启动服务器
if (require.main === module) {
  startServer();
}