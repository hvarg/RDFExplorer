angular.module('rdfvis.services').factory('propertyGraphService', propertyGraphService);
//propertyGraphService.$inject = [];

function propertyGraphService () {
  var nodeWidth = 220,
      nodeBaseHeight = 30,
      diffParentChild = 20,
      childHeight = 20,
      childPadding = 10;
  var lastNodeId = 0;
  var propertyGraph = {
    nodes: [],
    edges: []
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
    return 'ThisLabel'+this.id;
  };

  Node.prototype.newProp = function () {
    return new Property(this);
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
    return 'PropLabel' + this.index;
  };

  Property.prototype.getUniq = function () {
    return '2';
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

  return propertyGraph;
}
