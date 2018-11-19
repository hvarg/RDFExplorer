angular.module('rdfvis.controllers').controller('SparqlCtrl', SparqlCtrl);

SparqlCtrl.$inject = ['$scope', 'propertyGraphService'];

function SparqlCtrl ($scope, pGraph) {
  var vm = this;
  vm.queries = [];
  vm.empty   = [];

  vm.onClick = onClick;
  vm.updateQuery = updateQueries;

  pGraph.getQueries = updateQueries;

  function updateQueries () {
    var all = new Set();
    pGraph.nodes.forEach(r => {
      if (r.isVariable()) all.add(r);
      r.properties.forEach(p => {
        if (p.isVariable()) all.add(p);
        if (p.isLiteral() && p.literal.isVariable()) all.add(p.literal);
      });
    });

    vm.queries = [];
    vm.empty = [];
    var queue = Array.from(all);
    while (queue.length > 0) {
      var cur = queue.pop();
      var q = cur.createQuery();
      if (q) {
        q.selectAll();
        q.select.forEach(r => {
          var index = queue.indexOf(r);
          if (index >= 0) queue.splice(index, 1);
        });
        vm.queries.push(q);
      } else {
        vm.empty.push(cur);
      }
    }
  }

  function onClick (res) {
    res.onClick();
    pGraph.refresh();
  }

}
