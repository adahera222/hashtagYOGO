//--API keys setup for Twitter and MongoHQ----------------

var keys = require("./apikeys.js");

var mongo = require('mongodb'); //https://npmjs.org/package/mongodb
var mongoUri = keys.mongoURL;

var util = require("util");
var twitter = require('ntwitter'); //https://github.com/AvianFlu/ntwitter
var username = keys.id_str;
var game_root_status_id_str = keys.game_root_status_id_str;

var tweeter = new twitter({
	consumer_key: keys.consumer_key,
	consumer_secret: keys.consumer_secret,
	access_token_key: keys.access_token_key,
	access_token_secret: keys.access_token_secret
});


function checkIntoDatabase(thistweet, collectionname) {
	mongo.Db.connect(mongoUri, function (err, db) {
		if (err) {
			console.log(err);
		}
		// "The findAndModify command atomically modifies and returns a single document. By default, the returned document does not include the modifications made on the update. To return the document with the modifications made on the update, use the "new" option." http://docs.mongodb.org/manual/reference/command/findAndModify/
		db.collection(collectionname).findAndModify({"tweet_id": thistweet.tweet_id}, [], {
			$set: {
				"tweet_id": thistweet.tweet_id,
				"author": thistweet.author,
				"author_id": thistweet.author_id,
				"text": thistweet.text,
				"retweet_count": thistweet.retweet_count,
				"favorite_count": thistweet.favorite_count,
				}
			}, {"upsert": "true", "new": "true"}, function(err, object, thistweet, collectionname) {
				if (err) {
					console.warn(err.message);
				}
				else {
					console.log("updated collection");
					if (object.retweeted_by_bot != "true") {
						if (tweetQualifiesForRetweet(object)) {
							retweet(object.tweet_id, collectionname);
						}
					}
			}
		});
	});
}


function retweet(tweet_id, collectionname) {
	retweeter.retweetStatus(tweet_id, function(data){
		console.log("retweeted!");
		});

	mongo.Db.connect(mongoUri, function (err, db, collectionname) {
		if (err) {
			console.log(err);
		}
		else {
			db.collection("tweets").findAndModify({"tweet_id": tweet_id}, [], {$set: { "retweeted_by_bot": "true" } }, {}, function(err, object) {
				if (err) console.warn(err.message);
				else console.log("logged retweet!");
			});
		}
	});
}


function condenseTweet(tweet) {
	return {
		"tweet_id": tweet.id_str,
		"author": tweet.user.id_str,
		"author_id": tweet.user.name,
		"text": tweet.text,
		"retweet_count": tweet.retweet_count,
		"favorite_count": tweet.favorite_count,
		"retweeted_by_bot": "false",
		}
}

function newPlayer() {
	console.log("new player!");
}


function openUserStream(tweeter){
	tweeter.stream('user', {}, function(stream){
		console.log("Making my stream.");
		stream.on('data', function (data){
			if(data.in_reply_to_status_id_str == game_root_status_id_str) {
				newPlayer();
			}
			console.log(data);
			console.log("-------------------------------------------------------------------------------------------------------");
		});
	});
}

// ------------------------Make it go!--------------------------------------------------------
console.log("Starting up...");

// tweeter.getUserTimeline({"screen_name":"hashtagyogo", "count":3, "include_rts":1, "exclude_replies":false,}, function(err, data) {
// 	console.log(err);
//     console.log(data);
// });


tweeter.get('/statuses/user_timeline.json', {"screen_name":"hashtagyogo", "count":3, "include_rts":1, "exclude_replies":false,}, function(err, data) {
	console.log(err);
    console.log(data);
});

// openUserStream(tweeter);