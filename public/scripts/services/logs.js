angular.module('rdfvis.services').factory('logService', logService);
logService.$inject = [];

function logService () {
  var serv = this;
  serv.logs = [];
  serv.add = add;
  serv.download = download;

  function add (msg) {
    var entry = {
      date: new Date(),
      info: msg,
    }
    serv.logs.push(entry);
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

  return serv;
}
