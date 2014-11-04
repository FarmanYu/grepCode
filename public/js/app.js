$(document).ready(function() {
	var isPending = false;
	var currentWord = "";
	var HighlightCode = function(str){
		var re = new RegExp(currentWord, "g");
		str = str.replace(re, '<kbd>'+ currentWord +'</kbd>');
		return str;
	}
	var colorCode = function(codes){
		var code = "";
		codes = codes.replace(/</g,"&lt;")
				     .replace(/>/g,"&gt;");
		var codelines = codes.split("\n");
		
		code = codelines.join("<br />");
		code = HighlightCode(code);
		return code;
	}
	$("#start-query").click(function(e) {
		if (isPending) return;
		isPending = true;

		currentWord = $("#word").val();
		var data = {
			word: currentWord,
			files: $("#files").val(),
			number: $("#number").val(),
			path: $("#project").val()
		}

		$.get("/cmdparse?t=" + (new Date().getTime()),
			data,
			function(res) {
				isPending = false;
				console.log(res);
				if(typeof(res.data) === "string"){
					$("#code-content").html( colorCode(res.data) );
				}
			});
	});
});