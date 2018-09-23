angular.module('rdfvis.services').factory('propertyGraphService', propertyGraphService);
propertyGraphService.$inject = ['requestService'];

function propertyGraphService (req) {
  var nodeWidth = 220,
      nodeBaseHeight = 30,
      diffParentChild = 20,
      childHeight = 20,
      childPadding = 10;

  var propertyGraph = { //TODO this to the end;
    // DATA:
    selected: null,
    nodes: [],
    edges: [],
    filters: {
      text: {name: 'contains', inputs: 1, data: {keyword: {type: 'text'}}},
      lang: {name: 'language', inputs: 1, data: {language: {type: "text"}} },
      regex: {name: 'regex', inputs: 1, data: {regex: {type: "text"}} },
      leq: {name: 'less than', inputs: 1, data: {number: {type: "number"}} },
      geq: {name: 'more than', inputs: 1, data: {number: {type: "number"}} },
    },
    colors: {
      rConst: '#1f77b4',
      rVar:   '#2ca02c',
      pConst: '#ff7f0e',
      pVar:   '#d62728',
      pLit:   '#9467bd',
    },
    // Functions:
    addNode: addNode,
    addEdge: addEdge,
    getNodeByUri: getNodeByUri,
    toQuery: toQuery,
    connect: connect,
    refresh: refresh,
    getSelected: getSelected,
    // Defined elsewhere:
    describe: null,
    edit: null,
    getQueries: null,
    // From viz:
    element: null,
    visual: null,
  }

  var lastNodeId = 0;
  var lastPropId = 0;
  var lastVarId = 0;
  var uriToNode = {};
  var usedAlias = [];


  function u (uri) { return '<'+uri+'>'; }

  /******* Filter TDA ********************************************************/
  function Filter (variable, type, data) {
    this.variable = variable;
    this.type = type;
    this.data = data;
  }

  Filter.prototype.apply = function () {
    if (this.type == 'lang') {
      return 'FILTER (lang(' + this.variable.get() + ') = "' + this.data.language + '")\n';
    }
    if (this.type == 'text') { //Only working with virtuoso currently
        return this.variable.get() + ' bif:contains "\'' + this.data.keyword + '\'" .\n';
      //return 'FILTER regex(' + v.get() + ', "' + data.keyword + '", "i")\n'
    }
    if (this.type == 'regex') {
        return 'FILTER regex(' + this.variable.get() + ', "' + this.data.regex + '")\n'
    }
    if (this.type == 'leq') {
        return 'FILTER (' + this.variable.get() + ' <' + this.data.number + ')\n'
    }
    if (this.type == 'geq') {
        return 'FILTER (' + this.variable.get() + ' >' + this.data.number + ')\n'
    }
    console.log('filter type "'+ type +'" not implemented.');
    return null;
  };

  /******* Variable TDA ******************************************************/
  function Variable (parent) {
    this.id = lastVarId++; // Secure variable name
    this.alias = '';       // User defined variable name
    this.filters = [];
    this.options = {show: true, count: false};
    this.results = [];
    //this.parent = parent;
  }

  Variable.prototype.toString = function () {
    return '?' + (this.alias ? this.alias : this.id);
  }

  Variable.prototype.get = function () {
    return String(this);
  };

  Variable.prototype.setAlias = function (alias) {
    if (usedAlias.indexOf(alias) >= 0) return false;
    if ((i = usedAlias.indexOf(this.alias)) >= 0) { //Remove old alias
      usedAlias.splice(i, 1);
    }
    if (alias) {
      usedAlias.push( alias );
      this.alias = alias;
    } else {
      this.alias = '';
    }
    return true;
  };

  Variable.prototype.getName = function () {
    return this.alias ? this.alias : String(this.id);
  };

  var validOpts = ['show', 'count'];
  Variable.prototype.setOptions = function (opts) {
    var keys = Object.keys(opts);
    keys = keys.filter(k => {
      return (validOpts.indexOf(k) >= 0);
    });
    keys.forEach(k => {
      this.options[k] = opts[k];
    });
  };

  Variable.prototype.addFilter = function (type, data) {
    this.filters.push( new Filter(this, type, data) );
  };

  Variable.prototype.removeFilter = function (filter) {
    var index = this.filters.indexOf(filter);
    if (index >= 0) {
      this.filters.splice(index, 1);
      return true;
    } else {
      return false;
    }
  };

  /******* RDFResource TDA ***************************************************/
  function RDFResource () {
    this.isVar = true;
    this.variable = new Variable(this);
    this.uris = [];
    this.cur = -1;
  }

  /**** from controllers ****/
  RDFResource.prototype.describe = function () {
    this.select();
    if (propertyGraph.describe)
      propertyGraph.describe(this);
  };

  RDFResource.prototype.edit = function () {
    this.select();
    if (propertyGraph.edit)
      propertyGraph.edit(this);
  };

  RDFResource.prototype.onClick = function () {
    if (this.isVariable() || (this.isProperty && this.isLiteral())) this.edit();
    else if (this.countUri() > 0) this.describe();
    else console.log('This element is not a variable nor has values!')
  };

  RDFResource.prototype.onDblClick = function () {
  };

  RDFResource.prototype.select = function () {
    propertyGraph.selected = this;
  };

  RDFResource.prototype.mkVariable = function () {
    this.isVar = true;
  };

  RDFResource.prototype.mkConst = function () {
    this.isVar = false;
  };

  RDFResource.prototype.isVariable = function () {
    return this.isVar; 
  };

  RDFResource.prototype.getUri = function () {
    if (this.cur >= 0) return this.uris[this.cur];
    return null;
  };

  RDFResource.prototype.nextUri = function () {
    if (this.cur < 0) return null;
    this.cur = (this.cur + 1) % this.uris.length;
    return this.getUri();
  };

  RDFResource.prototype.prevUri = function () {
    if (this.cur < 0) return null;
    this.cur = (this.cur == 0) ? (this.uris.length - 1) : (this.cur - 1) ;
    return this.getUri();
  };

  RDFResource.prototype.countUri = function () { //TODO: Replace with hasUri
    return this.uris.length;
  };

  RDFResource.prototype.addUri = function (uri) {
    if (this.uris.indexOf(uri) < 0) {
      this.uris.push(uri);
      if (this.uris.length == 1) this.cur = 0;
      return true;
    }
    return false;
  };

  RDFResource.prototype.removeUri = function (uri) {
    var i = this.uris.indexOf(uri);
    if (i < 0) return false;
    this.uris.splice(i, 1);
    if (this.uris.length == 0) {
      this.cur = -1;
    } else if (this.cur == i) {
      this.nextUri();
    }
    return true;
  };

  RDFResource.prototype.getRepr = function () {
    if (this.isVariable()) return this.variable.get();
    if (this.countUri() > 0) return this.getUri().getLabel();
    return null;
  };

  RDFResource.prototype.createQuery = function () {
    //FIXME: do not return if this is unbound
    if (!this.isVariable()) return null;
    var self = this;
    var q = '';
    var header  = 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n'
        header += 'SELECT DISTINCT ?uri ?label WHERE {\n'
        header += '  { SELECT DISTINCT ('+ self.variable.get() +' as ?uri) {\n';
    var tmp;
    var vEdges = [];
    var vNodes = [];
    var queue  = [self];

    while (queue.length > 0) {
      var cur = queue.pop();
      vNodes.push(cur);
      var edges = propertyGraph.edges.filter(e => {
        return (e.source.parentNode == cur || e.target == cur || e.source == cur);
      });
      edges.forEach(e => {
        if (vEdges.indexOf(e) < 0) {
          vEdges.push(e);
          tmp = [e.source.parentNode, e.source, e.target];
          for (i = 0; i < 3; i++) {
            if (tmp[i].isVariable()) {
              if (tmp[i] !== cur && vNodes.indexOf(tmp[i]) < 0) queue.push(tmp[i]);
              if (tmp[i] === self) tmp[i] = self.variable.get(); //FIXME ?
              else tmp[i] = tmp[i].variable.get();
            } else {
              //TODO: more than one value
              tmp[i] = u(tmp[i].getUri());
            }
          }
          q += '    ' + tmp.join(' ') + ' .\n';
        }
      });
      cur.variable.filters.forEach(filter => {
        q += '    ' + filter.apply();
      });
      if (cur.isNode()) {
        cur.literalRelations().forEach(relation => {
          tmp = ['','',''];
          if (relation.parentNode.isVariable()) tmp[0] = relation.parentNode.variable.get();
          else tmp[0] = u(relation.parentNode.getUri());
          if (relation.isVariable()) tmp[1] = relation.variable.get();
          else tmp[1] = u(relation.getUri());
          tmp[2] = relation.literal.get();
          q += '    ' + tmp.join(' ') + ' .\n';
          relation.variable.filters.forEach(filter => { q += '    ' + filter.apply(); });
          relation.literal.filters.forEach(filter => { q += '    ' + filter.apply(); });
        });
      }
    }
    if (q) q = header + q;
    else return null;
    q += '    } limit 10\n  }\n'
    q += '  OPTIONAL {\n'
    q += '    FILTER (lang(?label) = "en")\n';
    q += '    ?uri rdfs:label ?label .\n';
    q += '  }\n} limit 10';
    //console.log(q);
    return q;
  };

  RDFResource.prototype.getResults = function (onStart, onEnd) {
    if (!this.isVariable()) {
      console.log('this resource is a constraint!');
      return null;
    }
    if (onStart) onStart();

    var self = this;

    var q = this.createQuery();
    console.log(q);

    var myQuery = propertyGraph.toQuery([self])[0];
    /*var b = myQuery.addLabels([repr]);
    b[repr].filters.push({apply: function () {
      return 'FILTER (lang('+repr+'Label) = "en")\n';
    },});*/
    console.log(myQuery.get());
    var q = myQuery.get();

    if (q) {
      req.execQuery(q, data => {
        console.log(data.results);
        self.variable.results = data.results.bindings;
        //console.log(self.variable.results);
        if (onEnd) onEnd();
      });
    }
  };

  RDFResource.prototype.loadPreview = function (opts) {
    if (opts && opts.onStart) opts.onStart();
    var callback = (opts && opts.onEnd) ? opts.onEnd : null;

    var self = this;
    var queries = propertyGraph.toQuery([self]);
    var myQuery = queries.filter(q => { return (q.resources.indexOf(self) >= 0); })

    if (myQuery.length == 1) {
      if (self.isVariable()) {
        myQuery = myQuery[0];
        myQuery.data.select = [self.variable]; //Only get this variable.
        if (opts) {
          if (opts.limit) myQuery.data.limit = opts.limit;
          if (opts.offset) myQuery.data.offset = opts.offset;
          if (opts.varFilter) {
            var bindings  = myQuery.addLabels([self.variable]);
            var labelName = Object.keys(bindings)[0];
            var thisFilter = new Filter({get: () => {return labelName}}, 'regex', {'regex': opts.varFilter});
            myQuery.data.filters.add(thisFilter);
          }
        }
        retrieveResults(myQuery, self.isLiteral() ? null :  callback);
      }

      if (self.isLiteral()) {
        var litQuery = propertyGraph.toQuery([self])[0];
        litQuery.data.select = [self.literal]; //Only get this variable.
        if (opts) {
          if (opts.litlimit) litQuery.data.limit = opts.litlimit;
          if (opts.litoffset) litQuery.data.offset = opts.litoffset;
          if (opts.litFilter) {
            litQuery.data.filters.add(
              new Filter(self.literal, 'regex', {'regex': opts.litFilter})
            );
          }
        }
        retrieveResults(litQuery, callback);
      }

    } else {
      console.log('cant resolve this resource');
      return null;
    }
  }

  RDFResource.prototype.hasResults = function () {
    return (this.variable.results.length > 0);
  }

  RDFResource.prototype.getResult = function () {
    return this.variable.results[0].value;
  }

  /******* Node TDA **********************************************************/
  function Node () {
    RDFResource.call(this);
    this.properties = [];
    // Representation stuff
    propertyGraph.nodes.push(this);
    this.id = lastNodeId++;
    this.lastPropDraw = 0;
    this.redraw = false;
  }

  Node.prototype = Object.create(RDFResource.prototype);
  Node.prototype.constructor = Node;

  Node.prototype.getWidth = function () {
    return nodeWidth;
  };

  Node.prototype.getBaseHeight = function () {
    return nodeBaseHeight;
  };

  Node.prototype.getHeight = function () {
    return nodeBaseHeight + this.properties.length*(childHeight+childPadding);
  };

  Node.prototype.setPosition = function (x, y) {
    this.x = x;
    this.y = y;
    return this;
  };

  Node.prototype.addUri = function (uri) {
    uriToNode[uri] = this;
    return RDFResource.prototype.addUri.call(this, uri);
  };

  Node.prototype.getColor = function () {
    // This function returns an unique 'string' that defines the color of this node.
    if (this.isVariable()) return propertyGraph.colors.rVar;
    else return propertyGraph.colors.rConst;
  };

  Node.prototype.newProp = function () {
    return new Property(this);
  };

  Node.prototype.getPropByUri = function (uri) {
    for (var i = 0; i < this.properties.length; i++) {
      if (this.properties[i].getUri() == uri)
        return this.properties[i];
    }
    return null;
  };

  Node.prototype.isNode = function () {
    return true;
  };

  Node.prototype.isProperty = function () {
    return false;
  };

  Node.prototype.literalRelations = function () {
    return this.properties.filter(p => { return p.isLiteral(); });
  };

  Node.prototype.isLiteral = function () {
    return false;
  };

  Node.prototype.delete = function () {
    var i, j, edge, prop, tmp;
    // remove all edges with this node as target.
    for (i = propertyGraph.edges.length - 1; i >= 0; i--) {
      edge = propertyGraph.edges[i];
      if (edge.target === this) {
        // remove the property if is the only target
        tmp = propertyGraph.edges.filter(e => { return (e.source === edge.source); });
        if (tmp.length == 1) {
          tmp[0].source.delete();
        }
        propertyGraph.edges.splice(i, 1);
      }
    }
    // remove all edges with source = some property of this node.
    for (j = 0; j < this.properties.length; j++) {
      prop = this.properties[j];
      for (i = propertyGraph.edges.length - 1; i >= 0; i--) {
        edge = propertyGraph.edges[i];
        if (edge.source === prop) 
          propertyGraph.edges.splice(i, 1);
      }
    }
    // remove this node.
    if (propertyGraph.selected == this) propertyGraph.selected = null;
    else {
      this.properties.forEach(p => {
        if (propertyGraph.selected == p) propertyGraph.selected = null;
      });
    }
    for (i = 0; i < propertyGraph.nodes.length; i++) {
      node = propertyGraph.nodes[i];
      if (node === this) 
        propertyGraph.nodes.splice(i, 1);
    }
  };

  /******* Property TDA ******************************************************/
  function Property (parentNode) {
    RDFResource.call(this);
    this.id = lastPropId++;
    this.parentNode = parentNode;
    this.isLit = false;
    this.literal = null;
    this.index = parentNode.properties.length;
    parentNode.properties.push(this);
  }

  Property.prototype = Object.create(RDFResource.prototype);
  Property.prototype.constructor = Property;

  Object.defineProperty(Property.prototype, 'y',  { get: function() { return this.parentNode.y;  } }); 
  Object.defineProperty(Property.prototype, 'x',  { get: function() { return this.parentNode.x; } });

  Property.prototype.getWidth = function () {
    return this.parentNode.getWidth() - diffParentChild;
  };

  Property.prototype.getHeight = function () {
    return childHeight;
  };

  Property.prototype.getOffsetY = function () {
    return this.parentNode.getBaseHeight()/2 + this.index * (this.getHeight() + childPadding);
  };

  Property.prototype.getRepr = function () {
    var repr = RDFResource.prototype.getRepr.call(this);
    if (repr && this.isLiteral()) return repr + ' → ' + this.literal.get();
    else return repr
  };

  Property.prototype.getColor = function () {
    if (this.isLiteral()) return propertyGraph.colors.pLit;
    if (this.isVariable()) return propertyGraph.colors.pVar;
    else return propertyGraph.colors.pConst;
  };

  Property.prototype.isNode = function () {
    return false;
  };

  Property.prototype.isProperty = function () {
    return true;
  };

  Property.prototype.isLiteral = function () {
    return this.isLit;
  };

  Property.prototype.mkLiteral = function () {
    this.isLit = true;
    if (!this.literal) this.literal = new Variable();
    //TODO
  }

  Property.prototype.delete = function () {
    var thisProp = this;
    var i, edge;
    // remove all edges 
    for (i = propertyGraph.edges.length - 1; i >= 0; i--) {
      edge = propertyGraph.edges[i];
      if (edge.source === thisProp)
        propertyGraph.edges.splice(i, 1);
    }
    // remove this property from parent and fix index
    i = thisProp.parentNode.properties.indexOf(thisProp);
    thisProp.parentNode.properties.splice(i, 1);
    for (; i < thisProp.parentNode.properties.length; i++)
      thisProp.parentNode.properties[i].index -= 1;
    thisProp.parentNode.redraw = true;
    if (propertyGraph.selected == this) propertyGraph.selected = null;
  }

  /******* Edge TDA **********************************************************/
  function Edge (source, target) {
    this.source = source;
    this.target = target;
    propertyGraph.edges.push(this);
  }

  Edge.prototype.contains = function (resource) {
    return (this.source.parentNode == resource ||
            this.target == resource ||
            this.source == resource);
  }

  /***************************************************************************
  function propertyGraph () {
    this.nodes = [];
    this.edges = [];
    this.filters = {};
    this.lastNodeId = 0;
    this.lastVarId = 0;
    this.usedAlias = [];
    this.uriToNode = {};
  }*/
  /***************************************************************************/
  /***************************************************************************/
  function connect (element, graph) {
    propertyGraph.element = element;
    propertyGraph.visual = graph;
    propertyGraph.element.addEventListener("drop", onDrop);
    propertyGraph.element.addEventListener("dragover", onDragOver);
  }

  function refresh () {
    propertyGraph.visual.updateGraph();
  }

  function getSelected () {
    return propertyGraph.selected;
  }

  function onDragOver (ev) {
    ev.preventDefault();
  }

  function onDrop (ev) {
    var z    = propertyGraph.visual.getZoom();
    var uri  = ev.dataTransfer.getData("uri");
    var prop = ev.dataTransfer.getData("prop");
    var special = ev.dataTransfer.getData("special");
    if (!uri && !prop && !special) return null;
    // Create or get the node unless this a literal property
    if (special != 'literal'){
      var d = propertyGraph.getNodeByUri(uri);
      if (!d) {
        d = propertyGraph.addNode();
        if (uri) {
          d.addUri(uri);
          d.mkConst();
        }
      }
      d.setPosition((ev.layerX - z[0])/z[2], (ev.layerY - z[1])/z[2]);
    }

    // Add the property
    if (prop) {
      if (uri) d.mkConst();
      var p = getSelected().getPropByUri(prop);
      if (!p) {
        p = getSelected().newProp();
        p.addUri(prop);
        p.mkConst();
      }
      if (special == 'literal') {
        // If we are creating a literal property.
        p.mkLiteral();
      } else {
        // If we are not creating a literal property create the edge (selected)--p-->(d)
        propertyGraph.addEdge(p, d);
      }
    }
    if (special == 'search') {
      var alias = ev.dataTransfer.getData("alias").replace(/ /g, '_');
      // From search, create the filters
      d.variable.setAlias(alias);
      refresh();
      p = d.newProp();
      p.addUri('http://www.w3.org/2000/01/rdf-schema#label');
      p.mkConst();
      p.mkLiteral();
      p.literal.setAlias(alias+'Label');
      p.literal.addFilter('lang', {language: 'en'});
      p.literal.addFilter('text', {keyword: alias});
    }
    if (d && (!prop) && d != propertyGraph.select) d.onClick();
    refresh();
  }

  /***************************************************************************/
  /**************************/
  /****** Public stuff ******/
  function addNode () {
    return new Node();
  }

  function addEdge (source, target) {
    /* FIXME: duplicate edges */
    if (source instanceof Property) 
      return new Edge(source, target);
    if (source instanceof Node) {
      return new Edge(source.newProp(), target);
    }
  }

  function getNodeByUri (uri) {
    return uriToNode[uri] || null;
  }

  function toQuery (resources) {
    // If no resources then all resources.
    if (!resources || resources.length == 0) {
      resources = [];
      propertyGraph.nodes.forEach(node => {
        resources.push(node);
        node.properties.forEach(prop => {
          resources.push(prop);
        });
      });
    }

    resources = resources.filter(r => { return r.isVariable() || (r.isProperty() && r.isLiteral()); });

    var queries = [];

    while (resources.length > 0) {
      var toSolve = new Set();
      var triples = new Set();
      var filters = new Set();
      var literals = new Set();

      var queue = [resources.pop()];
      
      while (queue.length > 0) {
        var cur = queue.pop();
        toSolve.add(cur);

        // Add edges who contains this resource (cur)
        var edges = propertyGraph.edges.filter(e => { return e.contains(cur); });
        edges.forEach(e => {
          triples.add(e);
          [e.source.parentNode, e.source, e.target].forEach(r => {
            if (r.isVariable()) {
              if (!toSolve.has(r)) queue.push(r);
            }
          });
        });

        // Add filters of this resource
        cur.variable.filters.forEach(f => { filters.add(f); });

        if (cur.isNode()) {
          // If is a node, add all literal relations.
          cur.literalRelations().forEach(r => {
            if (!toSolve.has(r)) queue.push(r);
          });
        } else if (cur.isLiteral()) {
          // If is a literal property add filters, this resource to literals and parent to queue.
          literals.add(cur);
          cur.literal.filters.forEach(f => { filters.add(f); });
          if (cur.parentNode.isVariable()) {
            if (!toSolve.has(cur.parentNode)) queue.push(cur.parentNode);
          }
        }
      }

      // Remove this query resources from requested elements and add variables to select
      var select = [];
      toSolve.forEach(r => {
        // remove
        var index = resources.indexOf(r);
        if (index >= 0) resources.splice(index, 1);
        // add
        if (r.isVariable()) select.push( r.variable );
        if (r.isProperty() && r.isLiteral()) select.push( r.literal );
      });

      // Check edges and add triples, values and prefixes
      var prefixes = new Set();
      var values = new Set();
      var where = [];
      var tmp, pre;
      triples.forEach(e => {
        tmp = [];
        [e.source.parentNode, e.source, e.target].forEach(r => {
          if (r.isVariable()) tmp.push(r.variable);
          else {
            if (r.uris.length == 1) {
              pre = r.getUri().toPrefix();
              if (pre[1]) prefixes.add(pre[1]);
              tmp.push(pre[0]);
            } else {
              tmp.push(r.variable);
              values.add(r);
            }
          }
        });
        where.push(tmp);
      });

      // Check literals
      literals.forEach(lit => { 
        tmp = [];
        [lit.parentNode, lit].forEach(r => {
          if (r.isVariable()) tmp.push(r.variable);
          else {
            if (r.uris.length == 1) {
              pre = r.getUri().toPrefix();
              if (pre[1]) prefixes.add(pre[1]);
              tmp.push(pre[0]);
            } else {
              tmp.push(r.variable);
              values.add(r);
            }
          }
        });
        tmp.push( lit.literal.get() );
        where.push(tmp);
      });

      queries.push({
        resources: Array.from(toSolve).sort(),
        data: {select: select, where: where, filters: filters, values: values, prefixes: prefixes, optional: [] },
        get: function () {
          if (this.data.select.length == 0 || (this.data.where.length == 0 && this.data.optional.length == 0))
            return null;
          // Use this function to get the query.
          var q = 'SELECT DISTINCT ' + this.data.select.map(s => {return s.get()}).join(' ') + ' WHERE {\n'
          this.data.where.forEach(triple => {
            q += '  ' + triple.join(' ') + ' .\n';
          });

          this.data.optional.forEach(opt => {
            q += '  OPTIONAL {\n';
            opt.where.forEach(triple => {
              q += '    ' + triple.join(' ') + ' .\n';
            });
            opt.filters.forEach(f => { q += '    ' + f.apply()});
            q += '  }'
          });

          this.data.filters.forEach(f => {q += '  ' + f.apply(); });

          this.data.values.forEach(v => {
            q += '  VALUES ' + v.variable.get() + ' {' + v.uris.map(u => {
              pre = u.toPrefix();
              if (pre[1]) this.data.prefixes.add(pre[1]);
              return pre[0];
            }).join(' ') + '}\n';
          });
          q += '}';

          if (this.data.limit) q += ' limit ' + this.data.limit;
          if (this.data.offset) q += ' offset ' + this.data.offset;

          var h = '';
          this.data.prefixes.forEach(p => {
            h += 'PREFIX ' + p.prefix + ': <' + p.uri + '>\n'
          });

          return h + q;
        },
        addLabels: function (select, opt) {
          opt = opt || false;
          if (select.length == 0) return null;
          var pre = "http://www.w3.org/2000/01/rdf-schema#label".toPrefix();
          if (pre[1]) this.data.prefixes.add(pre[1]);
          var bindings = {}
          select.forEach(s => {
            var name = s.get()+'Label';
            var trip = [s, pre[0], name];
            bindings[name] = s;
            if (opt) {
              this.data.optional.push({where: [trip], filters: []});
            } else {
              var index = this.data.where.findIndex(t => { return t.join(' ') == trip.join(' ')});
              if (index < 0)
                this.data.where.push(trip);
            }
          });
          return bindings;
        },
      });
    }
    return queries;
  }

  function retrieveResults (query, callback) {
    var sparql = query.get();
    var toLoad = [];
    query.data.select.forEach(s => {
      if (s.query != sparql) toLoad.push(s);
    });

    if (query.data.select.length != toLoad.length) {
      query.data.select = toLoad;
      sparql = query.get();
    }
    
    if (sparql) {
      req.execQuery(sparql, data => {
        if (data.results.bindings.length > 0) {
          query.data.select.forEach(s => {
            var values = new Set();
            var name = s.getName();
            s.results = data.results.bindings.map(r => { return r[name]; });
            s.results = s.results.filter(r => { return (!values.has(r.value) && values.add(r.value))});
            s.query = sparql;
          });
        }
        if (callback) callback();
      });
    }
  }

  return propertyGraph;
}
