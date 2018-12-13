angular.module('rdfvis.controllers').controller('EditCtrl', EditCtrl);

EditCtrl.$inject = ['$scope', 'propertyGraphService', '$timeout', '$q', 'logService'];

function EditCtrl ($scope, pGraph, $timeout, $q, log) {
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
  vm.resultFilterLoading = false;
  vm.canceller = null;

  vm.added  = 0;
  vm.newFilterType = "";
  vm.newFilterData = {};
  vm.showFilters = false;

  vm.mkVariable = mkVariable;
  vm.mkConst    = mkConst;
  vm.addValue   = addValue;
  vm.rmValue    = rmValue;
  vm.newFilter  = newFilter;
  vm.rmFilter   = rmFilter;
  vm.loadPreview  = loadPreview;
  vm.addSearchAsFilter = addSearchAsFilter;

  pGraph.edit = editResource;
  vm.refresh  = pGraph.refresh;
  vm.filters  = pGraph.filters;

  function editResource (resource) {
    if (vm.selected != resource) {
      vm.resultFilterValue = '';
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
      log.add('Edit', 'Editing ?' + vm.variable.id);
      loadPreview();
    }
    $scope.$emit('tool', 'edit');
  }

  function mkVariable () {
    log.add('Edit', 'Set ?' + vm.variable.id + ' as variable');
    vm.selected.mkVariable();
    vm.isVariable = true;
    vm.isConst = false;
    loadPreview();
    vm.refresh();
  }

  function mkConst () {
    log.add('Edit', 'Set ?' + vm.variable.id + ' as constraint');
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
      if (vm.selected.uris.length == 1) {
        mkConst();
      } else {
        vm.added += 1
      }
      vm.refresh();
      log.add('Edit', 'Add ' + newV + ' (' + newV.getLabel() + ') to ?' + vm.variable.id);
    }
  }

  function rmValue (value) {
    if (vm.selected.removeUri(value)) {
      vm.refresh();
      log.add('Edit', 'Remove ' + value + ' (' + value.getLabel() + ') from ?' + vm.variable.id);
    }
  }

  function newFilter (targetVar) { //TODO: targetVar not needed now
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
  function loadPreview () {
    if (!vm.isVariable) return;

    if (vm.canceller) {
      vm.canceller.resolve('new preview');
      vm.resultFilterLoading = false;
    }
    
    vm.canceller = $q.defer();
    vm.resultFilterLoading = true;
    var config = { //add pagination here
      limit: 10,
      callback: () => { 
        vm.resultFilterLoading = false;
        vm.canceller = null; },
      canceller: vm.canceller.promise,
    };

    var now = vm.resultFilterValue + '';
    if (now) {
      $timeout(function () {
        if (now == vm.resultFilterValue && now != lastValueSearch) {
          lastValueSearch = now;
          vm.resultFilterLoading = true;
          config.varFilter = now;
          vm.selected.loadPreview(config);
          log.add('Edit', 'Filtering results by "'+now+'"');
        }
      }, 400);
    } else {
      lastValueSearch = '';
      vm.selected.loadPreview(config);
    }
  }

  function addSearchAsFilter () { // should work but not used
    var text = vm.resultFilterValue + '';
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
