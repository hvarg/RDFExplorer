angular.module('rdfvis.controllers').controller('MainCtrl', MainCtrl);

MainCtrl.$inject = ['$scope', 'propertyGraphService'];

function MainCtrl ($scope, pGraph) {
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

  vm.describeToggle = describeToggle;
  vm.describeActivate = describeActivate;
  vm.describeDeactivate = describeDeactivate;
  
  vm.selected = null;
  pGraph.onClick = function (obj) {
    vm.selected = obj;
    describeActivate();
    $scope.$apply();
  };


  function searchToggle() { vm.searchActive = !vm.searchActive; }
  function searchActivate() { vm.searchActive = true; }
  function searchDeactivate() { vm.searchActive = false; }

  function describeToggle() { vm.describeActive = !vm.describeActive;}
  function describeActivate() { vm.describeActive = true; }
  function describeDeactivate() { vm.describeActive = false; }

  function search () {
    console.log(vm.searchInput);
    vm.searchResults.push('ThisLabel ' + vm.searchInput);
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
      d.name = ev.dataTransfer.getData("uri");
    } else {
      d.name = '?';
    }
    if (ev.dataTransfer.getData("prop")) {
      var p = vm.selected.newProp();
      p.name = ev.dataTransfer.getData("prop");
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
