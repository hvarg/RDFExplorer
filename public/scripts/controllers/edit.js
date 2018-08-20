angular.module('rdfvis.controllers').controller('EditCtrl', EditCtrl);

EditCtrl.$inject = ['$scope', 'propertyGraphService', 'requestService', 'queryService'];

function EditCtrl ($scope, pGraph, request, query) {
  var vm = this;
  vm.selected = null;
  vm.val = null;
  vm.var = null;
  vm.isVariable = false;
  vm.newValue = '';

  vm.save = setData;
  vm.cancel = getData;
  vm.getLabel = request.getLabel;
  vm.removeValue = removeValue;
  vm.addValue = addValue;

  pGraph.edit = edit;

  function copyObj (obj) { return Object.assign({}, obj); }

  function edit (obj) {
    vm.selected = obj;
    getData();
    $scope.$emit('setSelected', obj);
    $scope.$emit('tool', 'edit');
  }

  function getData () {
    vm.val = vm.selected.values.data.slice();
    vm.var = copyObj(vm.selected.variable);
    vm.isVariable = vm.selected.isVariable();
  }

  function setData () {
    vm.selected.isVar = vm.isVariable;
    if (vm.selected.variable.alias != vm.var.alias) vm.selected.variable.alias = vm.var.alias;
    if (vm.selected.variable.show != vm.var.show) vm.selected.variable.show = vm.var.show;
    if (vm.selected.variable.count != vm.var.count) vm.selected.variable.count = vm.var.count;
    var enter = vm.val.filter(uri => {
      return (vm.selected.values.data.indexOf(uri) < 0)
    });
    var exit = vm.selected.values.data.filter(uri => {
      return (vm.val.indexOf(uri) < 0);
    });

    enter.forEach(uri => { vm.selected.values.add(uri); });
    exit.forEach(uri => { vm.selected.values.delete(uri); });
    getData();
    $scope.$emit('update', '');
  }

  function removeValue (value) {
    var i = vm.val.indexOf(value);
    if (i > -1) vm.val.splice(i, 1);
  }

  function addValue () {
    var i = vm.val.indexOf(vm.newValue);
    if (i < 0 && vm.newValue) {
      vm.val.push(vm.newValue);
      vm.newValue = '';
    }
  }

}
