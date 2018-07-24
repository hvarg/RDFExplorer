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
  vm.toolr = 'none';

  /* functions */
  vm.updateSVG = null;
  vm.getZoom = null;
  vm.tutorial = tutorial;
  vm.toolrToggle = toolrToggle;
  vm.search = search;
  vm.searchToggle = searchToggle;
  vm.searchActivate = searchActivate;
  vm.searchDeactivate = searchDeactivate;
  vm.test = test;
  vm.selected = null;

  /* scope */
  $scope.drag = drag;
  $scope.drop = drop;
  $scope.$on('toolr', function(event, data) { vm.toolr = data; });
  $scope.$on('setSelected', function(event, data) { vm.selected = data; });

  /* Tools display functions */
  function toolrToggle (panel) {
    if (vm.toolr == panel) vm.toolr = 'none';
    else vm.toolr = panel;
  }

  function searchToggle() { vm.searchActive = !vm.searchActive; }
  function searchActivate() { vm.searchActive = true; }
  function searchDeactivate() { vm.searchActive = false; }

  function search () {
    if (vm.searchInput && vm.searchInput != vm.lastSearch) {
      var input = vm.searchInput;
      vm.searchWait = true;
      vm.noResults  = false; 
      q = query.search(input);
      request.execQuery(q, function (data) {
        vm.searchResults = data.results.bindings;
        vm.lastSearch = input;
        vm.searchWait = false;
        if (vm.searchResults.length == 0) vm.noResults = true;
        /*console.log(data);
        console.log(vm.searchResults);*/
      });
    }
    vm.searchActive = true;
  }

  function drag (ev, uri, prop) {
    ev.dataTransfer.setData("uri", uri);
    ev.dataTransfer.setData("prop", prop);
  }

  function drop (ev) {
    var z = vm.getZoom();
    //check if exists first
    var d = pGraph.addNode();
    d.x = (ev.layerX - z[0])/z[2];
    d.y = (ev.layerY - z[1])/z[2];
    if (ev.dataTransfer.getData("uri")) {
      d.uri = ev.dataTransfer.getData("uri");
    }
    if (ev.dataTransfer.getData("prop")) {
      var p = vm.selected.newProp();
      p.uri = ev.dataTransfer.getData("prop");
      pGraph.addEdge(p, d);
    } else { // from search
      var index = vm.searchResults.indexOf( ev.dataTransfer.getData("uri") );
      vm.searchResults.splice(index, 1);
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
