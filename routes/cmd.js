var grep = require("./grep");
var interfaceAction = {};

interfaceAction.send = function(data){
	interfaceAction._res.json({data:data});
};
/****
 * @param word {string}
 * @param files
 * @param number
 * @param path
 ****/
interfaceAction.parse = function(req, res) {
	interfaceAction._res = res;
	var querys = req.query;
	var word = querys.word;
	var files = querys.files;
	var number = querys.number;
	var path = querys.path;
	var promise = null;
	var self = this;

	if(!word){
		interfaceAction.send("no result!");
		return;
	}
	if(path){
		grep.setPath( path );
	}
	console.log(querys);
	if(files && number){
		promise = grep.findInFilesWithNum(word, files, number);
	} else{
		if(!number && files){
			promise = grep.findInFiles(word, files);
		}
		if(!files && number){
			promise = grep.findAllWithNum(word, number);
		}
		if(!files && !number){
			promise = grep.findInAll(word);
		}
	}

	promise.then(function(data){
		interfaceAction.send(data);
	},function(err){
		console.log("error: \n", err );
		interfaceAction.send(err);
	});
};

module.exports = interfaceAction;