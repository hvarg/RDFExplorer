angular.module('rdfvis.services').factory('propertyGraphService', propertyGraphService);
propertyGraphService.$inject = ['requestService', 'logService', 'settingsService'];

function propertyGraphService (req, log, settings) {
  var nodeWidth = 220,
      childWidth = 200,
      nodeBaseHeight = 30,
      childHeight = 20,
      padding = 10;

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
        return 'FILTER regex(' + this.variable.get() + ', "' + this.data.regex + '", "i")\n'
    }
    if (this.type == 'leq') {
        return 'FILTER (' + this.variable.get() + ' <' + this.data.number + ')\n'
    }
    if (this.type == 'geq') {
        return 'FILTER (' + this.variable.get() + ' >' + this.data.number + ')\n'
    }
    if (this.type == 'isuri') {
      return 'FILTER isIRI(' + this.variable.get() + ')\n';
    }
    if (this.type == 'isliteral') {
      return 'FILTER isLiteral(' + this.variable.get() + ')\n';
    }
    console.log('filter type "'+ type +'" not implemented.');
    return null;
  };

  /******* Variable TDA ******************************************************/
  function Variable (tmpId) {
    if (tmpId) {
      this.id = tmpId;       // If a tmpId si provided, must check is not used already.
    } else {
      this.id = lastVarId++; // Secure variable name
    }
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
    // Fix alias
    alias = alias.replace(/ /g, '_');
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
  Variable.prototype.setOptions = function (opts) { //TODO: unused
    var keys = Object.keys(opts);
    keys = keys.filter(k => {
      return (validOpts.indexOf(k) >= 0);
    });
    keys.forEach(k => {
      this.options[k] = opts[k];
    });
  };

  Variable.prototype.addFilter = function (type, data) {
    log.add('New filter (' + type + ') for variable ' + String(this) + ' (' + this.id + ')');
    this.filters.push( new Filter(this, type, data) );
    return this.filters[this.filters.length-1];
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
  function RDFResource (dummy) {
    this.isVar = true;
    if (dummy) {
      this.variable = new Variable(-1);
    } else {
      this.variable = new Variable();
    }
    this.uris = [];
    this.cur = -1;
  }

  /**** from controllers ****/
  RDFResource.prototype.describe = function () {
    if (propertyGraph.describe)
      propertyGraph.describe(this);
  };

  RDFResource.prototype.edit = function () {
    if (propertyGraph.edit)
      propertyGraph.edit(this);
  };

  RDFResource.prototype.onClick = function () {
    this.select();
    if (!this.isVariable() && this.hasUris() && this instanceof Node) this.describe();
    else this.edit();
  };

  RDFResource.prototype.onDblClick = function () {
  };

  RDFResource.prototype.select = function () {
    propertyGraph.selected = this;
  };

  RDFResource.prototype.isSelected = function () {
    return (propertyGraph.selected === this);
  };

  RDFResource.prototype.mkVariable = function () {
    log.add('Node id ' + this.id + ' is now a variable');
    this.isVar = true;
  };

  RDFResource.prototype.mkConst = function () {
    log.add('Node id ' + this.id + ' is now a constant');
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

  RDFResource.prototype.hasUris = function () {
    return this.uris.length > 0;
  };

  RDFResource.prototype.addUri = function (uri) {
    if (this.uris.indexOf(uri) < 0) {
      log.add('Adding uri to node id ' + this.id + ' ('+ uri + ')');
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
    if (this.hasUris()) {
      if (this.uris.length == 1) return this.getUri().getLabel();
      else return '('+(this.cur+1)+'/'+this.uris.length+') '+ this.getUri().getLabel();
    }
    return null;
  };

  RDFResource.prototype.createQuery = function (opts) {
    if (!this.isVariable())
      return null;
    var q = new Query(this);
    if (opts && opts.limit) q.limit = opts.limit;
    if (opts && opts.offset) q.offset = opts.offset;
    if (q.triples.length == 0)
      return null;
    else
      return q;
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
    log.add('New node id ' + this.id);
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
    var h = nodeBaseHeight + this.properties.length * (childHeight + padding);
    this.properties.filter(p=>{return p.literal}).forEach(p=>{ h+= (childHeight + padding); })
    return h;
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
    if (this.isVariable()) return propertyGraph.colors.rVar;
    else return propertyGraph.colors.rConst;
  };

  Node.prototype.newProp = function () {
    var n = new Property(this);
    return n;
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
    log.add('Deleting node id ' + this.id);
    var i, j, edge, prop, tmp;
    // remove all edges with this node as target.
    for (i = propertyGraph.edges.length - 1; i >= 0; i--) {
      edge = propertyGraph.edges[i];
      if (edge.target === this) {
        // remove the property if is the only target
        tmp = propertyGraph.edges.filter(e => { return (e.source === edge.source); });
        if (tmp.length == 1) {
          tmp[0].source.delete();
        } else {
          propertyGraph.edges.splice(i, 1);
        }
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
    // remove all uris of this node;
    this.uris.forEach(uri => {
      if (uriToNode[uri]) delete uriToNode[uri];
    });
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

  Node.prototype.loadPreview = function (opts) {
    var q = this.createQuery(opts);
    if (q) {
      if (opts && opts.varFilter) {
        var l = q.addLabel(this);
        l.variable.addFilter('regex', {regex: opts.varFilter});
      } else {
        q.addOptLabel(this);
      }
      q.retrieve();
    }
  }

  /******* Property TDA ******************************************************/
  function Property (parentNode) {
    RDFResource.call(this);
    this.id         = lastPropId++;
    this.parentNode = parentNode;
    this.index      = parentNode.properties.length;
    this.literal    = null;
    parentNode.properties.push(this);
    log.add('New property id ' + this.id + ' for node id ' + parentNode.id);
  }

  Property.prototype = Object.create(RDFResource.prototype);
  Property.prototype.constructor = Property;

  Object.defineProperty(Property.prototype, 'y', { get: function() { return this.parentNode.y; } }); 
  Object.defineProperty(Property.prototype, 'x', { get: function() { return this.parentNode.x; } });

  Property.prototype.getWidth   = function () { return childWidth; };
  Property.prototype.getHeight  = function () { return childHeight; };
  Property.prototype.getX       = function () { return -(this.getWidth()/2); };
  Property.prototype.getY       = function () { return this.getOffsetY(); };

  Property.prototype.getOffsetY = function () { //FIXME: this is executed a lot of times;
    var h = this.parentNode.getBaseHeight()/2 + this.index * (this.getHeight() + padding);
    for (var i = 0; i < this.index; i++) {
      if (this.parentNode.properties[i].literal) h += (childHeight + padding);
    }
    return h;
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
    return !!(this.literal);
  };

  Property.prototype.mkLiteral = function () {
    for (var i = 0; i < propertyGraph.edges.length; i++) {
      if (propertyGraph.edges[i].source === this)
        return null;
    }
    log.add('Property id ' + this.id + 'is now literal');
    return new Literal(this);
  }

  Property.prototype.getLiteral = function () {
    return this.literal.variable;
  }

  Property.prototype.delete = function () {
    log.add('Deleting property id ' + this.id);
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
    if (propertyGraph.selected == this) thisProp.parentNode.onClick();
  }

  Property.prototype.loadPreview = function (opts) {
    //For wikidata only
    var q = this.createQuery(opts),
        dc = new RDFResource(true),
        p = new RDFResource(true);
    /*dc.mkConst();
    dc.addUri('http://wikiba.se/ontology#directClaim');*/
    dc.variable.alias = 'wikibaseP';
    dc.variable.filters.push({apply: function () {
      return 'FILTER(regex(str(?wikibaseP), "http://wikiba.se/ontology#" ) )\n';
    }});
    p.variable.alias = this.variable.getName();
    var t1 = [p, dc, this],
        t2 = q.createTripleLabel(p);

    if (opts && opts.varFilter) {
      t2[2].variable.addFilter('regex', {regex: opts.varFilter});
      q.triples.push(t1);
      q.triples.push(t2);
    } else {
      q.optionals.push([t1, t2]);
    }
    q.select.push(t2[2]);
    p.variable.alias = this.variable.getName() + 'tmp';
    q.retrieve();
  }

  /******* Literal TDA *******************************************************/
  function Literal (parentProperty) {
    RDFResource.call(this);
    this.parent = parentProperty;
    parentProperty.literal = this;
  }

  Literal.prototype = Object.create(RDFResource.prototype);
  Literal.prototype.constructor = Literal;
  Literal.prototype.getColor = function () {
    return propertyGraph.colors.pLit;
  }

  Literal.prototype.getOffsetY = function () { //FIXME: this is executed a lot of times;
    return this.parent.getOffsetY() + this.getHeight() + padding;
  };

  Literal.prototype.getWidth = function () {
    return childWidth;
  };

  Literal.prototype.getHeight = function () {
    return childHeight;
  };

  Literal.prototype.getPath = function () {
    var x = 10 - this.parent.getWidth()/2,
        y = this.parent.getOffsetY() + this.parent.getHeight(),
        x2 = x + 17,
        y2 = y + 20;
    return 'M'+x+','+y+'V'+y2+'H'+x2;
  };

  Literal.prototype.loadPreview = function (opts) {
    var q = this.createQuery(opts);
    if (opts && opts.varFilter) {
      var tmpF = this.variable.addFilter('regex', {regex: opts.varFilter});
    }
    q.retrieve();
    this.variable.removeFilter(tmpF);
  }

  /******* Edge TDA **********************************************************/
  function Edge (source, target) {
    this.source = source;
    this.target = target;
    propertyGraph.edges.push(this);
    log.add('New edge from property id ' + source.id + ' to node id ' + target.id);
  }

  Edge.prototype.contains = function (resource) {
    return (this.source.parentNode == resource ||
            this.target == resource ||
            this.source == resource);
  }

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
    if (special != 'literal') {
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
      var sel = getSelected();
      if (!sel || !sel.isNode()) {
        console.log('Selected resource does not support property creation!');
        return null;
      }
      var p = sel.getPropByUri(prop);
      if (!p) {
        p = sel.newProp();
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
      var alias = ev.dataTransfer.getData("alias");
      // From search, create the filters
      d.variable.setAlias(alias);
      refresh();
      p = d.newProp();
      p.addUri('http://www.w3.org/2000/01/rdf-schema#label');
      p.mkConst();
      p.mkLiteral();
      p.getLiteral().setAlias(alias+'Label');
      p.getLiteral().addFilter('lang', {language: 'en'});
      p.getLiteral().addFilter('text', {keyword: alias});
    }

    if (d && (!prop) && d != propertyGraph.select) d.onClick();
    refresh();
  }

  /***************************************************************************/
  /****** Public stuff ******/
  function addNode () {
    return new Node();
  }

  function addEdge (source, target) {
    /* FIXME: duplicate edges */
    if (source instanceof Property) return new Edge(source, target);
    if (source instanceof Node)     return new Edge(source.newProp(), target);
  }

  function getNodeByUri (uri) {
    return uriToNode[uri] || null;
  }

  /***** Query creator stuff *****/
  function Query (resource) {
    this.select = [resource];
    this.update(resource);
    this.optionals = [];
  }

  Query.prototype.update = function (resource) {
    var dep = new Set(),
        queue = [],
        triples = [];

    queue.enqueue = function (x) {
      if (x.isVariable() && !dep.has(x)) {
        dep.add(x);
        this.push(x);
        return true;
      }
      return false;
    };

    triples.add = function (s, p, o) {
      if (this.some(e => { return (e[0] === s && e[1] === p && e[2] === o); })) 
        return false;
      this.push([s,p,o]);
      [s,p,o].forEach( r =>{ queue.enqueue(r); });
    }

    triples.addEdge = function (e) {
      this.add(e.source.parentNode, e.source, e.target);
    }
    
    queue.enqueue(resource);

    while (queue.length > 0) {
      var cur = queue.pop();
      if (cur instanceof Node) {
        propertyGraph.edges
          .filter(e => { return (e.source.parentNode === cur || e.target === cur); })
          .forEach(e => { triples.addEdge(e) });
        cur.literalRelations().forEach(r => { triples.add(cur, r, r.literal); });
      } else if (cur instanceof Property) {
        if (cur.isLiteral()) {
          triples.add(cur.parentNode, cur, cur.literal);
        } else {
          propertyGraph.edges
            .filter(e => { return (e.source === cur); })
            .forEach(e => { triples.addEdge(e); });
        }
      } else if (cur instanceof Literal) {
        triples.add(cur.parent.parentNode, cur.parent, cur);
      }
    }
    this.dep = dep;
    this.triples = triples;
  }

  Query.prototype.get = function () {
    if (this.triples.length == 0) return null;
    var self =  this,
        values = new Set(),
        prefixes = new Set();

    function writeTriple (t) {
      return t.map(r => {
        if (r.isVariable()) return r.variable;
        else {
          if (r.uris.length == 1) {
            if (r.parent) {
              return '"' + r.getUri() + '"';
            } else {
              var pre = r.getUri().toPrefix();
              if (pre[1]) prefixes.add(pre[1]);
              return pre[0];
            }
          } else {
            values.add(r);
            return r.variable;
          }
        }
      }).join(' ') + ' .\n';
    }

    self.q = "SELECT DISTINCT " + self.select.map(r => {return r.variable}).join(' ') + " WHERE {\n"
    self.triples.forEach(t => {
      self.q += '  ' + writeTriple(t);
      // flatten all filters and apply
      [].concat.apply([], t
          .filter(r => { return r.isVariable(); })
          .map(r => { return r.variable.filters; })
      ).forEach(f => { self.q += '  ' + f.apply(); });
      if (t[1].isVariable() && t[2].isVariable()) {
        if (t[2] instanceof Literal) {
          var nf = new Filter(t[2].variable, 'isliteral');
        } else {
          var nf = new Filter(t[2].variable, 'isuri');
        }
        self.q += '  ' + nf.apply();
      }
    });

    self.optionals.forEach(opt => {
      self.q += '  OPTIONAL {\n'
      opt.forEach(t => {
        // Same as for triples
        self.q += '    ' + writeTriple(t);
        [].concat.apply([], t
            .filter(r => { return r.isVariable(); })
            .map(r => { return r.variable.filters; })
        ).forEach(f => { self.q += '    ' + f.apply(); });
        if (t[1].isVariable() && t[2].isVariable()) {
          if (t[2] instanceof Literal) {
            var nf = new Filter(t[2].variable, 'isliteral');
          } else {
            var nf = new Filter(t[2].variable, 'isuri');
          }
          self.q += '  ' + nf.apply();
        }
      });
      self.q += '  }\n'
    });

    Array.from(values).forEach(v => {
      self.q += '  VALUES ' + v.variable + ' {';
      var mapped = v.parent ?
        v.uris.map(u => { return '"' + u + '"'}) :
        v.uris.map(u => {
          var pre = u.toPrefix();
          if (pre[1]) prefixes.add(pre[1]);
          return pre[0];
        });
      self.q += mapped.join(' ') + '}\n';
    });

    self.q += '}'
    if (self.limit) self.q += ' LIMIT ' + self.limit;
    if (self.offset) self.q += ' OFFSET ' + self.offset;

    var h = '';
    Array.from(prefixes).forEach(p => {
      h += 'PREFIX ' + p.prefix + ': <' + p.uri + '>\n'
    });
    this.q = h + this.q;
    return this.q;
  };

  Query.prototype.createTripleLabel = function (resource) {
    if (!resource.isVariable())
      throw new Error(resource, ' is not a variable');
    if (resource instanceof Literal)
      throw new Error(resource, ' is a literal');
    var p = new RDFResource(true);
    p.mkConst();
    p.addUri(settings.labelUri);
    var o = new RDFResource(true);
    o.variable.alias = resource.variable.getName() + 'Label';
    o.variable.addFilter('lang', {language: settings.lang});
    return [resource, p, o];
  }

  Query.prototype.addLabel = function (resource) {
    var t = this.createTripleLabel(resource);
    if (this.triples.some(e => { return (e[0] === t[0] && e[1] === t[1] && e[2] === t[2]); })) 
        return null;
    this.triples.push(t);
    this.select.push(t[2]);
    return t[2];
  }

  Query.prototype.addOptLabel = function (resource) {
    var t = this.createTripleLabel(resource);
    this.optionals.push([t]);
    this.select.push(t[2]);
    return t[2];
  }

  Query.prototype.addLabels = function () {
    var self = this;
    var labels = [];
    self.select.forEach(r => { 
      if (r instanceof Node || r instanceof Property)
        labels.push(self.addLabel(r));
    });
    return labels;
  }

  Query.prototype.selectAll = function () {
    this.select = Array.from(this.dep);
  }

  Query.prototype.retrieve = function () {
    var self = this,
        q = self.get(),
        n = self.select.filter(r => {return (r.variable.id != -1 && r.variable.query != q); }).length;
    if (q && n > 0) {
      req.execQuery(q, data => {
        if (data.results.bindings.length > 0) {
          self.select.forEach(r => {
            var values = new Set(),
                variable = r.variable,
                name = variable.getName();
            variable.results = data.results.bindings.filter(d => { return d[name]}).map(d => { return d[name]; });
            variable.results = variable.results.filter(d => { return (!values.has(d.value) && values.add(d.value))});
            variable.query = q;
          });
        } else {
          self.select.forEach(r => {
            r.variable.results = [];
            r.variable.query = q;
          });
        }
      });
    }
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
          cur.getLiteral().filters.forEach(f => { filters.add(f); });
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
        if (r.isProperty() && r.isLiteral()) select.push( r.getLiteral() );
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
        tmp.push( lit.getLiteral().get() );
        where.push(tmp);
      });

      if (select.length > 0 && where.length > 0) queries.push({
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
        } else {
          query.data.select.forEach(s => {
            s.results = [];
            s.query = sparql;
          });
        }
        if (callback) callback();
      });
    }
  }

  return propertyGraph;
}
