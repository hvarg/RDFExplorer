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
    resultLimit: 20,
  }

  settings.default = Object.assign({}, settings ); 
  settings.prefixes = [
    {prefix: 'rdf',       uri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#"},
    {prefix: 'owl',       uri: "http://www.w3.org/2002/07/owl#"},
    {prefix: 'text',      uri: "http://jena.apache.org/text#"},
    {prefix: 'wd',        uri: "http://www.wikidata.org/entity/"},
    {prefix: 'wds',       uri: "http://www.wikidata.org/entity/statement/"},
    {prefix: 'wdv',       uri: "http://www.wikidata.org/value/"},
    {prefix: 'wdt',       uri: "http://www.wikidata.org/prop/direct/"},
    {prefix: 'wikibase',  uri: "http://wikiba.se/ontology#"},
    {prefix: 'p',         uri: "http://www.wikidata.org/prop/"},
    {prefix: 'ps',        uri: "http://www.wikidata.org/prop/statement/"},
    {prefix: 'pq',        uri: "http://www.wikidata.org/prop/qualifier/"},
    {prefix: 'rdfs',      uri: "http://www.w3.org/2000/01/rdf-schema#"},
    {prefix: 'bd',        uri: "http://www.bigdata.com/rdf#"},
    {prefix: 'dbc',       uri: "http://dbpedia.org/resource/Category:"},
    {prefix: 'dbo',       uri: "http://dbpedia.org/ontology/"},
    {prefix: 'dbp',       uri: "http://dbpedia.org/property/"},
    {prefix: 'dbr',       uri: "http://dbpedia.org/resource/"},
    {prefix: 'dbt',       uri: "http://dbpedia.org/resource/Template:"},
    {prefix: 'dc',        uri: "http://purl.org/dc/elements/1.1/"},
    {prefix: 'dct',       uri: "http://purl.org/dc/terms/"},
    {prefix: 'foaf',      uri: "http://xmlns.com/foaf/0.1/"},
    {prefix: 'yago',      uri: "http://dbpedia.org/class/yago/"},
    {prefix: 'wiki-commons', uri: "http://commons.wikimedia.org/wiki/"},
    {prefix: 'umbel',     uri: "http://umbel.org/umbel#"},
    {prefix: 'umbel-ac',  uri: "http://umbel.org/umbel/ac/"},
    {prefix: 'umbel-rc',  uri: "http://umbel.org/umbel/rc/"},
    {prefix: 'umbel-sc',  uri: "http://umbel.org/umbel/sc/"},
    {prefix: 'dul',       uri: "http://www.ontologydesignpatterns.org/ont/dul/DUL.owl"},
    {prefix: 'schema',    uri: "http://schema.org/"},
    {prefix: 'vrank',     uri: "http://purl.org/voc/vrank#"},
    {prefix: 'skos',      uri: "http://www.w3.org/2004/02/skos/core#"},
    {prefix: 'prov',      uri: "http://www.w3.org/ns/prov#"},
  ];

  // selected = {uri: '', object: [], datatype: [], text: [], extra: [], image: [], values: {}},
  settings.describe = {
    exclude: ["http://purl.org/voc/vrank#hasRank"],
    objects: ["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"],
    datatype: [],
    text: ["http://dbpedia.org/ontology/abstract"],
    image: ["http://dbpedia.org/ontology/thumbnail"],
    external: ["http://dbpedia.org/ontology/wikiPageExternalLink", "http://xmlns.com/foaf/0.1/homepage"],
  }

  return settings;
}
