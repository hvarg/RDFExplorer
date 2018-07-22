angular.module('rdfvis.controllers').controller('DescribeCtrl', DescribeCtrl);

DescribeCtrl.$inject = ['$scope', 'propertyGraphService', 'queryService', 'requestService'];

function DescribeCtrl ($scope, pGraph, query, request) {
  var vm = this;
  vm.selected = null;
  vm.descObjProp = [];
  vm.descDatatypeProp = [];
  vm.descPropValue = {};

  vm.raw = [];
  vm.long = [];

  pGraph.onClick = describe;
  vm.getObjPropValue = getObjPropValue;
  vm.getDatatypePropValue = getDatatypePropValue;

  function describe (obj) {
    vm.selected = obj;
    vm.descObjProp = [];
    vm.descDatatypeProp = [];
    vm.descPropValue = {};
    
    vm.raw = [];
    vm.long = [];
    
    request.execQuery(query.getObjProp(obj.uri), function (data) {
      vm.descObjProp = data.results.bindings;
    });
    request.execQuery(query.getDatatypeProp(obj.uri), function (data) {
      vm.descDatatypeProp = data.results.bindings;
    });
    $scope.$emit('toolr', 'describe');
    $scope.$emit('setSelected', obj);
    $scope.$apply(); //TODO maybe this should go in main.
  };

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
          if (obj.uri.value.length > 150) { // move long descriptions
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
