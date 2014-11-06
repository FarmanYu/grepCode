var grep = require("./grep");
var logger = require("../log").logger;
var interfaceAction = {};

interfaceAction.send = function(data){
	interfaceAction._res.json({data:data});
};
/****
 * @param text {string}
 *
 * 
 *	node_modules/jade/runtime.js-156-    .replace(/&/g, '&amp;')
 *	node_modules/jade/runtime.js-157-    .replace(/</g, '&lt;')
 *	node_modules/jade/runtime.js-158-    .replace(/>/g, '&gt;')
 *	node_modules/jade/runtime.js-159-    .replace(/"/g, '&quot;');
 *	node_modules/jade/runtime.js-160-  if (result === '' + html) return html;
 *	node_modules/jade/runtime.js-161-  else return result;
 *	node_modules/jade/runtime.js-162-};
 *	node_modules/jade/runtime.js-163-
 *	node_modules/jade/runtime.js-173-
 *	node_modules/jade/runtime.js-174-exports.rethrow = function rethrow(err, filename, lineno, str){
 *	node_modules/jade/runtime.js-175-  if (!(err instanceof Error)) throw err;
 *	node_modules/jade/runtime.js-176-  if ((typeof window != 'undefined' || !filename) && !str) {
 *	--
 *	package.json-1-{
 *	package.json-2-  "name": "grep-Commender-online",
 *	package.json-3-  "version": "1.0.0",
 *	package.json-4-  "private": true,
 *	package.json-5-  "scripts": {
 *	package.json-6-    "start": "node app.js"
 *	package.json-7-  },
 *	package.json-8-  "projectPath": "/home/hfyu/project6.0/front",
 *	package.json-9-  "dependencies": {
 *	package.json-10-    "express": "3.5.1",
 *	package.json:11:    "jade": "*",
 *	package.json-12-    "log4js": "^0.6.21",
 *	package.json-13-    "open": "0.0.5",
 *	package.json-14-    "promise": "^6.0.1"
 *	package.json-15-  }
 *	package.json-16-}
 *
 * @return data {Array}
 * 
 * [
 *  {
 *	 	filename:"booking.js",
 *	 	number:[20],
 *      suffix:"js",
 *	 	code : []
 *  }
 * ]
 *
 **/
interfaceAction.parseCommendText = function(path, text ){
	var data = [];
	var codeBlocks = text.split("\n--\n");
	var reline = /^(.*)\.(js|html|css|json|php|node|htm)(:|-)(\d+)(:|-)/;

	codeBlocks.forEach(function(block){
		var codes = block.split("\n");
		var blockData = {
			filename:"",
			number:[],
			suffix:"",
			code:[]
		};
		codes.forEach(function(code, idx){
			if(code.trim().length){
				if(idx === 0){
					var codedata = code.match(reline);
					blockData.filename = codedata[1].replace(path, "") + "." + codedata[2];
					blockData.suffix = codedata[2];
					blockData.number.push(codedata[4]);
				}
				blockData.code.push( code.replace(codedata[0], "") );
			}
		});
		data.push(blockData);
	});
	console.log( data );
	return data;
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
	logger.info("\n", querys);

	if(!word){
		interfaceAction.send("no result!");
		return;
	}
	if(path){
		grep.setPath( path );
	}
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
		logger.info(path);
		logger.info("\n", data);
		var resultFormat = interfaceAction.parseCommendText(path, data);
		interfaceAction.send(resultFormat);
		return resultFormat;
	},function(err){
		console.log("error: \n", err );
		interfaceAction.send(err);
	});
};

module.exports = interfaceAction;