# RDFExplorer
SPARQL visual query builder and RDF explorer

## Installation

Clone the repository, then:
```
  > npm install
  > npm start
```

Master branch its configured to work with [wikidata](https://www.wikidata.org/wiki/Wikidata:Main_Page). Live demo: [RDFExplorer.org](https://rdfexplorer.org)

DBpedia branch its configured to work with [dbpedia](http://dbpedia.org/sparql)


## Custom configuration

Master branch is configured to work with [wikidata endpoint](https://query.wikidata.org),
as they use an API to get labels this branch is configured with that custom behavior.
If you want to check how to extend this project I suggest to look into this branch.

DBpedia branch is configured to work with any SPARQL endpoint, setted to the [dbpedia enpoint](http://dbpedia.org/sparql) in this branch.
If you want to configure a new endpoint, I suggest using this branch as base.

General config file: `RDFExplorer/public/scripts/services/settings.js`

To change the query execution behavior check: `RDFExplorer/public/scripts/services/property-graph.js`

## License

<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/">Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License</a>.
