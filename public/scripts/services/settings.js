angular.module('rdfvis.services').factory('settingsService', settingsService);
settingsService.$inject = [];

function settingsService () {
  var settings = {
    endpoint: "https://dbpedia.org/sparql",
    endpointType: "virtuoso",
    selectedClass: "http://dbpedia.org/ontology/Person",
    endpointLabel: {"https://dbpedia.org/sparql": "DBpedia" },
    resultLimit: 10,
  }

  return settings;
}
