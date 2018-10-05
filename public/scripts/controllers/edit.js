angular.module('rdfvis.controllers').controller('EditCtrl', EditCtrl);

EditCtrl.$inject = ['$scope', 'propertyGraphService', '$timeout'];

function EditCtrl ($scope, pGraph, $timeout) {
  var vm = this;
  vm.selected = null;
  vm.variable = null;

  vm.isVariable = true;
  vm.isConst    = false;
  vm.isLiteral  = false;

  vm.newValueType = '';
  vm.newValuePlaceholder = '';
  vm.newValue = '';

  vm.resultFilterValue = '';

  vm.added  = 0;
  vm.newFilterType = "";
  vm.newFilterData = {};
  vm.showFilters = true;

  vm.mkVariable = mkVariable;
  vm.mkConst    = mkConst;
  vm.addValue   = addValue;
  vm.rmValue    = rmValue;
  vm.newFilter  = newFilter;
  vm.rmFilter   = rmFilter;
  vm.filterResults  = filterResults;
  vm.addSearchAsFilter = addSearchAsFilter;

  pGraph.edit = editResource;
  vm.refresh  = pGraph.refresh;
  vm.filters  = pGraph.filters;

  function editResource (resource) {
    if (vm.selected != resource) {
      vm.varSearch = "";
    }
    if (resource) {
      vm.selected   = resource;
      vm.variable   = resource.variable;
      vm.isVariable = resource.isVariable();
      vm.isConst    = !vm.isVariable;
      vm.isLiteral  = !!(vm.selected.parent); //FIXME: check if this is a literal
      if (vm.isLiteral) {
        vm.newValueType = 'text';
        vm.newValuePlaceholder = 'add a new literal';
      } else {
        vm.newValueType = 'url';
        vm.newValuePlaceholder = 'add a new URI';
      }
      loadPreview();
    }
    $scope.$emit('tool', 'edit');
  }

  function loadPreview () {
    if (vm.isVariable) vm.selected.loadPreview({limit: 10});
  }

  function mkVariable () {
    vm.selected.mkVariable();
    vm.isVariable = true;
    vm.isConst = false;
    loadPreview();
    vm.refresh();
  }

  function mkConst () {
    vm.added = 0;
    vm.selected.mkConst();
    vm.isVariable = false;
    vm.isConst = true;
    vm.refresh();
  }

  function addValue (newV) {
    if (!newV) {
      newV = vm.newValue;
      vm.newValue = '';
    }
    if (newV && vm.selected.addUri(newV)) {
      vm.added += 1
      vm.refresh();
    }
  }

  function rmValue (value) {
    return vm.selected.removeUri(value)
  }

  function newFilter (targetVar) {
    if (vm.newFilterType == "") return false;
    targetVar.addFilter(vm.newFilterType, copyObj(vm.newFilterData));
    loadPreview();
    vm.refresh();
    vm.newFilterType = "";
    vm.newFilterData = {};
  }

  function rmFilter (targetVar, filter) {
    targetVar.removeFilter(filter);
    loadPreview();
  }

  var lastValueSearch = '';
  function filterResults () {
    var now = vm.resultFilterValue + '';
    $timeout(function () {
      if (vm.isVariable && now == vm.resultFilterValue && now != lastValueSearch) {
        lastValueSearch = now;
        if (now) vm.selected.loadPreview({limit: 10, varFilter: now});
        else loadPreview();
      }
    }, 400);
  }

  function addSearchAsFilter () {
    var text = vm.varSearch + '';
    console.log(text);
    var p = vm.selected.getPropByUri("http://www.w3.org/2000/01/rdf-schema#label");
    if (!p) {
      p = vm.selected.newProp();
      p.addUri('http://www.w3.org/2000/01/rdf-schema#label');
    }
    p.mkConst();
    p.mkLiteral();
    p.getLiteral.addFilter('regex', {regex: text});
    loadPreview();
  }

  function copyObj (obj) {
    return Object.assign({}, obj);
  }

}
