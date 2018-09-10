angular.module('rdfvis.controllers').controller('SparqlCtrl', SparqlCtrl);

SparqlCtrl.$inject = ['$scope', 'propertyGraphService'];

function SparqlCtrl ($scope, pGraph) {
  var vm = this;
  vm.updateQuery = updateQuery;

  var defaultValue = "# Not enought elements to create a query!"

  function updateQuery () {
    var queries = pGraph.toQuery();
    console.log(queries[0].get());
    
    
    vm.editor.getDoc().setValue(defaultValue);
  }

  vm.editor = CodeMirror(document.getElementById("sparql-textarea"), {
    mode:  "sparql",
    lineNumbers: true,
    gutter: true,
    lineWrapping: true,
  });

}
