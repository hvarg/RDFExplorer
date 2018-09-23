angular.module('rdfvis.controllers').controller('SparqlCtrl', SparqlCtrl);

SparqlCtrl.$inject = ['$scope', 'propertyGraphService'];

function SparqlCtrl ($scope, pGraph) {
  var vm = this;
  vm.queries = null;

  vm.onClick = onClick;
  vm.updateQuery = updateQuery;

  pGraph.getQueries = updateQuery;

  function updateQuery () {
    vm.queries = pGraph.toQuery();
  }

  function onClick (res) {
    res.onClick();
    pGraph.refresh();
  }

}
