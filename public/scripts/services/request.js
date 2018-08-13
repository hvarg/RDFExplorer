angular.module('rdfvis.services').factory('requestService', requestService);
requestService.$inject = ['settingsService', '$http'];

function requestService (settings, $http) {
  var label = {
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#type': 'type' //FIXME
  };

  function toForm (obj) {
    var str = [];
    for(var p in obj)
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    return str.join("&");
  }

  function execQuery (query, callback, cErr) {
    return $http({
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
          if (tmp.label) label[tmp.uri.value] = tmp.label.value;
        }
        return callback ? callback(response.data) : response.data;
      },
      function onError   (response) {
        console.log('Error ' + response.status + ':' + response.data);
        return cErr ? cErr(response) : response;
      }
    );
  }

  function getLabel (uri) {
    return label[uri];
  }

  return {
    execQuery: execQuery,
    getLabel: getLabel,
  };
}
