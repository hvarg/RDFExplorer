angular.module('rdfvis.controllers').controller('EditCtrl', EditCtrl);

EditCtrl.$inject = ['$scope', 'propertyGraphService', 'requestService', 'queryService'];

function EditCtrl ($scope, pGraph, request, query) {
  var vm = this;
  vm.selected = null;
  vm.label = null;
  vm.class = null;
  vm.loading = false;
  vm.noResults = false;

  vm.getClasses = getClasses;

  pGraph.edit = edit;

  function edit (obj) {
    vm.selected = obj;

    $scope.$emit('tool', 'edit');
    $scope.$emit('setSelected', obj);
  }

  function getClasses (label) {
    var q = query.search(label, 'http://www.w3.org/2002/07/owl#Class');
    return request.execQuery(q, data => { return data.results.bindings; });
  }

}
