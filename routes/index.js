var fs = require("fs");
var config = JSON.parse(fs.readFileSync("package.json"));
var projectPath = config.projectPath;

exports.index = function(req, res){
  res.render('index', { projectPath : projectPath });
};