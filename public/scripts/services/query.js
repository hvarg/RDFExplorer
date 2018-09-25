angular.module('rdfvis.services').factory('queryService', queryService);
queryService.$inject = ['settingsService'];

function queryService (settings) {
  var prefix = {
    'rdf':  "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    'rdfs': "http://www.w3.org/2000/01/rdf-schema#",
    'owl':  "http://www.w3.org/2002/07/owl#",
    'text': "http://jena.apache.org/text#",
  };

  function u (uri) {
    return '<' + uri + '>';
  }

  function header (prefixes) {
    h = '';
    for (var i = 0; i < prefixes.length; i++) {
      if (prefix[prefixes[i]]) h += 'PREFIX ' + prefixes[i] + ': ' + u(prefix[prefixes[i]]) + '\n';
      else console.log('prefix "' + prefixes[i] + '" not found');
    }
    return h;
  }

  /* TODO: fix language filter and exact match for bif*/
  function search (keyword, type, limit, offset) {
    type = type || settings.searchClass.uri.value;
    limit = limit || settings.resultLimit;
    prefixes = ['rdf', 'rdfs'];
    q  = 'SELECT DISTINCT ?uri ?label ?type ?tlabel WHERE {\n';
    q += '  { SELECT ?uri ?label WHERE {\n';
    q += '      ?uri rdfs:label ?label . \n';
    q += '      FILTER (lang(?label) = "en")\n';
    if (keyword) {
      switch (settings.endpoint.type) {
        case 'virtuoso':
          q += '      ?label bif:contains "\'' + keyword + '\'" .\n';
          break;
        case 'fuseki':
          q += '      ?uri text:query (rdfs:label "' + keyword + '" '+ limit +') .\n';
          prefixes.push('text');
          break;
        default:
          q += '      FILTER regex(?label, "' + keyword + '", "i")\n'
      }
    }
    q += '  } LIMIT ' + limit;
    if (offset) q += ' OFFSET ' + offset;
    q += '\n  }\n  OPTIONAL {\n';
    q += '  ?uri rdf:type ?type .\n';
    q += '  ?type rdfs:label ?tlabel .\n';
    q += '  FILTER (lang(?tlabel) = "en")\n}}';
    return header(prefixes) + q;
  }

  function getClasses (uri, limit, offset) {
    q  = 'SELECT DISTINCT ?uri ?label WHERE {\n';
    q += '  ' + u(uri) + ' a ?uri .\n';
    q += '  ?uri rdfs:label ?label .\n';
    q += '  FILTER (lang(?label) = "en")\n';
    q += '}'
    if (limit)  q+= ' limit ' + limit;
    if (offset) q+= ' offset ' + offset;
    return header(['rdfs']) + q;
  }

  function getProperties (uri) {
    return 'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n' +
           'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n' +
           'PREFIX owl: <http://www.w3.org/2002/07/owl#>\n' +
           'PREFIX bd: <http://www.bigdata.com/rdf#>' +
           'PREFIX wikibase: <http://wikiba.se/ontology#>' +
           'SELECT DISTINCT ?uri ?label ?kind WHERE {\n' +
           '  <' + uri + '> ?uri [] .\n' +
           '  ?p wikibase:directClaim ?uri .\n' +
           '  OPTIONAL { ?p rdfs:label ?label . FILTER (lang(?label) = "en")}\n' +
           '  BIND(\n' +
           '    IF(EXISTS { ?uri rdf:type owl:ObjectProperty},\n' +
           '      1,\n' +
           '      IF(EXISTS {?uri rdf:type owl:DatatypeProperty},\n' +
           '        2,\n' +
           '        0))\n' +
           '    as ?kind)\n' +
           '}';
  }

  function countValuesType (uri, prop) {
    return 'SELECT (sum(?u) as ?uris) (sum(?l) as ?lits) WHERE {\n' + 
           '  <' + uri + '> <' + prop + '> ?o .\n' +
           '  BIND(IF(ISURI(?o),1,0) AS ?u)\n' +
           '  BIND(IF(!ISURI(?o),1,0) AS ?l)\n}';
  }

  function getPropUri (uri, prop) {
    return 'SELECT ?uri WHERE {\n' + 
           '  <' + uri + '> <' + prop + '> ?uri .\n}'
  }

  function getPropObject (uri, prop) {
    return 'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n' +
           'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n' +
           'SELECT DISTINCT ?uri ?label WHERE {\n' +
           '  <' + uri + '> <' + prop + '> ?uri .\n' +
           '  OPTIONAL { ?uri rdfs:label ?label . FILTER (lang(?label) = "en")}\n}';
  }

  function getPropDatatype (uri, prop) {
    return 'SELECT DISTINCT ?lit WHERE {\n' +
           '  <' + uri + '> <' + prop + '> ?lit .\n' +
           '  FILTER (lang(?lit) = "" || lang(?lit) = "en")\n}'
  }

  return {
    search: search, 
    getProperties: getProperties,
    getClasses: getClasses,
    countValuesType: countValuesType,
    getPropUri: getPropUri,
    getPropObject: getPropObject,
    getPropDatatype: getPropDatatype,
  };
}
