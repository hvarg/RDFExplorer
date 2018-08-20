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

  function getObjProp (uri, limit, offset) {
    q  = 'SELECT DISTINCT ?uri ?label WHERE {\n';
    q += '  ' + u(uri) + ' ?uri [] .\n';
    q += '  ?uri a owl:ObjectProperty ; rdfs:label ?label\n';
    q += '  FILTER (lang(?label) = "en")\n';
    q += '}'
    if (limit)  q+= ' limit ' + limit;
    if (offset) q+= ' offset ' + offset;
    return header(['rdfs', 'owl']) + q;
  }
  
  function getDatatypeProp (uri, limit, offset) {
    q  = 'SELECT DISTINCT ?uri ?label WHERE {\n';
    q += '  ' + u(uri) + ' ?uri [] .\n';
    q += '  ?uri a owl:DatatypeProperty ; rdfs:label ?label\n';
    q += '  FILTER (lang(?label) = "en")\n';
    q += '}'
    if (limit)  q+= ' limit ' + limit;
    if (offset) q+= ' offset ' + offset;
    return header(['rdfs', 'owl']) + q;
  }

  function getObjPropValues (uri, prop, limit, offset) {
    q  = 'SELECT DISTINCT ?uri ?label WHERE {\n';
    q += '  ' + u(uri) + ' ' + u(prop) + ' ?uri .\n';
    q += '  ?uri rdfs:label ?label .\n';
    q += '  FILTER (lang(?label) = "en")\n';
    q += '}'
    if (limit)  q+= ' limit ' + limit;
    if (offset) q+= ' offset ' + offset;
    return header(['rdfs']) + q;
  }

  function getDatatypePropValues (uri, prop, limit, offset) {
    q  = 'SELECT DISTINCT ?uri WHERE {\n';
    q += '  ' + u(uri) + ' ' + u(prop) + ' ?uri .\n';
    q += '}'
    if (limit)  q+= ' limit ' + limit;
    if (offset) q+= ' offset ' + offset;
    return header(['rdfs']) + q;
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

  return {
    search: search, 
    getObjProp: getObjProp,
    getDatatypeProp: getDatatypeProp,
    getObjPropValue: getObjPropValues,
    getDatatypePropValue: getDatatypePropValues,
    getClasses: getClasses,
  };
}
