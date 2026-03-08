/**
 * 命令处理模块 - 处理 HTTP 请求并调用 grep 功能
 * 负责输入验证、结果解析、响应格式化
 */

const grep = require('./grep');
const log = require('../log');

// 错误码定义
const ERROR_CODES = {
  EMPTY_WORD: 1001,
  INVALID_PATH: 1002,
  SEARCH_FAILED: 1003,
  INTERNAL_ERROR: 1000
};

/**
 * 发送成功响应
 */
function send(res, data) {
  res.json({
    code: 0,
    message: 'success',
    data
  });
}

/**
 * 发送错误响应
 */
function sendError(res, err, code = ERROR_CODES.INTERNAL_ERROR) {
  const message = err instanceof Error ? err.message : String(err);
  res.json({
    code,
    message,
    data: null
  });
}

/**
 * 解析 grep 命令输出结果为结构化数据
 */
function parseCommendText(basePath, text) {
  if (!text || !text.trim()) {
    return [];
  }
  
  const data = [];
  const codeBlocks = text.split('\n--\n');
  
  // 匹配文件名和行号 - 支持两种格式:
  // 1. Linux: /path/to/file.js-20- 或 /path/to/file.js:20:
  // 2. macOS: file.js:20: 或 ./file.js:20:
  const reline = /^(.*?)(\.js|\.html|\.css|\.json|\.php|\.node|\.htm|\.ts|\.jsx|\.tsx|\.vue|\.py|\.rb|\.go|\.java|\.cpp|\.c|\.h|\.md|\.yaml|\.yml)(:|-)(\d+)(:|-)/;

  for (const block of codeBlocks) {
    if (!block.trim()) continue;
    
    const codes = block.split('\n');
    const blockData = {
      filename: '',      // 文件名（相对路径）
      fullPath: '',      // 完整路径
      suffix: '',
      number: [],
      code: []
    };
    
    codes.forEach((code, idx) => {
      if (!code.trim()) return;
      
      try {
        if (idx === 0) {
          const matched = code.match(reline);
          if (matched) {
            let fullPath = matched[1];
            // 如果是相对路径，添加基础路径
            if (!fullPath.startsWith('/') && !fullPath.startsWith('.')) {
              fullPath = path.join(basePath, fullPath);
            }
            
            // 完整路径
            blockData.fullPath = fullPath;
            
            // 获取文件名部分
            const filename = path.basename(fullPath);
            blockData.filename = filename;
            blockData.suffix = matched[2].slice(1); // 移除点号
            blockData.number.push(parseInt(matched[4], 10));
          }
        }
        const cleanCode = code.replace(reline, '');
        blockData.code.push(cleanCode);
      } catch (e) {
        blockData.code.push(code);
      }
    });
    
    if (blockData.filename || blockData.code.length > 0) {
      data.push(blockData);
    }
  }
  
  log.debug('解析结果:', JSON.stringify(data));
  return data;
}

/**
 * 处理 GET 请求
 */
function parse(req, res) {
  const { word, files, number, path: searchPath } = req.query || {};
  
  log.info('搜索请求:', { word, files, number, path: searchPath });

  // 验证：搜索关键词不能为空
  if (!word || !String(word).trim()) {
    sendError(res, '搜索关键词不能为空', ERROR_CODES.EMPTY_WORD);
    return;
  }
  
  // 验证并设置搜索路径
  if (searchPath) {
    if (!grep.validatePath(searchPath)) {
      sendError(res, `指定路径不存在或无效: ${searchPath}`, ERROR_CODES.INVALID_PATH);
      return;
    }
    grep.setProjectPath(searchPath);
  }
  
  let promise;
  const ignoreCase = req.query.ignoreCase === 'true' || req.query.ignoreCase === true;
  
  try {
    // 根据参数组合选择搜索方法
    if (files && number) {
      // 文件 + 上下文
      if (ignoreCase) {
        promise = grep.findInFilesWithNumIgnoreCase(word, files, number);
      } else {
        promise = grep.findInFilesWithNum(word, files, number);
      }
    } else if (files) {
      // 只指定文件
      if (ignoreCase) {
        promise = grep.findIgnoreCase(word, files);
      } else {
        promise = grep.findInFiles(word, files);
      }
    } else if (number) {
      // 只指定上下文
      if (ignoreCase) {
        promise = grep.findAllWithNumIgnoreCase(word, number);
      } else {
        promise = grep.findAllWithNum(word, number);
      }
    } else {
      // 搜索所有文件
      if (ignoreCase) {
        promise = grep.findInAllIgnoreCase(word);
      } else {
        promise = grep.findInAll(word);
      }
    }
    
    promise
      .then((rawData) => {
        const currentPath = grep.getProjectPath();
        const resultFormat = parseCommendText(currentPath, rawData);
        send(res, resultFormat);
        return resultFormat;
      })
      .catch((err) => {
        log.error('搜索错误:', err);
        sendError(res, err.message || '搜索执行失败', ERROR_CODES.SEARCH_FAILED);
      });
  } catch (err) {
    log.error('异常:', err);
    sendError(res, `服务器内部错误: ${err.message}`, ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * 处理 POST 请求
 */
function parsePost(req, res) {
  const { word, files, number, path: searchPath } = req.body || {};
  req.query = { word, files, number, path: searchPath };
  parse(req, res);
}

module.exports = { parse, parsePost, parseCommendText, send, sendError };