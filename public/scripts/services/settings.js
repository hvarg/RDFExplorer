angular.module('rdfvis.services').factory('settingsService', settingsService);
settingsService.$inject = [];

function settingsService () {
  var settings = {
    endpoint: {
      url: "https://dbpedia.org/sparql",
      type: "virtuoso",
      label: "DBpedia",
    },
    searchClass: {
      uri:   { type: "uri", value: "http://dbpedia.org/ontology/Person" },
      label: { type: "literal", "xml:lang": "en", value: "person" }
    },
    resultLimit: 10,
  }

  settings.default = Object.assign({}, settings ); 

  return settings;
}
