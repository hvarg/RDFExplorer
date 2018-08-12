angular.module('rdfvis.services').factory('propertyGraphService', propertyGraphService);
propertyGraphService.$inject = ['requestService'];

function propertyGraphService (req) {
  var nodeWidth = 220,
      nodeBaseHeight = 30,
      diffParentChild = 20,
      childHeight = 20,
      childPadding = 10;
  var lastNodeId = 0;
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
    this.uris = [];
    this.uriIndex = -1;
    this.lastPropDraw = 0;
    this.redraw = false;
    propertyGraph.nodes.push(this);
  }
  
  function Property (parentNode) {
    this.parentNode = parentNode;
    this.index = parentNode.properties.length;
    this.uris = [];
    this.uriIndex = -1;
    parentNode.properties.push(this);
  }

  function Edge (source, target) {
    this.source = source;
    this.target = target;
    propertyGraph.edges.push(this);
  }

  /***** Node.prototype *****/
  Node.prototype.getWidth = function () { return nodeWidth; };
  Node.prototype.getBaseHeight = function () { return nodeBaseHeight; };
  Node.prototype.getHeight = function () {
    return nodeBaseHeight + this.lastPropDraw*(childHeight+childPadding);
  };

  Node.prototype.setPosition = function (x , y) {
    this.x = x;
    this.y = y;
    return this;
  };

  Node.prototype.addUri = function (uri) {
    //TODO: check if already exists and stuff
    this.uris.push( uri );
    if (this.uris.length == 1) {
      this.uriIndex = 0; 
    }
    uriToNode[uri] = this;
  };

  Node.prototype.getUri = function () {
    if (this.uriIndex >= 0) {
      return this.uris[this.uriIndex];
    } else {
      return null;
    }
  }

  Node.prototype.getUniq = function () {
    // This function returns an unique 'string' that defines the color of this node.
    return '1'; //TODO
  };

  Node.prototype.getLabel = function () {
    if (this.uriIndex >= 0) {
      return req.getLabel(this.getUri());
    } else {
      //TODO: check alias and stuff
      return '?' + this.id;
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
    return (this.uriIndex < 0);
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
    //TODO: check if already exists and stuff
    this.uris.push( uri );
    if (this.uris.length == 1) {
      this.uriIndex = 0; 
    }
  };

  Property.prototype.getUri = function () {
    if (this.uriIndex >= 0) {
      return this.uris[this.uriIndex];
    } else {
      return null;
    }
  }

  Property.prototype.getLabel = function () {
    if (this.uriIndex >= 0) {
      return req.getLabel(this.getUri());
    } else {
      //TODO: check alias and stuff
      return '?' + this.parentNode.id + this.index;
    }
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
      s = edge.source.parentNode.uri ? u(edge.source.parentNode) : ' ?'+ edge.source.parentNode.id;
      p = edge.source.uri ? u(edge.source) : ' ?'+ edge.source.parentNode.id + edge.source.index;
      o = edge.target.uri ? u(edge.target) : ' ?'+ edge.target.id;
      if (s[1]=='?' || p[1] == '?' || o[1] == '?')
        m += s + p + o + '\n'
      if (!edge.source.parentNode.uri) v[s] = 1;
      if (!edge.source.uri) v[p] = 1;
      if (!edge.target.uri) v[o] = 1;
    }
    for (i in v) {
      q += i;
    }
    return 'SELECT'+q+' WHERE {\n' +m +'} ';
  }

  function u (l) {
    return ' <'+l.uri+'>';
  }
  
  return propertyGraph;
}
