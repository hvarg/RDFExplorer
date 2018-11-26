angular.module('rdfvis.services').factory('requestService', requestService);
requestService.$inject = ['settingsService', '$http', '$timeout'];

function requestService (settings, $http, $timeout) {
  var label = {
    "http://www.wikidata.org/prop/direct/P31":    "instance of",
    "http://www.wikidata.org/prop/direct/P105":   "taxon rank",
    "http://www.wikidata.org/prop/direct/P129":   "physically interacts with",
    "http://www.wikidata.org/prop/direct/P171":   "parent taxon",
    "http://www.wikidata.org/prop/direct/P225":   "taxon name",
    "http://www.wikidata.org/prop/direct/P279":   "subclass of",
    "http://www.wikidata.org/prop/direct/P361":   "part of",
    "http://www.wikidata.org/prop/direct/P682":   "biological process",
    "http://www.wikidata.org/prop/direct/P688":   "encodes",
    "http://www.wikidata.org/prop/direct/P1462":  "standards body",
    "http://www.wikidata.org/prop/direct/P2293":  "genetic association",
    "http://www.wikidata.org/entity/Q146":        "house cat",
    "http://www.wikidata.org/entity/Q7367":       "Culicidae",
    "http://www.wikidata.org/entity/Q7432":       "species",
    "http://www.wikidata.org/entity/Q12078":      "cancer",
    "http://www.wikidata.org/entity/Q16521":      "taxon",
    "http://www.wikidata.org/entity/Q37033":      "World Wide Web Consortium",
    "http://www.wikidata.org/entity/Q14818032":   "cell proliferation",
  };
  var delay = 100;   //delay between concurrent request
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
    if (response.xhrStatus != "abort")
      console.log('Error:', response);
    return callback ? callback(response) : response;
  }

  function execQuery (query, config) {
    var cfg = config || {};
    running += 1;

    var httpCfg = {
      method: 'POST',
      url: settings.endpoint.url + '?origin=*',
      params: {
        format: 'json',
        query: query,
        //callback: 'some_function',
      }
    };
    
    if (cfg.canceller) httpCfg.timeout = cfg.canceller;

    return $timeout(() => {
      return $http(httpCfg).then(
        r => { return onSuccess(r, cfg.callback) },
        r => { return onError(r, cfg.cErr) }
      );
    }, (running-1)*delay);
  }

  function getLabel (uri) {
    return label[uri];
  }

  function setLabel (uri, l) {
    label[uri] = l;
  }

  String.prototype.getLabel = function () {
    //FIXME result cant have '/'
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
