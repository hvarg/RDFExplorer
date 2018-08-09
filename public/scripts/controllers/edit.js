angular.module('rdfvis.controllers').controller('EditCtrl', EditCtrl);

EditCtrl.$inject = ['$scope', 'propertyGraphService'];

function EditCtrl ($scope, pGraph) {
  var vm = this;
  vm.selected = null;

  pGraph.edit = edit;

  function edit (obj) {
    vm.selected = obj;

    $scope.$emit('tool', 'edit');
    $scope.$emit('setSelected', obj);
  }

}
