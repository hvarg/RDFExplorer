angular.module('rdfvis.controllers').controller('EditCtrl', EditCtrl);

EditCtrl.$inject = ['$scope', 'propertyGraphService', '$timeout'];

function EditCtrl ($scope, pGraph, $timeout) {
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
  vm.varSearch = "";
  vm.litSearch = "";

  vm.show  = {filters: false, results: true, const: true, lfilters: false, lresults: true}

  pGraph.edit = editResource;
  vm.refresh  = pGraph.refresh;
  vm.filters  = pGraph.filters;

  vm.mkVariable = mkVariable;
  vm.mkConst    = mkConst;
  vm.addUri     = addUri;
  vm.rmUri      = rmUri;
  vm.newFilter  = newFilter;
  vm.rmFilter   = rmFilter;
  vm.filterRes  = filterResults;
  vm.filterLit  = filterLiteralResults;
  vm.addSearchAsFilter = addSearchAsFilter;

  function editResource (resource) {
    if (vm.selected != resource) {
      vm.varSearch = "";
      vm.litSearch = "";
    }
    if (resource) {
      vm.selected   = resource;
      vm.variable   = resource.variable;
      vm.isVariable = resource.isVariable();
      vm.isConst    = !vm.isVariable;
      vm.isNode     = resource.isNode();
      vm.isLiteral  = resource.isLiteral();
      vm.literal    = vm.isLiteral ? resource.literal : null;
      loadPreview();
    }
    $scope.$emit('tool', 'edit');
  }

  function loadPreview () {
    if (vm.isVariable || vm.isLiteral) vm.selected.loadPreview({limit: 10, litlimit: 10});
  }

  function mkVariable () {
    vm.selected.mkVariable();
    loadPreview();
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
    loadPreview();
    vm.refresh();
    vm.newFilterType = "";
    vm.newFilterData = {};
  }

  function rmFilter (targetVar, filter) {
    targetVar.removeFilter(filter);
    loadPreview();
  }

  var lastVarSearch = '';
  function filterResults () {
    var now = vm.varSearch+'';
    $timeout(function () {
      if (vm.isVariable && now == vm.varSearch && now != lastVarSearch) {
        lastVarSearch = now;
        if (now) vm.selected.loadPreview({limit: 10, varFilter: now});
        else loadPreview();
      }
    }, 400);
  }

  var lastLitSearch = '';
  function filterLiteralResults () {
    var now = vm.litSearch+'';
    $timeout(function () {
      if (vm.isLiteral && now == vm.litSearch && now != lastLitSearch) {
        lastLitSearch = now;
        if (now) vm.selected.loadPreview({litlimit: 10, litFilter: now});
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
    p.literal.addFilter('regex', {regex: text});
    loadPreview();
  }

  function copyObj (obj) {
    return Object.assign({}, obj);
  }

}
