angular.module('rdfvis.services').factory('propertyGraphService', propertyGraphService);
propertyGraphService.$inject = ['requestService'];

function propertyGraphService (req) {
  var nodeWidth = 220,
      nodeBaseHeight = 30,
      diffParentChild = 20,
      childHeight = 20,
      childPadding = 10;
  var lastNodeId = 0;
  var propertyGraph = {
    nodes: [],
    edges: [],
    onClick: null,
  }

  function Node () {
    this.id = lastNodeId++;
    this.properties = [];
    propertyGraph.nodes.push(this);
    // last draw prop
    this.lastPropDraw = 0;
  }
  
  function Property (parentNode) {
    this.parentNode = parentNode;
    this.index = parentNode.properties.length;
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

  Node.prototype.getUniq = function () {
    // This function returns an unique 'string' that defines the color of this node.
    return '1'; //TODO
  };

  Node.prototype.getLabel = function () {
    return this.uri ? req.getLabel(this.uri) : '?' + this.id;
  };

  Node.prototype.newProp = function () {
    return new Property(this);
  };

  Node.prototype.delete = function () {
    var i, j, edge, prop;
    for (i = propertyGraph.edges.length - 1; i >= 0; i--) {
      edge = propertyGraph.edges[i];
      if (edge.target === this) 
        propertyGraph.edges.splice(i, 1);
    }
    for (j = 0; j < this.properties.length; j++) {
      prop = this.properties[j];
      for (i = propertyGraph.edges.length - 1; i >= 0; i--) {
        edge = propertyGraph.edges[i];
        if (edge.source === prop) 
          propertyGraph.edges.splice(i, 1);
      }
    }
    for (i = 0; i < propertyGraph.nodes.length; i++) {
      node = propertyGraph.nodes[i];
      if (node === this) 
        propertyGraph.nodes.splice(i, 1);
    }
  };

  Node.prototype.onClick = function () {
    if (propertyGraph.onClick)
      propertyGraph.onClick(this);
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

  Property.prototype.getLabel = function () {
    //return (this.name || 'PropLabel') + this.parentNode.id + this.index;
    return this.uri ? req.getLabel(this.uri) : '?' + this.parentNode.id + this.index;
  };

  Property.prototype.getUniq = function () {
    return '2';
  };

  Property.prototype.onClick = function () {
    if (propertyGraph.onClick)
      propertyGraph.onClick(this);
  };
  /**************************/
  /* Public stuff */
  propertyGraph.addNode = function () { return new Node(); };
  propertyGraph.addEdge = function (source, target) {
    /* FIXME: duplicate edges */
    if (source instanceof Property) 
      return new Edge(source, target);
    if (source instanceof Node) {
      return new Edge(source.newProp(), target);
    }
  };

  function u (l) {return ' <'+l.uri+'>';}

  propertyGraph.toQuery = function () {
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
  };
  

  return propertyGraph;
}
