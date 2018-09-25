angular.module('rdfvis.services').factory('requestService', requestService);
requestService.$inject = ['settingsService', '$http', '$timeout'];

function requestService (settings, $http, $timeout) {
  var label = {
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#type': 'type', //FIXME
    'http://www.w3.org/2000/01/rdf-schema#label': 'label'
  };

  var delay = 50;
  var running = 0;

  function toForm (obj) {
    var str = [];
    for(var p in obj)
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    return str.join("&");
  }

  function execQuery (query, callback, cErr) {
    var url = settings.endpoint.url + '?format=json&' + toForm({query: query});
    var pr = $timeout(function () {
        return $http.get(url).then(
          function onSuccess (response) {
            running -= 1;
            //console.log(response);
            var tmp;
            for (var i = 0; i < response.data.results.bindings.length; i++) {
              tmp = response.data.results.bindings[i];
              if (tmp.label && tmp.uri) label[tmp.uri.value] = tmp.label.value;
            }
            return callback ? callback(response.data) : response.data;
          },
          function onError   (response) {
            running -= 1;
            console.log('Error ' + response.status + ':' + response.data);
            return cErr ? cErr(response) : response;
          }
        );
      }, delay*running);
    running += 1;
    /*return $http({
        method: 'post',
        url: settings.endpoint.url,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        transformRequest: toForm, 
        data: { query: query, format: "application/sparql-results+json" }
    }).then(
      function onSuccess (response) {
        var tmp;
        for (var i = 0; i < response.data.results.bindings.length; i++) {
          tmp = response.data.results.bindings[i];
          if (tmp.label && tmp.uri) label[tmp.uri.value] = tmp.label.value;
        }
        return callback ? callback(response.data) : response.data;
      },
      function onError   (response) {
        console.log('Error ' + response.status + ':' + response.data);
        return cErr ? cErr(response) : response;
      }
    );*/
  }

  function getLabel (uri) {
    return label[uri];
  }

  function setLabel (uri, l) {
    label[uri] = l;
  }

  String.prototype.getLabel = function () {
    if (label[this]) return label[this];
    for (var i in settings.prefixes) {
      if (this.includes(settings.prefixes[i].uri)) {
        return this.replace(settings.prefixes[i].uri, settings.prefixes[i].prefix+':');
      }
    }
    return this;
  };

  String.prototype.toPrefix = function () {
    for (var i in settings.prefixes) {
      if (this.includes(settings.prefixes[i].uri)) {
        return [this.replace(settings.prefixes[i].uri, settings.prefixes[i].prefix+':'),
                settings.prefixes[i]];
      }
    }
    return ['<' + this + '>', null];
  }

  return {
    execQuery: execQuery,
    getLabel: getLabel,
    setLabel: setLabel,
  };
}
