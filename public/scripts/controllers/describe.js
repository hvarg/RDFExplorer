angular.module('rdfvis.controllers').controller('DescribeCtrl', DescribeCtrl);

DescribeCtrl.$inject = ['$scope', 'propertyGraphService', 'queryService', 'requestService'];

function DescribeCtrl ($scope, pGraph, query, request) {
  var vm = this;
  var lastSelectedUri = null;
  vm.selected = null;
  vm.descObjProp = [];
  vm.descDatatypeProp = [];
  vm.descPropValue = {};

  var objType = {
    uri: {type: "uri", value: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"},
    label: {type: "literal", 'xml:lang': "en", value: "type"},
  };

  vm.raw = [];
  vm.long = [];

  pGraph.describe = describe;
  vm.getObjPropValue = getObjPropValue;
  vm.getDatatypePropValue = getDatatypePropValue;
  vm.getNext = getNext;
  vm.getPrev = getPrev;

  function reload () {
    vm.descObjProp = [];
    vm.descDatatypeProp = [];
    vm.descPropValue = {};
    
    vm.raw = [];
    vm.long = [];

    request.execQuery(query.getObjProp(vm.selected.getUri()), function (data) {
      vm.descObjProp = data.results.bindings;
      vm.descObjProp.unshift(objType);
    });

    request.execQuery(query.getDatatypeProp(vm.selected.getUri()), function (data) {
      vm.descDatatypeProp = data.results.bindings;
    });
  }

  function describe (obj) {
    if (obj.getUri() != lastSelectedUri) {
      lastSelectedUri = obj.getUri();
      vm.selected = obj;
      reload();
    }
    $scope.$emit('setSelected', obj);
    $scope.$emit('tool', 'describe');
  };

  function getNext () {
    if (vm.selected.nextValue().getUri() != lastSelectedUri) {
      lastSelectedUri = vm.selected.getUri();
      reload();
    }
  }

  function getPrev () {
    if (vm.selected.prevValue().getUri() != lastSelectedUri) {
      lastSelectedUri = vm.selected.getUri();
      reload();
    }
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
}
