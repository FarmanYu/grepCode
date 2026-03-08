# grep-Commander Online

基于 Web 的本地代码搜索工具，方便在浏览器中搜索本地项目代码。

## 功能特性

- 🔍 **代码搜索** - 使用 grep 命令搜索本地代码
- 🌐 **Web 界面** - 通过浏览器直观地搜索和查看结果
- 📝 **语法高亮** - 搜索结果支持语法高亮显示
- 🔒 **安全防护** - 输入验证，防止命令注入
- 🛡️ **错误处理** - 完善的错误处理和输入验证
- ✅ **单元测试** - 包含完整的单元测试

## 安装

```bash
npm install
```

## 启动

```bash
npm start
```

访问 http://localhost:3000

## 配置

在 `package.json` 中修改 `projectPath` 为你的项目路径：

```json
{
  "projectPath": "/path/to/your/project"
}
```

## 使用方法

1. 在页面中输入搜索关键词
2. (可选) 指定文件匹配模式，如 `*.js`、`*.vue`
3. (可选) 指定上下文行数
4. (可选) 指定搜索路径
5. 点击"开始查找"

## API

### 搜索接口

- **GET** `/cmdparse`
- **POST** `/cmdparse`

#### 请求参数

| 参数 | 类型 | 说明 |
|------|------|------|
| word | string | 搜索关键词（必填） |
| files | string | 文件匹配模式，如 `*.js` |
| number | number | 上下文行数 |
| path | string | 搜索路径（覆盖默认项目路径） |

#### 响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "filename": "path/to/file.js",
      "number": [20],
      "suffix": "js",
      "code": ["line1", "line2"]
    }
  ]
}
```

### 错误码

| 错误码 | 说明 |
|--------|------|
| 1001 | 搜索关键词为空 |
| 1002 | 路径不存在或无效 |
| 1003 | 搜索执行失败 |
| 1000 | 服务器内部错误 |

### 健康检查

- **GET** `/health`

## 测试

```bash
npm test
```

## 技术栈

- **Express** - Web 框架
- **Pug** - 模板引擎
- **log4js** - 日志管理
- **Mocha + Chai** - 单元测试
- **Bootstrap** - UI 框架

## 目录结构

```
grepCode/
├── app.js              # 主入口
├── log.js              # 日志模块
├── package.json        # 项目配置
├── routes/
│   ├── index.js        # 首页路由
│   ├── cmd.js          # 搜索接口
│   └── grep.js         # grep 核心模块
├── views/
│   ├── index.pug       # 首页模板
│   └── error.pug       # 错误页面
├── public/
│   ├── js/             # 前端 JS
│   └── css/            # 样式文件
├── logs/               # 日志目录
└── tests/              # 测试文件
```

## 注意事项

- 搜索路径必须存在且为目录
- 搜索关键词不能包含危险字符（`;`, `|`, `` ` ``, `$` 等）
- 建议在 macOS/Linux 上使用，Windows 需要安装 grep 或使用 WSL