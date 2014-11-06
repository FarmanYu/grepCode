var exec = require("child_process").exec;
var fs = require("fs");
var config = JSON.parse(fs.readFileSync("package.json"));
var projectPath = config.projectPath;
var Promise = require("promise");
var path = require("path");
var logger = require('../log').logger;


var grepCommender = {
	findInFiles: "grep -r -n '#{WORD}' #{FILES}",
	findInFilesWithNum: "grep -r -n '#{WORD}' -C #{NUMBER} #{FILES}"
};
var commenderPaser = {
	setPath: function(path) {
		projectPath = path;
	},
	findInAll: function(word) {
		var commendText = this._getCommend(grepCommender.findInFiles, {
			"word": word,
			"files": projectPath + "/*"
		});
		return this._concatCommend(commendText);
	},
	findInFiles: function(word, files) {
		var commendText = this._getCommend(grepCommender.findInFiles, {
			"word": word,
			"files": projectPath + "/" + files
		});
		return this._concatCommend(commendText);
	},
	findAllWithNum: function(word, number) {
		var commendText = this._getCommend(grepCommender.findInFilesWithNum, {
			"word": word,
			"files": projectPath + "/*",
			"number": number
		});
		return this._concatCommend(commendText);
	},
	findInFilesWithNum: function(word, files, number) {
		var commendText = this._getCommend(grepCommender.findInFilesWithNum, {
			"word": word,
			"files": projectPath + "/" + files,
			"number": number
		});
		return this._concatCommend(commendText);
	},
	_concatCommend: function(commend) {
		logger.info(commend);
		return new Promise(function(resolve, reject) {
			var cd = exec(commend, {
				encoding: 'utf8',
				timeout: 0,
				maxBuffer: 210241024,
				killSignal: 'SIGTERM',
				cwd: null,
				env: null
			});
			cd.stdout.on("data", function(data) {
				logger.info( data );
				resolve(data);
			});
			cd.stdout.on("error", function(err) {
				reject(err);
			});
			cd.on('exit', function(code, signal) {
				logger.info("grep process exit...");
			});
		});
	},
	_getCommend: function(commend, data) {
		return commend.replace(/#{WORD}/g, data.word)
			.replace(/#{FILES}/, data.files)
			.replace(/#{NUMBER}/, data.number);
	}
}

module.exports = commenderPaser;