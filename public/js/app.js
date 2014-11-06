$(document).ready(function() {
	var isPending = false;
	var currentWord = "";

	var colorCode = function(container, codes){
		container.empty();
		//codes = codes.replace(/</g, "&lt;").replace(/>/g,"&gt;");

		codes.forEach(function(codeContent){
			var title = $("<h2></h2>");
			title.append(codeContent.filename);
			var newCode = $("<code class='"+ codeContent.suffix +"'></code>");
			codeContent.codeText = codeContent.code.join("\n");
			codeContent.codeText = codeContent.codeText.replace(/</g, "&lt;").replace(/>/g,"&gt;");

			newCode.html( codeContent.codeText );
			container.append( title );
			container.append( newCode );
		});

		container.find("code").each(function(idx, block){
			hljs.highlightBlock( block );
		});
	}
	//get grep result
	$("#start-query").click(function(e) {
		if (isPending) return;
		isPending = true;

		setTimeout(function(){
			isPending = false;
		}, 5000);
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
				if(res.data.length){
					colorCode($("#code-content"), res.data);
				}
			});
	});
});