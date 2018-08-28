angular.module('rdfvis.controllers').controller('EditCtrl', EditCtrl);

EditCtrl.$inject = ['$scope', 'propertyGraphService', 'queryService'];

function EditCtrl ($scope, pGraph, query) {
  var vm = this;
  vm.selected = null;
  vm.isNode = true;
  vm.isVariable = true;
  vm.isLiteral = false;
  vm.uris = [];
  vm.cur = -1;
  vm.variable = null;
  vm.literal  = null;

  vm.newValue = '';
  vm.newFilterType = "";
  vm.newFilterData = {};

  vm.varActive = false;
  vm.litActive = false;
  vm.valActive = false;
  vm.resActive = true;

  vm.save = setData;
  vm.cancel = getData;
  vm.removeValue = removeValue;
  vm.addValue = addValue;
  vm.addNewFilter = addNewFilter;
  vm.describe = $scope.describe;

  pGraph.edit = editSelected;
  vm.filters = pGraph.filters;

  /* Data that can be edited in this panel.
   * Editable of Node: properties ?
   * Editable of Property: isLit, literal
   * Editable of RDFResource: isVar, variable, uris, cur
   * Editable of Variable: alias, filters, opts */

  function clearData () {
    vm.selected = null;
    vm.isNode = true;
    vm.isVariable = true;
    //vm.properties = [];
    vm.uris = [];
    vm.cur = -1;
    vm.isLiteral = false;
    vm.variable = null;
    vm.literal  = null;
  }

  function getData () {
    if (!vm.selected) return null;
    vm.isNode = vm.selected.isNode();
    vm.isVariable = vm.selected.isVariable();
    vm.uris = vm.selected.uris.slice();
    vm.cur = vm.selected.cur;
    vm.variable = vm.selected.variable;
    vm.isLiteral = vm.selected.isLiteral();
    if (vm.isVariable) {
      vm.selected.getResults();
    }
    if (vm.isLiteral) {
      vm.literal = vm.selected.literal;
    } else {
      vm.literal = null;
    }
    vm.varActive = vm.isVariable;
    vm.litActive = vm.isLiteral;
    vm.valActive = (vm.cur >= 0);
  }

  function setData () {
    if (vm.isVariable) vm.selected.mkVariable();
    else vm.selected.mkConst();
    var enter = vm.uris.filter(uri => {
      return (vm.selected.uris.indexOf(uri) < 0)
    });
    var exit = vm.selected.uris.filter(uri => {
      return (vm.uris.indexOf(uri) < 0);
    });

    enter.forEach(uri => { vm.selected.addUri(uri); });
    exit.forEach(uri => { vm.selected.removeUri(uri); });
    getData();
    $scope.$emit('update', '');
  }

  function copyObj (obj) { return Object.assign({}, obj); }

  function editSelected (obj) {
    clearData();
    if (obj) vm.selected = obj;
    getData();
    $scope.$emit('setSelected', obj);
    $scope.$emit('tool', 'edit');
    if (!this.isNode)
      $scope.$apply();
  }

  function removeValue (value) {
    var i = vm.uris.indexOf(value);
    if (i > -1) vm.uris.splice(i, 1);
  }

  function addValue (newValue) {
    vm.valActive = true;
    var i = vm.uris.indexOf(newValue);
    if (i < 0 && newValue) {
      vm.uris.push(newValue);
    }
    // remove value from results
    vm.variable.results = vm.variable.results.filter(r => {
      return (r.uri.value != newValue);
    });
  }

  function addNewFilter (targetVar) {
    if (vm.newFilterType == "") return false;
    targetVar.addFilter(vm.newFilterType, copyObj(vm.newFilterData));
    vm.newFilterType = "";
    vm.newFilterData = {};
  }

}
