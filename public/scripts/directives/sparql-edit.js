angular.module('rdfvis.directives').directive('sparqlEdit', sparqlEdit);

sparqlEdit.$inject = [];

function sparqlEdit () {
  var directive = {
    link: link,
    restrict: 'EA',
    scope: {
      query: '='
    },
  };
  return directive;

  function link (scope, element, attrs) {
    var ed = CodeMirror(element[0], {
        mode:  "sparql",
        lineNumbers: true,
        gutter: true,
        lineWrapping: true,
    });
    ed.getDoc().setValue(scope.query.get());
  }
}
