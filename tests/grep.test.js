/**
 * 单元测试 - grep-Commander Online
 * 运行: npm test
 */

const assert = require('assert');
const path = require('path');

const TEST_TIMEOUT = 15000;

describe('grep-Commander 测试套件', function() {
  this.timeout(TEST_TIMEOUT);
  
  describe('1. grep 模块 - 输入验证', function() {
    const grep = require('../routes/grep');
    
    describe('sanitizeInput - 输入清理', function() {
      it('应该返回空字符串当输入为空', function() {
        assert.equal(grep.sanitizeInput(''), '');
        assert.equal(grep.sanitizeInput(null), '');
        assert.equal(grep.sanitizeInput(undefined), '');
      });
      
      it('应该移除危险字符', function() {
        assert.equal(grep.sanitizeInput('test;rm -rf'), 'testrm -rf');
        assert.equal(grep.sanitizeInput('test|grep'), 'testgrep');
        assert.equal(grep.sanitizeInput('test`cmd`'), 'testcmd');
        assert.equal(grep.sanitizeInput('test$var'), 'testvar');
        assert.equal(grep.sanitizeInput('test&cmd'), 'testcmd');
        assert.equal(grep.sanitizeInput('test cmd'), 'test cmd');
      });
      
      it('应该保留安全的搜索字符', function() {
        assert.equal(grep.sanitizeInput('hello world'), 'hello world');
        assert.equal(grep.sanitizeInput('user.name'), 'user.name');
        assert.equal(grep.sanitizeInput('test*'), 'test*');
      });
    });
    
    describe('validatePath - 路径验证', function() {
      it('应该返回 true 对于存在的路径', function() {
        assert.equal(grep.validatePath(__dirname), true);
        assert.equal(grep.validatePath('.'), true);
        assert.equal(grep.validatePath(process.cwd()), true);
      });
      
      it('应该返回 false 对于不存在的路径', function() {
        assert.equal(grep.validatePath('/non/existent/path'), false);
      });
    });
    
    describe('getProjectPath / setProjectPath - 路径管理', function() {
      const originalPath = grep.getProjectPath();
      
      after(function() {
        grep.setProjectPath(originalPath);
      });
      
      it('应该正确获取项目路径', function() {
        const p = grep.getProjectPath();
        assert.ok(p && typeof p === 'string');
      });
      
      it('应该正确设置项目路径', function() {
        const result = grep.setProjectPath(__dirname);
        assert.equal(result, true);
        assert.equal(grep.getProjectPath(), path.resolve(__dirname));
      });
      
      it('应该拒绝无效路径', function() {
        assert.equal(grep.setProjectPath('/invalid/path/12345'), false);
        assert.equal(grep.setProjectPath(''), false);
        assert.equal(grep.setProjectPath(null), false);
      });
    });
  });
  
  describe('2. grep 模块 - 搜索功能', function() {
    const grep = require('../routes/grep');
    
    before(function() {
      grep.setProjectPath(path.join(__dirname, '..'));
    });
    
    describe('findInFiles - 文件搜索', function() {
      it('应该返回 Promise', function() {
        const result = grep.findInFiles('describe', '*.js');
        assert.equal(typeof result.then, 'function');
      });
      
      it('应该搜索到结果', function(done) {
        grep.findInFiles('describe', '*.js')
          .then(function(data) {
            assert.ok(typeof data === 'string');
            done();
          })
          .catch(done);
      });
      
      it('应该处理空关键词', function(done) {
        grep.findInFiles('', '*.js')
          .then(function() {
            done(new Error('应该抛出错误'));
          })
          .catch(function(err) {
            assert.ok(err.message.includes('不能为空'));
            done();
          })
          .catch(done);
      });
    });
    
    describe('findInAll - 全局搜索', function() {
      it('应该搜索所有文件', function(done) {
        grep.findInAll('describe')
          .then(function(data) {
            assert.ok(typeof data === 'string');
            done();
          })
          .catch(done);
      });
    });
    
    describe('findInFilesWithNum - 上下文搜索', function() {
      it('应该返回包含上下文的结果', function(done) {
        grep.findInFilesWithNum('describe', '*.js', 2)
          .then(function(data) {
            assert.ok(typeof data === 'string');
            done();
          })
          .catch(done);
      });
    });
  });
  
  describe('3. cmd 模块 - 结果解析', function() {
    const { parseCommendText } = require('../routes/cmd');
    const testPath = '/test/project';
    
    describe('parseCommendText - 解析 grep 输出', function() {
      it('应该返回空数组当输入为空', function() {
        assert.deepEqual(parseCommendText(testPath, ''), []);
        assert.deepEqual(parseCommendText(testPath, null), []);
      });
      
      it('应该正确解析单行结果', function() {
        const input = '/path/to/file.js-20-    console.log("test");';
        const result = parseCommendText(testPath, input);
        
        assert.ok(Array.isArray(result));
        assert.ok(result[0].filename.includes('file.js'));
        assert.equal(result[0].suffix, 'js');
        assert.ok(result[0].number.includes(20));
      });
      
      it('应该支持多种文件类型', function() {
        const types = [
          { ext: 'js', input: '/test.js-10-    var x;' },
          { ext: 'html', input: '/test.html-5-    <div>' },
          { ext: 'css', input: '/test.css-3-    color: red;' },
          { ext: 'ts', input: '/test.ts-15-    const x: string;' },
          { ext: 'vue', input: '/test.vue-8-    <template>' },
          { ext: 'py', input: '/test.py-1-    print("hello")' }
        ];
        
        types.forEach(function(t) {
          const result = parseCommendText(testPath, t.input);
          assert.equal(result[0].suffix, t.ext);
        });
      });
      
      it('应该处理冒号格式', function() {
        const input = '/path/file.js:20:    console.log("test");';
        const result = parseCommendText(testPath, input);
        
        assert.ok(result[0].number.includes(20));
      });
    });
  });
  
  describe('4. cmd 模块 - send/sendError', function() {
    const { send, sendError } = require('../routes/cmd');
    
    it('send 应该返回正确的 JSON 格式', function() {
      const mockRes = {
        json: function(data) {
          assert.equal(data.code, 0);
          assert.equal(data.message, 'success');
          assert.deepEqual(data.data, [{ test: 'data' }]);
        }
      };
      send(mockRes, [{ test: 'data' }]);
    });
    
    it('sendError 应该返回正确的错误格式', function() {
      const mockRes = {
        json: function(data) {
          assert.equal(data.code, 1001);
          assert.equal(data.message, '测试错误');
          assert.equal(data.data, null);
        }
      };
      sendError(mockRes, '测试错误', 1001);
    });
  });
});

console.log('测试文件加载成功，运行 npm test 执行测试');