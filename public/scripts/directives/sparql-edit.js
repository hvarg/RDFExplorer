angular.module('rdfvis.directives').directive('sparqlEdit', sparqlEdit);

sparqlEdit.$inject = ['$timeout'];

function sparqlEdit ($timeout) {
  var directive = {
    link: link,
    restrict: 'EA',
    scope: {
      query: '='
    },
  };
  return directive;

  function link (scope, element, attrs) {
    $timeout(function (){
      var ed = CodeMirror(element[0], {
          mode:  "sparql",
          lineNumbers: true,
          gutter: true,
          lineWrapping: true,
      });
      ed.getDoc().setValue(scope.query.get());
    }, 200);
  }
}
