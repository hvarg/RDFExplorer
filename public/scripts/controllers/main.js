angular.module('rdfvis.controllers').controller('MainCtrl', MainCtrl);

MainCtrl.$inject = ['$scope', 'propertyGraphService', 'queryService', 'requestService'];

function MainCtrl ($scope, pGraph, query, request) {
  $scope.drag = drag;
  $scope.drop = drop;
  var vm = this;
  vm.name = 'RDF Visualization'
  vm.searchInput = '';
  vm.searchResults = [];
  vm.searchActive = false;
  vm.describeActive = false;
  vm.updateSVG = null;
  vm.getZoom = null;
  vm.tutorial = tutorial;

  vm.search = search;
  vm.searchToggle = searchToggle;
  vm.searchActivate = searchActivate;
  vm.searchDeactivate = searchDeactivate;
  vm.searchWait = false;
  vm.noResults  = false;
  vm.lastSearch = '';

  vm.describeToggle = describeToggle;
  vm.describeActivate = describeActivate;
  vm.describeDeactivate = describeDeactivate;
  
  vm.selected = null;
  vm.descObjProp = [];
  vm.descDatatypeProp = [];
  pGraph.onClick = function (obj) {
    vm.selected = obj;
    vm.descObjProp = [];
    vm.descDatatypeProp = [];
    request.execQuery(query.getObjProp(obj.uri), function (data) {
      vm.descObjProp = data.results.bindings;
    });
    request.execQuery(query.getDatatypeProp(obj.uri), function (data) {
      vm.descDatatypeProp = data.results.bindings;
    });
    describeActivate();
    $scope.$apply();
  };

  vm.descPropValue = {};
  vm.getObjPropValue = function (uri, prop) {
    request.execQuery(query.getObjPropValue(uri, prop), function (data) {
      vm.descPropValue[prop] = data.results.bindings;
    });
  };
  vm.getDatatypePropValue = function (uri, prop) {
    request.execQuery(query.getDatatypePropValue(uri, prop), function (data) {
      vm.descPropValue[prop] = data.results.bindings;
    });
  };


  function searchToggle() { vm.searchActive = !vm.searchActive; }
  function searchActivate() { vm.searchActive = true; }
  function searchDeactivate() { vm.searchActive = false; }

  function describeToggle() { vm.describeActive = !vm.describeActive;}
  function describeActivate() { vm.describeActive = true; }
  function describeDeactivate() { vm.describeActive = false; }

  function search () {
    if (vm.searchInput && vm.searchInput != vm.lastSearch) {
      var input = vm.searchInput;
      vm.searchWait = true;
      vm.noResults  = false; 
      q = query.search(input);
      //console.log(q);
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

  vm.test = test;
  function test () {
    console.log(pGraph.toQuery());
  }
}
