/**
 * 日志模块 - 使用 log4js
 */

const log4js = require('log4js');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 配置 log4js
log4js.configure({
  appenders: {
    console: { type: 'console' },
    dateFile: {
      type: 'dateFile',
      filename: path.join(logDir, 'log.log'),
      pattern: '_yyyy-MM-dd',
      alwaysIncludePattern: false,
      maxLogSize: 10 * 1024 * 1024, // 10MB
      backups: 5
    }
  },
  categories: {
    default: { appenders: ['console', 'dateFile'], level: 'info' },
    error: { appenders: ['console', 'dateFile'], level: 'error' }
  },
  replaceConsole: true
});

const logger = log4js.getLogger('default');
const errorLogger = log4js.getLogger('error');

// 导出不同级别的日志函数
module.exports = {
  info: (...args) => logger.info(...args),
  debug: (...args) => logger.debug(...args),
  warn: (...args) => logger.warn(...args),
  error: (...args) => errorLogger.error(...args),
  getLogger: () => logger,
  getErrorLogger: () => errorLogger
};