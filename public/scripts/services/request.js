angular.module('rdfvis.services').factory('requestService', requestService);
requestService.$inject = ['settingsService', '$http'];

function requestService (settings, $http) {
  var label = {};

  function toForm (obj) {
    var str = [];
    for(var p in obj)
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    return str.join("&");
  }

  function execQuery (query, callback) {
    $http({
        method: 'post',
        url: 'https://dbpedia.org/sparql',
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
        callback(response.data);
      },
      function onError   (response) {console.log('Error: ', response);}
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
