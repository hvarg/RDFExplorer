angular.module('rdfvis.controllers').controller('MainCtrl', MainCtrl);

MainCtrl.$inject = ['$scope', 'propertyGraphService', 'queryService', 'requestService', '$timeout'];

function MainCtrl ($scope, pGraph, query, request, $timeout) {
  var vm = this;
  /* vars */
  vm.searchInput = '';
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

  /* Tools display function */
  function toolToggle (panel) {
    vm.tool = (vm.tool == panel) ? 'none' : panel;
  }

  function searchToggle() { vm.searchActive = !vm.searchActive; }
  function searchActivate() { vm.searchActive = true; }
  function searchDeactivate() { vm.searchActive = false; }

  function onSearch (data) {
    vm.searchResults = data.results.bindings;
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
    if (vm.searchInput && vm.searchInput != vm.lastSearch) {
      var input = vm.searchInput;
      vm.lastSearch = input;
      vm.searchWait = true;
      vm.noResults  = false; 
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
    var d = pGraph.getNodeByValue(uri);
    if (!d) {
      d = pGraph.addNode();
      if (uri) d.addValue(uri);
    }
    d.setPosition((ev.layerX - z[0])/z[2], (ev.layerY - z[1])/z[2]);

    // Add the property.
    if (prop) {
      var p = vm.selected.newProp();
      p.uri = ev.dataTransfer.getData("prop");
      pGraph.addEdge(p, d);
    } else { // from search
      vm.searchResults = vm.searchResults.filter( obj => {
        return (obj.uri.value != uri);
      });
      if (vm.searchResults.length == 0) 
        vm.searchActive = false;
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
