var express = require('express');
var router = express.Router();

var sqlite3 = require('sqlite3');
var db = new sqlite3.Database('databases/words.sqlite');
db.run("PRAGMA case_sensitive_like = true");

var Twitter = require('twitter');
var credentials = require("../.credentials.js");
var twitParams = credentials.twitParams;
var twitClient = new Twitter(credentials.twitCredentials);

router.get('/', function (req, res, next) {
  var count = 0;
  db.get("SELECT COUNT(*) AS tot FROM words", function (err, row) {
    var respText = "Words API: " + row.tot + " words online.";
    res.send(respText);
  });
});
// We'll implement our API here...

router.get('/count/:abbrev', function (req, res, next) {
  var abbrev = req.params.abbrev;
  //var data = {};
  //var sql = "SELECT COUNT(*) AS wordcount FROM words WHERE word LIKE '"
  //            + abbrev + "%'"
  //db.get(sql, function(err,row){
  //  data.abbrev = abbrev;
  //  data.count = row.wordcount ;
  //  res.send(data);
  //});
  var alen = abbrev.length;
  var dataArray = [];
  var sql = "SELECT substr(word,1," + alen + "+1) AS abbr, " + " count(*) AS wordcount FROM words " + " WHERE word LIKE '" + abbrev + "%'" + " GROUP BY substr(word,1," + alen + "+1)"
  db.all(sql, function (err, rows) {
    for (var i = 0; i < rows.length; i++) {
      dataArray[i] = {
        abbrev: rows[i].abbr,
        count: rows[i].wordcount
      };
    }
    res.send(dataArray); //Express will stringify data, set Content-type
  });
});

router.get('/search/:abbrev', function (req, res, next) {
  var abbrev = req.params.abbrev;
  var threshold = req.query.threshold || 3;
  // Our default, case-INsensitive query clause:
  var likeClause = "lower(word) LIKE lower('" + abbrev + "%')";
  // Check for query parameter passed by client
  var caseSensitive = req.query.caseSensitive;
  if (caseSensitive === "true") {
    console.log("Case Sensitive");
    // Case-sensitive query:
    likeClause = "word LIKE '" + abbrev + "%'"
  }
  if (threshold && abbrev.length < Number(threshold)) {
    res.status(204).send() //204: Success, No Content.
    return;
  }
  // Use our query clause:
  var query = ("SELECT id, word FROM words " + " WHERE " + likeClause + " ORDER BY word ");
  db.all(query, function (err, data) {
    if (err) {
      res.status(500).send("Database Error");
    } else {
      res.status(200).json(data);
    }
  })
});

// DICTIONARY ROUTES============

router.get('/dictionary/:wordId', function (req, res, next) {
  console.log('first route (database)');
  var wordId = req.params.wordId;
  var query = ("SELECT id, word FROM words " + " WHERE id = " + wordId);
  db.get(query, function (err, data) {
    if (err) {
      res.status(500).send("Database Error");
    } else {
      //res.status(200).json(data);
      res.wordData = data;
      next();
    }
  })
});

router.get('/dictionary/:wordId', function (req, res, next) {
  console.log('second route (Twitter)');
  var word = res.wordData.word;
  res.wordData.twitter = {};
  var twitSearch = "https://api.twitter.com/1.1/search/tweets.json?";
  twitSearch += "q=";
  twitSearch += "lang%3Aen%20"   // 'lang:en '
  twitSearch += "%23" + word;     // '#word'
  twitSearch += "&result_type=recent";
  console.log('second route About to call Twitter.get() with' + twitSearch );
  twitClient.get(twitSearch, twitParams, function (error, tweets, response) {
    console.log('second route Inside twitter callback ...');
    if (error) {
      console.error("Twitter FAIL!");
      console.error(error);
    }
    else {
      console.log('second route Twitter SUCCESS!  ...');
      res.wordData.twitter = tweets;
    }
    console.log('second route Done with twitter, returning to client ...');
    res.status(200).json(res.wordData);
  });

});

router.delete('/dictionary/:wordId', function (req, res, next) {
  var wordId = req.params.wordId;
  var query = ("DELETE FROM words " + " WHERE id = " + wordId);
  db.run(query, function (err) {
    console.log(query);
    if (err) {
      res.status(500).send("Database Error");
    } else {
      res.status(204).send();
    }
  })
});

router.put('/dictionary/:wordId', function (req, res, next) {
  var wordId = req.params.wordId;
  var word = req.body.word;
  var wordObj = {};
  wordObj.id = wordId;
  wordObj.word = word;
  var query = ("UPDATE words SET word= '" + word + "'" + " WHERE id=" + wordId);
  db.run(query, function (err) {
    if (err) {
      if (err.errno == 19) { //Word already exists
        console.log("Word " + word + " already exists.");
        var query2 = "SELECT id FROM words WHERE word ='" + word + "'"
        db.get(query2, function (err, row) {
          if (err) {
            console.error("Error retrieving existing word.");
            req.status(500).send("Database Error");
          } else {
            wordObj.id = row.id;
            var newUrl = req.baseUrl + "/dictionary/" + row.id;
            res.set("Location", newUrl);
            res.status(409).json(wordObj);
          }
        });
      } else {
        console.error(err);
        res.status(500).send("Database Error");
      }
    } else {
      //res.status(204).send());
      console.log(wordId + " updated to " +
        wordObj.word);
      res.status(200).json(wordObj);
    }
  })
});

router.post('/dictionary', function (req, res, next) {
  var word = req.body.word;
  var wordObj = {};
  wordObj.word = word;
  var query = ("INSERT INTO words (word) VALUES ('" + word + "')");
  db.run(query, function (err) {
    if (err) { //DOH!
      if (err.errno == 19) { //Word already exists
        console.log("Word " + word + " already exists.");
        var query2 = "SELECT id FROM words WHERE word ='" + word + "'"
        db.get(query2, function (err, row) {
          if (err) {
            console.error("Error retrieving existing word.");
            req.status(500).send("Database Error");
          } else {
            wordObj.id = row.id;
            var newUrl = req.baseUrl + "/dictionary/" + row.id;
            res.set("Location", newUrl);
            res.status(303).json(wordObj);
          }
        });
      } else {
        console.log("Database error:");
        console.error(err);
        res.status(500).send("Database Error");
      }
    } else { // SUCCESS! Word added.
      wordObj.id = this.lastID;
      var newUrl = req.baseUrl + "/dictionary/" + wordObj.id;
      res.set("Location", newUrl);
      res.status(201).json(wordObj);
    }
  })
});



module.exports = router;

//router.get('/dictionary/:wordId', function (req, res, next) {
//  console.log("Second route")
//  var word = res.wordData[0].word
//  res.wordData[0].twitter = {}
//  var twitSearch = "https://api.twitter.com/1.1/search/tweets.json?"
//  twitSearch += "q="
//  twitSearch += "%23" + word     // '#word'
//  twitClient.get(twitSearch, twitParams, function (error, tweets, response) {
//    if (error) {
//      console.error("Twitter fail:");
//      console.error(error);
//    }
//    else {
//      console.log("Twitter success:");
//      res.wordData[0].twitter.tweets = tweets;
//    }
//    res.status(200).json(res.wordData);
//  })
//});
