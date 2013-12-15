var game = require("./game.json");
var responses = require("./responses");

//--API keys setup for Twitter and MongoHQ----------------

var keys = require("./apikeys.js");

var mongo = require('mongodb'); //https://npmjs.org/package/mongodb
var mongoUri = keys.mongoURL;

var util = require("util");
var twitter = require('ntwitter'); //https://github.com/AvianFlu/ntwitter
var my_user_id = keys.id_str;
var game_root_status_id_str = keys.game_root_status_id_str;

var tweeter = new twitter({
	consumer_key: keys.consumer_key,
	consumer_secret: keys.consumer_secret,
	access_token_key: keys.access_token_key,
	access_token_secret: keys.access_token_secret
});


function getState(user) {
	mongo.Db.connect(mongoUri, function (err, db, user) {
		if (err) {
			console.log(err);
		}

		db.collection("users").find({"user":user}).toArray(function (err, docs, user) {
			var currentstate;
			if (docs.length==0) {
				//add user as new to db, with state="start"
				currentstate = "start";
				newuser = {"user":user, "state":[currentstate]};

			}
			else if (docs.length==1) {
				var statehistory = docs[0].state;
				currentstate = statehistory[statehistory.length-1];
			}
			else {
				console.log("Username conflict?");
			}




			db.close();
		});
	});
}



function setState(user, state) {
	mongo.Db.connect(mongoUri, function (err, db, collectionname) {
		if (err) {
			console.log(err);
		}
		else {
			db.collection("users").findAndModify({"user": user}, [], {$set: { "state": state } }, {}, function(err, object) {
				if (err) console.warn(err.message);
				else console.log("Changed user "+user+" to state "+state+".");
			});
		}
	});
}


function tweet(user, response, in_response_to) {
	response = "@"+user+" "+response;
	tweeter.updateStatus(text, {"in_reply_to_status_id_str":in_response_to}, function() {
		console.log("I said: "+response);
	})
}

function updateState(user, newstate, in_response_to) {
	setState(user, newstate);
	
	//tweet new status
	response = responses[newstate];
	//remember to include response for ""
	tweet(user, response, in_response_to);
}


// A couple of ways to do this:
// - check which tweet a user is responding to:
		// if(data.in_reply_to_status_id_str == game_root_status_id_str) {
		// 	newPlayer();
		// }
// 		- this allows them to branch the story (maybe only until they reach an ending?)
// - store user state completely in database, don't worry about what they're responding to
// Hard to tell which one is more intuitive?



function gameplay(user, text, message_id) {
	console.log(user+" said: "+text);

	//sanitize move input: remove names, etc
	cleanText(text);

	//get user's current state from database
	var currentstate = getState(user);

	//match input against possible moves from user's current state
	var nextstate = "";

	for (phrase in game[currentstate]) {
		if (text.search(phrase)>=0) {
			nextstate = game[currentstate][phrase];
		}
	}
	//update user's state
	updateState(user, nextstate, message_id);
}



function openUserStream(tweeter){
	tweeter.stream('user', {}, function(stream){
		console.log("Making my stream.");
		stream.on('data', function (data){
			if (data.user && data.user.id_str != my_user_id) {
				user = data.user.id_str;
				message_id = data.id_str;
				text = data.text;
				gameplay(user, text, message_id);
			}
			else { //actually this is messy, because it does this for all other events too	
			}
			console.log("--------------------------------------");
		});
	});
}

// ------------------------Make it go!--------------------------------------------------------
console.log("Starting up...");

// tweeter.get('/statuses/user_timeline.json', {"screen_name":"hashtagyogo", "count":3, "include_rts":1, "exclude_replies":false,}, function(err, data) {
// 	console.log(err);
//     console.log(data);
// });
getState("lea");
getState("Timmy");

// openUserStream(tweeter);