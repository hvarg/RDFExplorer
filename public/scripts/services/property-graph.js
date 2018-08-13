angular.module('rdfvis.services').factory('propertyGraphService', propertyGraphService);
propertyGraphService.$inject = ['requestService'];

function propertyGraphService (req) {
  var nodeWidth = 220,
      nodeBaseHeight = 30,
      diffParentChild = 20,
      childHeight = 20,
      childPadding = 10;
  var lastNodeId = 0;
  var lastVarId = 0;
  var uriToNode = {};
  var propertyGraph = {
    // DATA:
    nodes: [],
    edges: [],
    // Functions:
    addNode: addNode,
    addEdge: addEdge,
    getNodeByUri: getNodeByUri,
    toQuery: toQuery,
    // Defined elsewhere:
    describe: null,
    edit: null,
  }

  /** Datatypes **/
  function Node () {
    this.id = lastNodeId++;
    this.properties = [];
    this.lastPropDraw = 0;
    this.redraw = false;
    propertyGraph.nodes.push(this);
    this.variable = new Variable(this);
    this.values = new Values(this);
  }

  function Property (parentNode) {
    this.parentNode = parentNode;
    this.index = parentNode.properties.length;
    parentNode.properties.push(this);
    this.variable = new Variable(this);
    this.values = new Values(this);
  }

  function Edge (source, target) {
    this.source = source;
    this.target = target;
    propertyGraph.edges.push(this);
  }

  function Variable (parent) {
    this.id = lastVarId++;
    this.filters = [];
    this.show = true;
    this.count = false;
    this.alias = '';
    //this.parent = parent;
  }

  function Values (parent) {
    this.data = [];
    this.index = -1;
    //this.parent = parent;
  }

  /***** Variable.prototype *****/
  Variable.prototype.get = function () {
    return '?' + (this.alias ? this.alias : this.id);
  };

  /***** Values.prototype *****/
  Values.prototype.add = function (uri) {
    if (this.data.indexOf(uri) < 0) {
      this.data.push(uri);
      if (this.data.length == 1)
        this.index = 0;
    }
  };

  Values.prototype.delete = function (uri) {
    var i = this.data.indexOf(uri);
    if (i < 0) return false;
    this.data.splice(i, 1);
    if (this.data.length == 0) {
      this.index = -1;
    } else if (this.index == i){
      this.next();
    }
    return true;
  };

  Values.prototype.get = function () {
    if (this.index < 0) return null;
    return this.data[this.index];
  };

  Values.prototype.isEmpty = function () { return (this.index == -1); };
  Values.prototype.getAll = function () { return this.data; };
  Values.prototype.next = function () { this.index = (this.index+1)%this.data.length; };
  Values.prototype.prev = function () {
    this.index = (this.index == 0) ? this.data.length - 1 : this.index - 1;
  };

  /***** Node.prototype *****/
  Node.prototype.getWidth = function () { return nodeWidth; };
  Node.prototype.getBaseHeight = function () { return nodeBaseHeight; };
  Node.prototype.getHeight = function () {
    return nodeBaseHeight + this.lastPropDraw*(childHeight+childPadding);
  };

  Node.prototype.setPosition = function (x, y) {
    this.x = x;
    this.y = y;
    return this;
  };

  Node.prototype.addUri = function (uri) {
    this.values.add(uri);
    uriToNode[uri] = this;
  };

  Node.prototype.getUri = function () {
    return this.values.get();
  }

  Node.prototype.getUniq = function () {
    // This function returns an unique 'string' that defines the color of this node.
    return '1'; //TODO
  };

  Node.prototype.getVariable = function () {
    return this.variable.get();
  };

  Node.prototype.getLabel = function () {
    var uri = this.getUri();
    if (uri) {
      return req.getLabel(uri);
    } else {
      return this.variable.get();
    }
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

  Node.prototype.isVariable = function () {
    return this.values.isEmpty();
  };

  Node.prototype.nextValue = function () {
    this.values.next();
    return this;
  };

  Node.prototype.prevValue = function () {
    this.values.prev();
    return this;
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
    for (i = 0; i < propertyGraph.nodes.length; i++) {
      node = propertyGraph.nodes[i];
      if (node === this) 
        propertyGraph.nodes.splice(i, 1);
    }
  };

  Node.prototype.getResults = function (onStart, onEnd) {
    if (!this.isVariable()) return null;
    if (onStart) onStart();
    var self = this;
    var q  = 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n'
        q += 'SELECT DISTINCT ?uri ?label WHERE {\n'
        q += '  FILTER (lang(?label) = "en")\n';
        q += '  ?uri rdfs:label ?label .\n';
    var tmp;
    var vEdges = [];
    var vNodes = [];
    var queue  = [this];

    while (queue.length > 0) {
      var cur = queue.pop();
      vNodes.push(cur);
      var edges = propertyGraph.edges.filter(e => {
        return (e.source.parentNode == cur || e.target == cur);
      });
      edges.forEach(e => {
        if (vEdges.indexOf(e) < 0) {
          vEdges.push(e);
          tmp = [e.source.parentNode, e.source, e.target];
          for (i = 0; i < 3; i++) {
            if (tmp[i].isVariable()) {
              if (tmp[i] !== cur && vNodes.indexOf(tmp[i]) < 0) queue.push(tmp[i]);
              if (tmp[i] === self) tmp[i] = '?uri';
              else tmp[i] = tmp[i].getVariable();
            } else {
              //TODO: more than one value
              tmp[i] = u(tmp[i].getUri());
            }
          }
          q += '  ' + tmp.join(' ') + ' .\n';
        }
      });
    }
    q += '} limit 10';
    console.log(q);
    req.execQuery(q, data => {
      data.results.bindings.forEach(obj => {
        self.addUri(obj.uri.value);
      });
      if (onEnd) onEnd();
    });
  };

  /**************************/
  /*** Property.prototype ***/
  Property.prototype.getWidth = function () { return this.parentNode.getWidth() - diffParentChild; };
  Property.prototype.getHeight = function () { return childHeight };
  Property.prototype.getOffsetY = function () {
    return this.parentNode.getBaseHeight()/2 + this.index * (this.getHeight() + childPadding);
  };

  Object.defineProperty(Property.prototype, 'x', {
    get: function() {
      //return this.parentNode.x - (this.parentNode.getWidth()/2);
      return this.parentNode.x;
    }
  });

  Object.defineProperty(Property.prototype, 'y', {
    get: function() { return this.parentNode.y; }
  });

  Object.defineProperty(Property.prototype, 'id', {
    get: function() { return this.parentNode.id; }
  });

  Property.prototype.addUri = function (uri) {
    this.values.add(uri);
  };

  Property.prototype.getUri = function () {
   return this.values.get();
  }

  Property.prototype.getLabel = function () {
    var uri = this.getUri();
    if (uri) return req.getLabel(uri);
    else return this.variable.get();
  };

  Property.prototype.getVariable = function () {
    return this.variable.get();
  };

  Property.prototype.isVariable = function () {
    return this.values.isEmpty();
  };

  Property.prototype.getUniq = function () {
    return '2';
  };

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
  }

  /**************************/
  /**** from controllers ****/
  Node.prototype.describe = function () {
    if (propertyGraph.describe)
      propertyGraph.describe(this);
  };

  Property.prototype.describe = function () {
    if (propertyGraph.describe)
      propertyGraph.describe(this);
  };

  Node.prototype.edit = function () {
    if (propertyGraph.edit)
      propertyGraph.edit(this);
  };

  Property.prototype.edit = function () {
    if (propertyGraph.edit)
      propertyGraph.edit(this);
  };

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

  function toQuery () {
    var v = {}, i, m='', q = '';
    for (i = 0; i < propertyGraph.edges.length; i++) {
      edge = propertyGraph.edges[i];
      s = edge.source.parentNode.getUri();
      s = s ? u(s) : edge.source.parentNode.getVariable();
      p = edge.source.getUri();
      p = p ? u(p) : edge.source.getVariable();
      o = edge.target.getUri();
      o = o ? u(o) : edge.target.getVariable();
      if (s[0]=='?' || p[0] == '?' || o[0] == '?')
        m += s + ' ' + p + ' ' + o + '.\n'
      if (!edge.source.parentNode.getUri()) v[s] = 1;
      if (!edge.source.getUri()) v[p] = 1;
      if (!edge.target.getUri()) v[o] = 1;
    }
    for (i in v) {
      q += i;
    }
    return 'SELECT '+q+' WHERE {\n' +m +'} ';
  }

  function u (uri) {
    return '<'+uri+'>';
  }
  
  return propertyGraph;
}
