angular.module('rdfvis.services').factory('logService', logService);
logService.$inject = ['$cookies', '$timeout'];

function logService ($c, $timeout) {
  var serv = this;
  serv.logs = [];
  serv.init = init;
  serv.add = add;
  serv.download = download;

  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  var sessionId;

  function init () {
    sessionId = $c.get('sessionId');
    if (!sessionId) {
      sessionId = 1;
    } else {
      sessionId = Number(sessionId) + 1;
    }
    $c.put('sessionId', sessionId, {'expires': tomorrow});
    serv.add('Session', 'Session ' + sessionId + ' started');
    //printPrev();
  }

  function add (id, msg) {
    var entry = {
      date: new Date(),
      id: id,
      info: msg,
    }
    serv.logs.push(entry);
    //console.log(entry.date + ': [' + id + '] ' + msg);
  }

  function download () {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(serv.logs));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "log.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  // Print all previus logs
  function printPrev () {
    for (var i = 1; i < sessionId; i++) {
      var tl = angular.fromJson(window.localStorage.getItem('log' + i));
      if (tl) {
        tl.forEach( entry => {
          console.log(entry.date + ': [' + entry.id + '] ' + entry.info);
        });
      } else {
        console.log('log ' + i + ' does not exists')
      }
    }
  }

  function save () {
    window.localStorage.setItem('log' + sessionId, angular.toJson(serv.logs));
  }

  //Save every 30 seconds
  function periodicSave () {
    $timeout(()=>{
      save();
      periodicSave();
    }, 30000);
  }
  periodicSave();

  //Save before close
  window.addEventListener("beforeunload", function (e) { 
    add('Session', 'Session ' + sessionId + ' ended')
    save();
  }, false);

  return serv;
}
