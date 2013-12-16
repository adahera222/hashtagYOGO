var game = require("./game.json");
var responses = require("./responses");
var verifyCookies = require("./verifycookies.js");

//--API keys setup for Twitter and MongoHQ----------------

var keys = require("./apikeys.js");

var mongo = require('mongodb'); //https://npmjs.org/package/mongodb
var mongoUri = keys.mongoURL;

var util = require("util");
var twitter = require('ntwitter'); //https://github.com/AvianFlu/ntwitter
var my_user_id = keys.id_str;
var screen_name = keys.screen_name;
var game_root_status_id_str = keys.game_root_status_id_str;

var tweeter = new twitter({
	consumer_key: keys.consumer_key,
	consumer_secret: keys.consumer_secret,
	access_token_key: keys.access_token_key,
	access_token_secret: keys.access_token_secret
});

// HTTP request, to validate cookie recipes
var request = require('request');

// A couple of ways to do this:
// - check which tweet a user is responding to:
		// if(data.in_reply_to_status_id_str == game_root_status_id_str) {
		// 	newPlayer();
		// }
// 		- this allows them to branch the story (maybe only until they reach an ending?)
// - store user state completely in database, don't worry about what they're responding to
// Hard to tell which one is more intuitive?
// Let's just keep track of a state history in the db. They only get one branch each.


function gameplay(user, username, message, in_response_to) {
	console.log(user+" said: "+message);
	mongo.Db.connect(mongoUri, function (err, db) {
		if (err) {
			console.log(err);
		}
		console.log("connecting; user is "+user);
		// Get the current state of the user
		db.collection("users").find({"user":user}).toArray(function (err, docs) {
			var currentstate;
			if (docs.length==0) {
				//add user as new to db, with state="start"
				currentstate = "start";
			}
			else if (docs.length==1) {
				var statehistory = docs[0].state;
				currentstate = statehistory[statehistory.length-1];
			}
			else {
				console.log("Username conflict?");
				currentstate = "start";
			}
			if(currentstate != "fence" && currentstate != "bail"){
				findNextState(currentstate, message, function(newstate) {
					// give a confusion message if the state hasn't changed
					if(newstate == currentstate) {
						tweet(user, username, "needs_clarification", in_response_to);
						db.close();
					}
					
					//or give a state change message and change the user's state in the DB
					else {
						tweet(user, username, newstate, in_response_to);

						//then update the user document and close the db
						if (currentstate == "start") {
							var newuser = {"user":user, "state":[currentstate, newstate]};
							db.collection("users").insert(newuser, {"w":1}, function(err, object){
								if(err) console.log(err);
								else {
									console.log("Added user "+user+", who moved to state "+state+".");
									db.close();
								}
							});
						}

						else {
							db.collection("users").update({"user": user}, {$push: { "state": newstate } }, {"w":1}, function(err, object) {
								if (err) console.log(err);
								else {
									console.log("Changed user "+user+" to state "+state+".");
									db.close();
								}
							});
						}
					}
				});
			}	
		});
	});
}



function cleanText(text) {
	var cleanedText = text.toLowerCase().replace("@"+screen_name,"")
	return cleanedText;
}
function getURL(text) {
	var re = /\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[A-Z0-9+&@#\/%=~_|]/i;
	var URL = "";
	var match = text.match(re);
	if(match) {
		URL = match[0];
	}
	
	return URL;
}

function choose(choices) {
  index = Math.floor(Math.random() * choices.length);
  return choices[index];
}

function findNextState(currentstate, text, callback) {
	var nextstate = currentstate;

	if (currentstate == "act_casual" || currentstate == "cookie_failure" || currentstate == "cookie_reqest_repeat") {
		url = getURL(text);
		if(url=="") {
			nextstate = "cookie_reqest_repeat";
			callback(nextstate);
		}
		else {
			verifyCookies(url, callback);
		}
	}

	else {
		text = cleanText(text);
		currentoptions = game[currentstate];

		for (phrase in currentoptions) {
			if (text.search(phrase)>=0) {
				nextstate = game[currentstate][phrase];
			}
		}

		if (callback && typeof callback === "function") {
			// Execute the callback function and pass the parameters to it
			callback(nextstate);
		}
	}
}

function tweet(user, username, newstate, in_response_to) {
	response = "@"+username+" "+choose(responses[newstate]);
	tweeter.post('/statuses/update.json', {status: response, in_reply_to_status_id:in_response_to, include_entities:1}, null, function() {
		console.log("I said: "+response);
	})
	// note that, evey though I'm using an id_str, it's in_reply_to_status_id not in_reply_to_status_id_str
}




function openUserStream(tweeter){
	tweeter.stream('user', {}, function(stream){
		console.log("Making my stream.");
		stream.on('data', function (data){
			if (data.user && data.user.id_str != my_user_id) {
				user = data.user.id_str;
				username = data.user.screen_name;
				message_id = data.id_str;
				message = data.text;
				gameplay(user, username, message, message_id);
				
			}
			else { 
			//actually this is messy, because it does this for all other events too	
			// let's just log things where they actually happen
			}
			console.log("--------------------------------------");
		});
	});
}

// ------------------------Make it go!--------------------------------------------------------
console.log("Starting up...");

// tweet(null, "gnurr", "test", '');

// tweeter.getUserTimeline({"screen_name":"hashtagyogo", "count":1}, function(err, data) {
// 	// console.log(pluckAll(data,["text", "favorite_count"]));
// 	console.log(data);
// });

findNextState("bike", "what", function(nextstate) {console.log(nextstate)});
// findNextState("need_cookies", "http://allrecipes.com/Recipe/Linzer-Torte-Cookies/Detail.aspx?evt19=1", function(nextstate) {console.log(nextstate)});

// openUserStream(tweeter);
