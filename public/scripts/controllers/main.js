angular.module('rdfvis.controllers').controller('MainCtrl', MainCtrl);

MainCtrl.$inject = ['$scope', 'propertyGraphService', 'queryService', 'requestService', '$timeout'];

function MainCtrl ($scope, pGraph, query, request, $timeout) {
  var vm = this;
  /* vars */
  vm.searchInput = null;
  vm.searchResults = [];
  vm.searchActive = false;
  vm.searchWait = false;
  vm.noResults  = false;
  vm.lastSearch = '';
  vm.tool = 'none';

  /* functions */
  vm.updateSVG = null;
  vm.getZoom = null;
  vm.tutorial = tutorial;
  vm.toolToggle = toolToggle;
  vm.search = search;
  vm.searchToggle = searchToggle;
  vm.searchActivate = searchActivate;
  vm.searchDeactivate = searchDeactivate;
  vm.test = test;
  vm.selected = null;

  /* scope */
  $scope.drag = drag;
  $scope.drop = drop;
  $scope.$on('tool', function(event, data) { vm.tool = data; });
  $scope.$on('setSelected', function(event, data) { vm.selected = data; });
  $scope.$on('newSettings', function(event, data) { vm.lastSearch = ''; });
  $scope.$on('update', function(event, data) { vm.updateSVG(); });

  /* Tools display function */
  function toolToggle (panel) {
    vm.tool = (vm.tool == panel) ? 'none' : panel;
    if (panel == 'describe' && vm.selected) vm.selected.describe();
    if (panel == 'edit' && vm.selected) vm.selected.edit();
  }

  function searchToggle() { vm.searchActive = !vm.searchActive; }
  function searchActivate() { vm.searchActive = true; }
  function searchDeactivate() { vm.searchActive = false; }

  function onSearch (data) {
    var r = {}
    data.results.bindings.forEach(res => {
      if (!r[res.uri.value]) r[res.uri.value] = [];
      r[res.uri.value].push( res );
    });
    vm.searchResults = [];
    for (key in r) {
      var tmp = {uri: r[key][0].uri, label: r[key][0].label, types: []};
      r[key].forEach(res => {
        tmp.types.push( {uri: res.type, label: res.tlabel } );
      });
      vm.searchResults.push(tmp);
    }
    console.log(vm.searchResults);

    //vm.searchResults = data.results.bindings;
    vm.searchError = false;
    vm.searchWait = false;
    if (vm.searchResults.length == 0) vm.noResults = true;
  }

  function onSearchErr (resp) {
    vm.searchWait = false;
    vm.noResults = false;
    vm.searchError = true;
    vm.lastSearch = '';
  }

  function search () {
    if (vm.searchInput != vm.lastSearch) {
      var input = vm.searchInput;
      vm.lastSearch = input;
      vm.searchWait = true;
      vm.noResults  = false; 
      console.log(query.search(input));
      request.execQuery(query.search(input), onSearch, onSearchErr);
    }
    vm.searchActive = true;
  }

  function drag (ev, uri, prop) {
    ev.dataTransfer.setData("uri", uri);
    ev.dataTransfer.setData("prop", prop);
  }

  function drop (ev) {
    var z    = vm.getZoom();
    var uri  = ev.dataTransfer.getData("uri");
    var prop = ev.dataTransfer.getData("prop");
    // Create or get the node.
    var d = pGraph.getNodeByUri(uri);
    if (!d) {
      d = pGraph.addNode();
      if (uri) d.addUri(uri);
    }
    d.setPosition((ev.layerX - z[0])/z[2], (ev.layerY - z[1])/z[2]);

    // Add the property
    if (prop) {
      if (uri) d.mkConst();
      var p = vm.selected.getPropByUri(prop);
      if (!p) {
        p = vm.selected.newProp();
        p.addUri(prop);
      }
      // Create (selected)--p-->(d) edge
      pGraph.addEdge(p, d);
    } else { // from search, remove the search result
      vm.searchResults = vm.searchResults.filter( obj => {
        return (obj.uri.value != uri);
      });
      if (vm.searchResults.length == 0) 
        vm.searchActive = false;
      // Add other elements;
      vm.updateSVG();
      d.variable.setAlias(vm.lastSearch);
      p = d.newProp();
      p.addUri('http://www.w3.org/2000/01/rdf-schema#label');
      o = pGraph.addNode();
      o.variable.setAlias(vm.lastSearch+'Label');
      o.variable.addFilter('lang', {lang: 'en'});
      o.variable.addFilter('text', {keyword: vm.lastSearch});
      o.setPosition(d.x+100, d.y+100);
      pGraph.addEdge(p, o);
    }

    vm.updateSVG();
    $scope.$apply();
  }

  function tutorial () {
    introJs().start();
  }

  function test () {
    console.log(pGraph.toQuery());
  }
  //test
  //$timeout(function () {
  //  d = pGraph.addNode();
  //  d.x = 300; d.y = 300; d.uri = "http://dbpedia.org/resource/Barack_Obama"; vm.updateSVG();
  //}, 200)
}
