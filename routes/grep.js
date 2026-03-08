/**
 * grep 核心模块 - 负责执行 grep 命令搜索代码
 * 支持安全输入验证、跨平台兼容、多种搜索模式
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const log = require('../log');

let projectPath = '';

// 初始化项目路径
function initProjectPath() {
  try {
    const config = require('../package.json');
    projectPath = config.projectPath || process.cwd();
  } catch (e) {
    projectPath = process.cwd();
  }
  return projectPath;
}

// 获取当前项目路径
function getProjectPath() {
  if (!projectPath) {
    initProjectPath();
  }
  return projectPath;
}

// 设置项目路径
function setProjectPath(newPath) {
  if (!newPath || typeof newPath !== 'string') {
    return false;
  }
  
  try {
    const resolvedPath = path.resolve(newPath);
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
      projectPath = resolvedPath;
      return true;
    }
  } catch (e) {
    log.error('设置项目路径失败:', e.message);
  }
  return false;
}

/**
 * 验证并清理用户输入，防止命令注入
 * @param {string} input - 用户输入
 * @returns {string} - 清理后的安全输入
 */
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  // 移除危险字符
  return input
    .replace(/[\r\n]/g, '')      // 移除换行符
    .replace(/[;&|`$<>]/g, '')   // 移除 shell 元字符
    .replace(/\\/g, '\\\\')       // 转义反斜杠
    .replace(/'/g, "\\'")        // 转义单引号
    .trim();
}

/**
 * 验证路径是否存在
 * @param {string} searchPath - 要验证的路径
 * @returns {boolean}
 */
function validatePath(searchPath) {
  try {
    const resolvedPath = path.resolve(searchPath);
    return fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory();
  } catch (e) {
    return false;
  }
}

/**
 * 构建 grep 命令
 * @private
 */
function buildCommand(template, data) {
  return template
    .replace(/#{WORD}/g, data.word)
    .replace(/#{FILES}/, data.files)
    .replace(/#{NUMBER}/, data.number);
}

/**
 * 执行命令并返回 Promise
 * @private
 */
function executeCommand(command, options = {}) {
  log.info('执行命令:', command);
  
  return new Promise((resolve, reject) => {
    const child = exec(command, {
      encoding: 'utf8',
      timeout: options.timeout || 60000,
      maxBuffer: options.maxBuffer || 50 * 1024 * 1024,
      killSignal: 'SIGTERM',
      cwd: options.cwd || null,
      env: { ...process.env, ...options.env }
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data;
    });
    
    child.stderr.on('data', (data) => {
      stderr += data;
    });
    
    child.on('error', (err) => {
      log.error('Grep 进程错误:', err);
      reject(err);
    });
    
    child.on('exit', (code, signal) => {
      log.debug('Grep 进程退出，代码:', code);
      
      if (code === 0) {
        resolve(stdout);
      } else if (code === 1) {
        // grep 没找到匹配时返回 exit code 1，这是正常的
        resolve('');
      } else {
        const err = new Error(stderr || `Grep 命令失败，退出码: ${code}`);
        err.code = code;
        err.signal = signal;
        reject(err);
      }
    });
  });
}

// grep 命令模板
const GREP_TEMPLATES = {
  findInFiles: "grep -r -n '#{WORD}' #{FILES}",
  findInFilesWithNum: "grep -r -n '#{WORD}' -C #{NUMBER} #{FILES}",
  findInFilesIgnoreCase: "grep -r -i -n '#{WORD}' #{FILES}",
  findInFilesWord: "grep -r -w -n '#{WORD}' #{FILES}",
  findInFilesLineNum: "grep -r -n '#{WORD}' #{FILES}"
};

// ============ 公共 API ============

/**
 * 搜索所有文件
 * @param {string} word - 搜索关键词
 * @returns {Promise<string>}
 */
async function findInAll(word) {
  word = sanitizeInput(word);
  if (!word) {
    throw new Error('搜索关键词不能为空');
  }
  
  const searchPath = path.join(projectPath, '*');
  const command = buildCommand(GREP_TEMPLATES.findInFiles, { word, files: searchPath });
  return executeCommand(command);
}

/**
 * 在指定文件中搜索
 * @param {string} word - 搜索关键词
 * @param {string} files - 文件模式（如 *.js）
 * @returns {Promise<string>}
 */
async function findInFiles(word, files) {
  word = sanitizeInput(word);
  files = sanitizeInput(files) || '*';
  
  if (!word) {
    throw new Error('搜索关键词不能为空');
  }
  
  const searchPath = path.join(projectPath, files);
  const command = buildCommand(GREP_TEMPLATES.findInFiles, { word, files: searchPath });
  return executeCommand(command);
}

/**
 * 搜索所有文件并显示上下文行数
 * @param {string} word - 搜索关键词
 * @param {number} number - 上下文行数
 * @returns {Promise<string>}
 */
async function findAllWithNum(word, number) {
  word = sanitizeInput(word);
  number = Math.max(0, Math.min(parseInt(number, 10) || 2, 10)); // 限制在 0-10
  
  if (!word) {
    throw new Error('搜索关键词不能为空');
  }
  
  const searchPath = path.join(projectPath, '*');
  const command = buildCommand(GREP_TEMPLATES.findInFilesWithNum, { word, files: searchPath, number });
  return executeCommand(command);
}

/**
 * 在指定文件中搜索并显示上下文行数
 * @param {string} word - 搜索关键词
 * @param {string} files - 文件模式
 * @param {number} number - 上下文行数
 * @returns {Promise<string>}
 */
async function findInFilesWithNum(word, files, number) {
  word = sanitizeInput(word);
  files = sanitizeInput(files) || '*';
  number = Math.max(0, Math.min(parseInt(number, 10) || 2, 10));
  
  if (!word) {
    throw new Error('搜索关键词不能为空');
  }
  
  const searchPath = path.join(projectPath, files);
  const command = buildCommand(GREP_TEMPLATES.findInFilesWithNum, { word, files: searchPath, number });
  return executeCommand(command);
}

/**
 * 不区分大小写搜索所有文件
 * @param {string} word - 搜索关键词
 * @returns {Promise<string>}
 */
async function findInAllIgnoreCase(word) {
  word = sanitizeInput(word);
  if (!word) {
    throw new Error('搜索关键词不能为空');
  }
  
  const searchPath = path.join(projectPath, '*');
  const command = buildCommand(GREP_TEMPLATES.findInFilesIgnoreCase, { word, files: searchPath });
  return executeCommand(command);
}

/**
 * 不区分大小写搜索 - 带上下文
 * @param {string} word - 搜索关键词
 * @param {string} files - 文件模式
 * @param {number} number - 上下文行数
 * @returns {Promise<string>}
 */
async function findInFilesWithNumIgnoreCase(word, files, number) {
  word = sanitizeInput(word);
  files = sanitizeInput(files) || '*';
  number = Math.max(0, Math.min(parseInt(number, 10) || 2, 10));
  
  if (!word) {
    throw new Error('搜索关键词不能为空');
  }
  
  const searchPath = path.join(projectPath, files);
  const commandTemplate = "grep -r -i -n '#{WORD}' -C #{NUMBER} #{FILES}";
  const command = buildCommand(commandTemplate, { word, files: searchPath, number });
  return executeCommand(command);
}

/**
 * 不区分大小写搜索所有文件 - 带上下文
 * @param {string} word - 搜索关键词
 * @param {number} number - 上下文行数
 * @returns {Promise<string>}
 */
async function findAllWithNumIgnoreCase(word, number) {
  word = sanitizeInput(word);
  number = Math.max(0, Math.min(parseInt(number, 10) || 2, 10));
  
  if (!word) {
    throw new Error('搜索关键词不能为空');
  }
  
  const searchPath = path.join(projectPath, '*');
  const commandTemplate = "grep -r -i -n '#{WORD}' -C #{NUMBER} #{FILES}";
  const command = buildCommand(commandTemplate, { word, files: searchPath, number });
  return executeCommand(command);
}

/**
 * 不区分大小写搜索
 * @param {string} word - 搜索关键词
 * @param {string} files - 文件模式
 * @returns {Promise<string>}
 */
async function findIgnoreCase(word, files) {
  word = sanitizeInput(word);
  files = sanitizeInput(files) || '*';
  
  if (!word) {
    throw new Error('搜索关键词不能为空');
  }
  
  const searchPath = path.join(projectPath, files);
  const command = buildCommand(GREP_TEMPLATES.findInFilesIgnoreCase, { word, files: searchPath });
  return executeCommand(command);
}

/**
 * 单词匹配搜索
 * @param {string} word - 搜索关键词
 * @param {string} files - 文件模式
 * @returns {Promise<string>}
 */
async function findWord(word, files) {
  word = sanitizeInput(word);
  files = sanitizeInput(files) || '*';
  
  if (!word) {
    throw new Error('搜索关键词不能为空');
  }
  
  const searchPath = path.join(projectPath, files);
  const command = buildCommand(GREP_TEMPLATES.findInFilesWord, { word, files: searchPath });
  return executeCommand(command);
}

/**
 * 只搜索指定行号
 * @param {string} word - 搜索关键词
 * @param {number} number - 行号
 * @returns {Promise<string>}
 */
async function findLineNumber(word, number) {
  word = sanitizeInput(word);
  number = parseInt(number, 10) || 0;
  
  if (!word) {
    throw new Error('搜索关键词不能为空');
  }
  
  const searchPath = path.join(projectPath, '*');
  const command = buildCommand(GREP_TEMPLATES.findInFilesLineNum, { word, files: searchPath });
  return executeCommand(command);
}

// 初始化
initProjectPath();

// 导出模块
module.exports = {
  // 路径管理
  getProjectPath,
  setProjectPath,
  validatePath,
  initProjectPath,
  
  // 输入处理
  sanitizeInput,
  
  // 搜索 API
  findInAll,
  findInFiles,
  findAllWithNum,
  findInFilesWithNum,
  findIgnoreCase,
  findWord,
  findLineNumber,
  // 忽略大小写搜索
  findInAllIgnoreCase,
  findInFilesWithNumIgnoreCase,
  findAllWithNumIgnoreCase
};