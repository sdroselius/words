window.addEventListener("load", function(){

  var countField = document.getElementById("countWord");
  var countDisplay = document.getElementById("displayCount");

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
  });

  var searchField = document.getElementById("searchWord");
  var searchList = document.getElementById("wordlist");
  searchField.addEventListener("keyup", function(evt){
    var abbrev = searchField.value;
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4 && xhr.status == 200){
        searchList.innerHTML = "";
        for (var i=0; i<xhr.response.length; i++) {
          var opt = document.createElement("option");
          opt.value     = xhr.response[i].id;
          opt.label     = xhr.response[i].word; //Chrome
          opt.innerHTML = xhr.response[i].word; //Firefox
          searchList.appendChild(opt);
        }
      }
    }
    var uri = "/wordsapi/v1/search/" + abbrev;
    var thresh = searchField.dataset.threshold;
    if (thresh && Number(thresh) > 0) {
      uri += "?threshold=" + Number(thresh);
    }
    xhr.open("GET", uri);
    xhr.responseType = 'json';
    xhr.send();
  }); //Word search keyup callback

  searchList.addEventListener("change",function(){
    searchField.value=searchList.options[searchList.selectedIndex].label;
  })

});
