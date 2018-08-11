angular.module('rdfvis.controllers').controller('SparqlCtrl', SparqlCtrl);

SparqlCtrl.$inject = ['$scope', 'propertyGraphService'];

function SparqlCtrl ($scope, pGraph) {
  var vm = this;
  vm.updateQuery = updateQuery;

  var defaultValue = "# Not enought elements to create a query!"

  function updateQuery () {
    var q = pGraph.toQuery() || defaultValue;
    console.log('>', q);
    vm.editor.getDoc().setValue(q);
  }

  vm.editor = CodeMirror(document.getElementById("sparql-textarea"), {
    mode:  "sparql",
    lineNumbers: true,
    gutter: true,
    lineWrapping: true,
  });

}
