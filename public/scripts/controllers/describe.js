angular.module('rdfvis.controllers').controller('DescribeCtrl', DescribeCtrl);

DescribeCtrl.$inject = ['$scope', 'propertyGraphService', 'queryService', 'requestService'];

function DescribeCtrl ($scope, pGraph, query, request) {
  var vm = this;
  vm.selectedUri = '';
  vm.selectedObj = null;

  vm.descObjProp = [];
  vm.descDatatypeProp = [];
  vm.descPropValue = {};
  vm.raw = [];
  vm.long = [];

  var objType = {
    uri: {type: "uri", value: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"},
    label: {type: "literal", 'xml:lang': "en", value: "type"},
  };

  pGraph.describe = describeObj;
  vm.getObjPropValue = getObjPropValue;
  vm.getDatatypePropValue = getDatatypePropValue;
  vm.getNext = describeNext;
  vm.getPrev = describePrev;

  function reload () {
    vm.descObjProp = [];
    vm.descDatatypeProp = [];
    vm.descPropValue = {};
    vm.raw = [];
    vm.long = [];

    request.execQuery(query.getObjProp(vm.selectedUri), function (data) {
      vm.descObjProp = data.results.bindings;
      vm.descObjProp.unshift(objType);
    });

    request.execQuery(query.getDatatypeProp(vm.selectedUri), function (data) {
      vm.descDatatypeProp = data.results.bindings;
    });
  }

  function describe (uri) {
    if (vm.selectedUri != uri) {
      vm.selectedUri = uri;
      vm.selectedObj = null;
      reload();
    }
    $scope.$emit('tool', 'describe');
  }

  function describeObj (obj) {
    if (!obj.isVariable()) describe(obj.getUri());
    if (obj.isVariable() && obj.variable.results.length>0) describe(obj.variable.results[0].uri.value)
    vm.selectedObj = obj;
    $scope.$emit('setSelected', obj);
  };

  function describeNext () {
    if (!vm.selectedObj) return null;
    var obj = vm.selectedObj;
    if (vm.selectedObj.isVariable() && vm.selectedObj.variable.results.length > 0) {
      var i = vm.selectedObj.variable.results.findIndex(el => { return el.uri.value == vm.selectedUri});
      if (i >= 0) describe(vm.selectedObj.variable.results[(i+1)%vm.selectedObj.variable.results.length].uri.value);
    } else {
      describe(vm.selectedObj.nextUri());
    }
    vm.selectedObj = obj;
  }

  function describePrev () {
    if (!vm.selectedObj) return null;
    var obj = vm.selectedObj;
    if (vm.selectedObj.isVariable() && vm.selectedObj.variable.results.length > 0) {
      var i = vm.selectedObj.variable.results.findIndex(el => { return el.uri.value == vm.selectedUri});
      if (i == 0) describe(vm.selectedObj.variable.results[vm.selectedObj.variable.results.length-1].uri.value);
      if (i > 0) describe(vm.selectedObj.variable.results[i - 1].uri.value);
    } else {
      describe(vm.selectedObj.prevUri());
    }
    vm.selectedObj = obj;
  }

  function getObjPropValue (uri, prop) {
    request.execQuery(query.getObjPropValue(uri, prop), function (data) {
      if (data.results.bindings.length == 0) {
        vm.descObjProp = vm.descObjProp.filter(obj => {
          if (obj.uri.value == prop) {
            vm.raw.push( obj );
            return false;
          }
          return true;
        });
      }
      vm.descPropValue[prop] = data.results.bindings;
    });
  };

  function getDatatypePropValue (uri, prop) {
    request.execQuery(query.getDatatypePropValue(uri, prop), function (data) {
      vm.descPropValue[prop] = data.results.bindings.filter(obj => { //filter non eng
        if (obj.uri.type != 'literal' || !obj.uri['xml:lang'] || obj.uri['xml:lang'] == 'en') {
          if (obj.uri.value.length > 180) { // move long descriptions
            vm.descDatatypeProp = vm.descDatatypeProp.filter(dt => {
              if (dt.uri.value == prop) {
                vm.long.push( dt );
                return false;
              }
              return true;
            });
          }
          return true;
        }
        return false;
      });
    });
  };

  String.prototype.describe = function () {
    describe(this);
  };
}
