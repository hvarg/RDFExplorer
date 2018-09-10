angular.module('rdfvis.controllers').controller('SparqlCtrl', SparqlCtrl);

SparqlCtrl.$inject = ['$scope', 'propertyGraphService'];

function SparqlCtrl ($scope, pGraph) {
  var vm = this;
  vm.queries = null;

  vm.updateQuery = updateQuery;

  function updateQuery () {
    vm.queries = pGraph.toQuery();
  }

}
