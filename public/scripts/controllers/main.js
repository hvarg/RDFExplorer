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

  vm.search = search;
  vm.searchToggle = searchToggle;
  vm.searchActivate = searchActivate;
  vm.searchDeactivate = searchDeactivate;

  vm.describeToggle = describeToggle;
  vm.describeActivate = describeActivate;
  vm.describeDeactivate = describeDeactivate;
  
  vm.getSelected =function () {return pGraph.selected; };


  function searchToggle() { vm.searchActive = !vm.searchActive; }
  function searchActivate() { vm.searchActive = true; }
  function searchDeactivate() { vm.searchActive = false; }

  function describeToggle() { vm.describeActive = !vm.describeActive; }
  function describeActivate() { vm.describeActive = true; }
  function describeDeactivate() { vm.describeActive = false; }

  function search () {
    console.log(vm.searchInput);
    vm.searchResults.push('ThisLabel ' + vm.searchInput);
    vm.searchActive = true;
  }

  function drag (ev, data) {
    ev.dataTransfer.setData("uri", data);
  }

  function drop (ev) {
    pGraph.addNodeFromEvent(ev);
    vm.updateSVG();
    var index = vm.searchResults.indexOf( ev.dataTransfer.getData("uri") );
    vm.searchResults.splice(index, 1);
    if (vm.searchResults.length == 0) 
      vm.searchActive = false;
    $scope.$apply();
  }

  vm.test = test;
  function test () {
    console.log(pGraph.toQuery());
  }
}
