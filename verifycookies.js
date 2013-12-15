var request = require("request");

var cookieWords = ["cookie", "recipe", "butter", "sugar", "eggs", "vegan", "flour", "gluten", "bake", "heat", "cook", "ingredients"];

function verifyCookieRecipe(url, callback) {
	request({url:url, followAllRedirects:true}, function (error, response, body) {
		if (!error) {
			body = body.toLowerCase();
			cookieScore = 0;
			for (var i =0; i<cookieWords.length; i++) {
				if (body.search(cookieWords[i])>=0) {
					cookieScore += 1;
				}
			}
			var nextstate = "";
			if (cookieScore >= cookieWords.length/2) {
				nextstate = "cookie_success";
				console.log(body);
				console.log(url, cookieScore);
			}
			else {
				nextstate = "cookie_failure";
				console.log(url, cookieScore);
			}

			if (callback && typeof callback === "function") {
				// Execute the callback function and pass the parameters to it
				callback(nextstate);
			}
		}
		else {
			console.log("Couldn't get url");
			nextstate = "cookie_failure";
			if (callback && typeof callback === "function") {
				// Execute the callback function and pass the parameters to it
				callback(nextstate);
			}
		}
	});	
}

// verifyCookieRecipe("http://t.co/olv2ak4ZXa");

module.exports = verifyCookieRecipe;