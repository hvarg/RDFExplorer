angular.module('rdfvis.services').factory('requestService', requestService);
requestService.$inject = ['settingsService', '$http', '$timeout'];

function requestService (settings, $http, $timeout) {
  var label = {};   //TODO this to sparql-helpers
  var delay = 50;   //delay between concurrent request
  var running = 0;  //number of concurrent request

  /* Create get URL form */
  function toForm (obj) {
    var str = [];
    for(var p in obj)
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    return str.join("&");
  }

  function onSuccess (response, callback) {
    running -= 1;
    // check relation ?var -> ?varLabel
    var cur, index, variables = {};
    var sorted = response.data.head.vars.sort( (a,b) => { return b.length - a.length; });
    while (sorted.length > 0) {
      cur = sorted.pop();
      index = sorted.indexOf(cur+'Label');
      if (index >= 0) {
        variables[cur] = cur+'Label';
        sorted.splice(index, 1);
      } else {
        variables[cur] = false;
      }
    }

    // add labels
    var labelName;
    response.data.results.bindings.forEach(r => {
      for (var varName in variables) {
        labelName = variables[varName];
        if (labelName) {
          if (r[varName].type == 'uri' && r[labelName] && r[labelName].type == 'literal')
            setLabel(r[varName].value, r[labelName].value);
          //else
          //  console.log('type mismatch:', r[varName], r[labelName]);
        }
      }
    });

    return callback ? callback(response.data) : response.data;
  }
  
  function onError (response, callback) {
    running -= 1;
    console.log('Error ' + response.status + ': ' + response.data);
    return callback ? callback(response) : response;
  }

  function execQuery (query, callback, cErr) {
    var url = settings.endpoint.url + '?format=json&' + toForm({query: query});
    var pro = $timeout(
      function () {
        return $http.get(url).then(
          r => { return onSuccess(r, callback)},
          r => { return onError(r, cErr);});
      }, delay*running);
    running += 1;
    return pro;
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

  String.prototype.copyToClipboard = function () {
    var el = document.createElement('textarea');
    el.value = this;
    // Set non-editable to avoid focus and move outside of view
    el.setAttribute('readonly', '');
    el.style = {position: 'absolute', left: '-9999px'};
    document.body.appendChild(el);
    // Select text inside element and copy
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }

  return {
    execQuery: execQuery,
    getLabel: getLabel,
    setLabel: setLabel,
  };
}
