var exec = require("child_process").exec;
var fs = require("fs");
var config = JSON.parse(fs.readFileSync("package.json"));
var projectPath = config.projectPath;
var Promise = require("promise");

var grepCommender = {
	"findInAll": "grep -r #{WORD} *",
	"findInFiles": "grep -r #{WORD} #{FILES}",
	"findAllWithNum": "grep -r #{WORD} * -C #{NUMBER}",
	"findInFilesWithNum": "grep -r #{WORD} #{FILES} -C #{NUMBER}"
};
var commenderPaser = {
	findInAll:function(word, callback){
		var commendText = this.getCommend(grepCommender.findInAll, {"word":word});
		return this.concatCommend( commendText );
	},
	findInFiles:function(word, files){
		var commendText = this.getCommend(grepCommender.findInFiles,{"word":word,"files":files});
		return this.concatCommend( commendText );
	},
	findAllWithNum:function(word, number){
		var commendText = this.getCommend(grepCommender.findAllWithNum,{"word":word,"number":number});
		return this.concatCommend( commendText );
	},
	findInFilesWithNum:function(word, files, number){
		var commendText = this.getCommend(grepCommender.findInFilesWithNum,{"word":word,"files":files,"number":number});
		return this.concatCommend( commendText );
	},
	concatCommend : function(commend){
		console.log( commend );
		return new Promise(function(resolve, reject){
			exec(commend, function(err, stdout, outerr){
				if(err || outerr) reject(err || outerr)
				else resolve(stdout)
			});
		});
	},
	getCommend:function(commend, data){
		return commend.replace(/#{WORD}/g, data.word).replace(/#{FILES}/,data.files).replace(/#{NUMBER}/,data.number);
	}
}
/****
 * @param word {string}
 * @param files
 * @param number
 *
 ****/
exports.parse = function(req, res) {
	var querys = req.query;
	var word = querys.word;
	var files = querys.files;
	var number = querys.number;
	var promise = null;
	if(!word){
		res.send("no result!");
	}
	console.log(querys);
	if(files && number){
		promise = commenderPaser.findInFilesWithNum(word, files, number);
	} else{
		if(!number && files){
			promise = commenderPaser.findInFiles(word, files);
		}
		if(!files && number){
			promise = commenderPaser.findAllWithNum(word, number);
		}
		if(!files && !number){
			promise = commenderPaser.findInAll(word);
		}
	}

	promise.then(function(data){
		res.send(data);
	}).then(function(err){
		res.send(err);
	})
};