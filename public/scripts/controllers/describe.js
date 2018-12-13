angular.module('rdfvis.controllers').controller('DescribeCtrl', DescribeCtrl);

DescribeCtrl.$inject = ['$scope', 'propertyGraphService', 'queryService', 'requestService', 'settingsService',
'logService'];

function DescribeCtrl ($scope, pGraph, query, request, settings, log) {
  var vm = this;
  var cfg = settings.describe;
  var cache = [];
  vm.selected = null;
  vm.show = {datatype: false, objects: true, external: false};

  pGraph.describe = describeObj;
  vm.getNext = describeNext;
  vm.getPrev = describePrev;
  String.prototype.describe = function () { describe(this); };

  function describe (uri) {
    $scope.$emit('tool', 'describe');
    if (!vm.selected || vm.selected.uri != uri) {
      load(uri);
    }
    log.add('Describe', 'URI: ' + uri + ' (' + uri.getLabel() + ')');
    return vm.selected;
  }

  function describeObj (obj) {
    $scope.$emit('tool', 'describe');
    var uri = obj.isVariable() ? (obj.hasResults() ? obj.getResult() : null) : obj.getUri();
    if (uri && (!vm.selected || vm.selected.uri != uri)) {
      load(uri, obj);
    }
    if (uri) log.add('Describe', '?' + obj.variable.id + ', URI: ' + uri + ' (' + uri.getLabel() + ')');
  };

  function load (uri, sourceObject) {
    var realUri = uri;
    if (uri.includes('prop/direct')) uri = uri.replace('prop/direct', 'entity');

    var c = cache.filter(s => {return s.uri == uri})
    if (c.length>0) {
      vm.selected = c[0];
      return c[0];
    }

    var source = sourceObject || null;
    var selected = { uri: uri, source: source, objects: [], datatype: [], text: [], external: [], image: [], results: {} };
    selected.getUri = function () { return realUri };
    vm.selected = selected;

    request.execQuery(query.getProperties(uri), {callback: data => {
      var properties = data.results.bindings.filter(r => {return (!cfg.exclude.includes(r.property.value))});
      properties.forEach(r => {
        var obj = {uri: r.property.value};
        if (r.propertyLabel) obj.label = r.propertyLabel.value;

        if (cfg.image.includes(obj.uri)) {
          selected.image.push(obj);
          loadPropUri( obj.uri );
        } else if (cfg.external.includes(obj.uri)) {
          selected.external.push(obj);
          loadPropUri( obj.uri );
        } else if (cfg.text.includes(obj.uri)) {
          selected.text.push(obj);
          loadDatatype( obj.uri );
        } else if (cfg.objects.includes(obj.uri) || r.kind.value == "1") {
          selected.objects.push(obj);
          loadObject( obj.uri );
        } else if (cfg.datatype.includes(obj.uri) || r.kind.value == "2") {
          selected.datatype.push(obj);
          loadDatatype( obj.uri );
        } else if (r.kind.value == "0") {
          request.execQuery(query.countValuesType(selected.uri, obj.uri), { callback: d => {
            if (d.results.bindings.length > 0) {
              var uri_count = Number(d.results.bindings[0].uris.value);
              var lit_count = Number(d.results.bindings[0].lits.value);
              if (uri_count > lit_count) {
                selected.objects.push(obj);
                loadObject( obj.uri );
              } else {
                selected.datatype.push(obj);
                loadDatatype( obj.uri );
              }
            }
          }});
        }
      });
      sort();
    }});

    cache.push(selected);
    if (cache.length > 10) cache.splice(0, 1);
    return selected;
  }

  function loadPropUri (prop) {
    request.execQuery(query.getPropUri(vm.selected.uri, prop), { callback: data => {
      vm.selected.results[prop] = data.results.bindings.map(s => {return s.uri.value});
    }});
  }

  function loadDatatype (prop) {
    request.execQuery(query.getPropDatatype(vm.selected.uri, prop), { callback: data => {
      vm.selected.results[prop] = data.results.bindings.map(s => {return s.lit.value});
    }});
  }

  function loadObject (prop) {
    request.execQuery(query.getPropObject(vm.selected.uri, prop), { callback: data => {
      vm.selected.results[prop] = data.results.bindings.map(s => {
        var obj = {uri: s.uri.value};
        if (s.uriLabel) obj.label = s.uriLabel.value;
        return obj;
      });
    }});
  }

  function sort () {
    vm.selected.objects.sort(function (a,b) {
      return cfg.objects.indexOf(b.uri) - cfg.objects.indexOf(a.uri);
    });
  }

  function describeNext () {
    var source = vm.selected.source;
    if (!source) return null;
    if (source.isVariable() && source.variable.results.length > 0) {
      var i = source.variable.results.findIndex(el => { return el.value == vm.selected.uri});
      if (i >= 0) describe(source.variable.results[(i+1)%source.variable.results.length].value);
    } else {
      describe(source.nextUri());
    }
    vm.selected.source = source;
    pGraph.refresh();
  }

  function describePrev () {
    var source = vm.selected.source;
    if (!source) return null;
    if (source.isVariable() && source.variable.results.length > 0) {
      var i = source.variable.results.findIndex(el => { return el.value == vm.selected.uri});
      if (i == 0) describe(source.variable.results[source.variable.results.length-1].value);
      if (i > 0)  describe(source.variable.results[i - 1].value);
    } else {
      describe(source.prevUri());
    }
    vm.selected.source = source;
    pGraph.refresh();
  }
}
