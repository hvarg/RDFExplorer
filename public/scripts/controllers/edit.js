angular.module('rdfvis.controllers').controller('EditCtrl', EditCtrl);

EditCtrl.$inject = ['$scope', 'propertyGraphService'];

function EditCtrl ($scope, pGraph) {
  var vm = this;
  vm.selected = null;
  vm.variable = null;
  vm.literal  = null;

  vm.isVariable = true;
  vm.isConst    = false;
  vm.isNode     = true;
  vm.isLiteral  = false;

  vm.added  = 0;
  vm.newFilterType = "";
  vm.newFilterData = {};

  vm.show  = {filters: true, results: true, const: true, lfilters: true, lresults: true}

  pGraph.edit = editResource;
  vm.refresh  = pGraph.refresh;
  vm.filters  = pGraph.filters;

  vm.mkVariable = mkVariable;
  vm.mkConst    = mkConst;
  vm.addUri     = addUri;
  vm.rmUri      = rmUri;
  vm.newFilter  = newFilter;

  function editResource (resource) {
    if (resource) {
      vm.selected   = resource;
      vm.variable   = resource.variable;
      vm.isVariable = resource.isVariable();
      vm.isConst    = !vm.isVariable;
      vm.isNode     = resource.isNode();
      vm.isLiteral  = resource.isLiteral();
      vm.literal    = vm.isLiteral ? resource.literal : null;
      if (vm.isVariable) vm.selected.getResults();
    }
    $scope.$emit('tool', 'edit');
  }

  function mkVariable () {
    vm.selected.mkVariable();
    vm.selected.getResults();
    vm.isVariable = true;
    vm.isConst = false;
    vm.refresh();
  }

  function mkConst () {
    vm.added = 0;
    vm.selected.mkConst();
    vm.isVariable = false;
    vm.isConst = true;
    vm.refresh();
  }

  function addUri (newUri) {
    if (newUri) {
      if (vm.selected.addUri(newUri)) vm.added += 1
    }
  }

  function rmUri (uri) {
    return vm.selected.removeUri(uri)
  }

  function newFilter (targetVar) {
    if (vm.newFilterType == "") return false;
    targetVar.addFilter(vm.newFilterType, copyObj(vm.newFilterData));
    vm.newFilterType = "";
    vm.newFilterData = {};
  }

  function copyObj (obj) {
    return Object.assign({}, obj);
  }

}
