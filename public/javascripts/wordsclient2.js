window.addEventListener("load", function () {

  /*var countField = document.getElementById("countWord");
  var countDisplay = document.getElementById("displayCount");
  var countCase = document.getElementById("caseCount");
  countField.addEventListener("keyup", function(evt){
    var abbrev = countField.value;
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4 && xhr.status == 200){
        //var resp = JSON.parse(xhr.responseText);
        //countDisplay.innerHTML = "<li>" + resp.count + " words match "
        //+ resp.abbrev + "</li>";
        var resp = xhr.response;
        countDisplay.innerHTML = "";
        for (var i=0; i<resp.length; i++) {
          var item = document.createElement("li");
          item.innerHTML = resp[i].count + " words match " + resp[i].abbrev;
          countDisplay.appendChild(item);
        }
      }
    }
    xhr.open("GET", "/wordsapi/v1/count/" + abbrev);
    xhr.responseType = 'json';
    xhr.send();
  });*/

  var searchField = document.getElementById("searchWord");
  var searchList = document.getElementById("wordlist");
  var wordData = document.getElementById("wordData");
  var messages = document.getElementById("messages");
  var createWordBtn = document.getElementById("createWordBtn");
  var updateWordBtn = document.getElementById("updateWordBtn");
  var deleteWordBtn = document.getElementById("deleteWordBtn");
  var twitterList = document.getElementById("twitterList");

  searchField.addEventListener("keydown", function (evt) {
    if (evt.key === "ArrowDown" || evt.key === "Tab" || evt.keyCode === 0x28 || evt.keyCode === 0x09) {
      searchList.focus();
      searchList.selectedIndex = 0;
    }
  }); // searchField "keydown"

  searchField.addEventListener("keyup", function (evt) {
    var abbrev = searchField.value;
    if (abbrev.length < 1) {
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4 && xhr.status == 200) {
        if (xhr.response.length < 1) {
          createWordBtn.style.visibility = "visible";
          searchList.style.visibility = "hidden";
        } else {
          createWordBtn.style.visibility = "hidden";
          searchList.style.visibility = "visible";
          searchList.innerHTML = "";
          for (var i = 0; i < xhr.response.length; i++) {
            var opt = document.createElement("option");
            opt.value = xhr.response[i].id;
            opt.label = xhr.response[i].word; //Chrome
            opt.innerHTML = xhr.response[i].word; //Firefox
            searchList.appendChild(opt);
          }
        }
      }
    }
    var uri = "/wordsapi/v2/search/" + abbrev;
    var params = []; // Empty array for optional URI parameters
    var thresh = searchField.dataset.threshold;
    if (thresh && Number(thresh) > 0) {
      params.push("threshold=" + Number(thresh)); //Add to array
    }
    var caseSens = document.getElementById("caseSearch").checked;
    if (caseSens) {
      params.push("caseSensitive=true"); //Add to array
    }
    // No more optional parameters to add.
    if (params.length) { //Do we have any optional parameters?
      uri += "?" + params.join("&"); //Concatenate with &s, append after ?
    }
    xhr.open("GET", uri);
    xhr.responseType = 'json';
    console.log("searchField change: " + uri);
    xhr.send();
  }); // searchField "keyup"

  searchList.addEventListener("change", function () {
    searchField.value = searchList.options[searchList.selectedIndex].label;
    var wordId = searchList.options[searchList.selectedIndex].value;
    displayWordData(wordId);
  }); // Search list change callback

  var displayWordData = function (wordId) {
      messages.innerHTML = "";
      var wordIdSpan = document.getElementById("wordIdSpan");
      var wordValueField = document.getElementById("wordValueField");
      wordData.style.visibility = "visible";
      var uri = "/wordsapi/v2/dictionary/" + wordId;
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {
            wordIdSpan.innerHTML = xhr.response.id;
            wordValueField.value = xhr.response.word;
            // Do Twitter stuff
            showTweets(xhr.response.twitter);
          } else if (xhr.status == 404) {
            wordIdSpan.innerHTML = wordId;
            wordValueField.value = " not found";
          }
        }
      }
      xhr.open("GET", uri);
      xhr.responseType = 'json';
      console.log("displayWordData(): " + uri);
      xhr.send();
    } // displayWordData()
 
  var showTweets = function(twitter) {
    var tweetlist = twitter.statuses;
    twitterList.innerHTML = "";
    for (var i=0;i<tweetlist.length;i++){
      tweet = tweetlist[i].text;
      var tweetDiv = document.createElement("div");
      tweetDiv.attributes.class = "tweetDiv";
      tweet = linkURLs(tweet);
      tweet = linkHashtags(tweet);
      tweetDiv.innerHTML = tweet;
      twitterList.appendChild(tweetDiv);
    }
  };
  
  var linkURLs = function(text) {
    var pattern = /(https?:\/\/\S+)/g;
    var newText = text.replace(pattern, "<a href='$1' target='_blank'>$1</a>")
    return newText;
  }
  var linkHashtags = function(text) {
    var pattern = /(#(\w+))/g;
    var newText = text.replace(pattern, "<a href='https://twitter.com/search?q=%23$2' target='_blank'>$1</a>")
    return newText;
  }

  
  deleteWordBtn.addEventListener("click", function (evt) {
    var wordId = wordIdSpan.innerHTML;
    var uri = "/wordsapi/v2/dictionary/" + wordId;
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4) {
        if (xhr.status == 204) {
          wordIdSpan.innerHTML = "";
          wordValueField.innerHTML = "";
          //wordData.style.visibility = "hidden";
          messages.innerHTML = "Word deleted."
        } else if (xhr.status == 500) {
          console.log(xhr.status + " " + xhr.responseText);
        }
      }
    }
    xhr.open("DELETE", uri);
    console.log("deleteWordBtn click: " + uri);
    xhr.send();
  });

  updateWordBtn.addEventListener("click", function (evt) {
    var wordId = wordIdSpan.innerHTML;
    var uri = "/wordsapi/v2/dictionary/" + wordId;
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4) {
        if (xhr.status == 200) {
          wordIdSpan.innerHTML = xhr.response.id;
          wordValueField.value = xhr.response.word;
          wordData.style.visibility = "visible";
          messages.innerHTML = "Word updated";
        } else if (xhr.status == 409) {
          console.log("Word exists: " + xhr.response.id + " " + xhr.response.word);
          messages.innerHTML = "Word exists: " + xhr.response.id + " " + xhr.response.word
        } else if (xhr.status == 500) {
          console.log(xhr.status + " " + xhr.response);
          messages.innerHTML = "Server error."
        }
      }
    }
    var wordObj = {};
    wordObj.id = wordId;
    wordObj.word = wordValueField.value;
    wordJSON = JSON.stringify(wordObj);
    console.log(wordJSON);
    xhr.open("PUT", uri);
    xhr.responseType = 'json';
    xhr.setRequestHeader("Content-type", "application/json");
    console.log("updateWordBtn click: " + uri);
    xhr.send(wordJSON);
  }); // updateWordBtn "click

  createWordBtn.addEventListener("click", function (evt) {
    var uri = "/wordsapi/v2/dictionary";
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4) {
        if (xhr.status == 201) {
          wordIdSpan.innerHTML = xhr.response.id;
          wordValueField.value = xhr.response.word;
          wordData.style.visibility = "visible";
          messages.innerHTML = "Word created: " + xhr.response.id + " " + xhr.response.word;
        } else if (xhr.status == 303) {
          messages.innerHTML = "Word already exists";
        } else if (xhr.status == 500) {
          console.log(xhr.status + " " + xhr.response);
          messages.innerHTML = "Server error"
        }
      }
    }
    var wordObj = {};
    wordObj.word = searchField.value;
    wordJSON = JSON.stringify(wordObj);
    console.log(wordJSON);
    xhr.open("POST", uri);
    xhr.responseType = 'json';
    xhr.setRequestHeader("Content-type", "application/json");
    console.log("createWordBtn click: " + uri);
    xhr.send(wordJSON);
  }); //createWordBtn "click"



}); //window.addEventListener("load")
