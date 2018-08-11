angular.module('rdfvis.directives').directive('visualQueryBuilder', visualQueryBuilder);

visualQueryBuilder.$inject = ['propertyGraphService'];

function visualQueryBuilder (pGraph) {
  var directive = {
    link: link,
    restrict: 'EA',
    scope: {
      update: '=',
      getZoom: '=',
    },
  };
  return directive;

  function link (scope, element, attrs) {
    var borderRadius = 6;
    /***** DEFINE GRAPHCREATOR OBJECT *****/
    var GraphCreator = function(svg, nodes, edges) {
      var thisGraph = this;

      thisGraph.nodes = nodes || [];
      thisGraph.edges = edges || [];
      thisGraph.focused = true;
      thisGraph.colors = d3.scale.category10();

      thisGraph.state = {
        selectedNode: null,
        selectedEdge: null,
        mouseDownNode: null,
        mouseDownLink: null,
        justDragged: false,
        justScaleTransGraph: false,
        lastKeyDown: -1,
        shiftNodeDrag: false,
        selectedText: null
      };

      // define arrow markers for graph links
      var defs = svg.append('svg:defs');
      defs.append('svg:marker')
          .attr('id', 'end-arrow')
          .attr('viewBox', '0 -5 10 10')
          .attr('refX', 7)
          .attr('markerWidth', 3.5)
          .attr('markerHeight', 3.5)
          .attr('orient', 'auto')
          .append('svg:path')
          .attr('d', 'M0,-5L10,0L0,5');

      // define arrow markers for leading arrow
      defs.append('svg:marker')
          .attr('id', 'mark-end-arrow')
          .attr('viewBox', '0 -5 10 10')
          .attr('refX', 7)
          .attr('markerWidth', 3.5)
          .attr('markerHeight', 3.5)
          .attr('orient', 'auto')
          .append('svg:path')
          .attr('d', 'M0,-5L10,0L0,5');

      // circle at the start
      defs.append('svg:marker')
          .attr('id', 'start-circle')
          .attr('viewBox', '0 -5 12 12')
          .attr('refX', 2)
          .attr('refY', 2)
          .attr('markerWidth', 3)
          .attr('markerHeight', 3)
          .append('svg:circle')
          .attr('r',"2")
          .attr('cx',"2")
          .attr('cy',"2")

      thisGraph.svg = svg;
      thisGraph.svgG = svg.append("g")
          .classed(thisGraph.consts.graphClass, true);
      var svgG = thisGraph.svgG;

        // displayed when dragging between nodes
      thisGraph.dragLine = svgG.append('svg:path')
          .attr('class', 'link dragline hidden')
          .attr('d', 'M0,0L0,0')
          .style('marker-end', 'url(#mark-end-arrow)');

      // svg nodes and edges
      thisGraph.circles = svgG.append("g").selectAll("g");
      thisGraph.paths = svgG.append("g").selectAll("g");

      thisGraph.drag = d3.behavior.drag()
          .origin(function(d){ return {x: d.x, y: d.y}; })
          .on("drag", function(args){
            thisGraph.state.justDragged = true;
            thisGraph.dragmove.call(thisGraph, args);
          })
          .on("dragend", function() {
            // todo check if edge-mode is selected
          });

      // listen for key events TODO FIXME
      d3.select(element[0])
          .on("keydown", function(){ thisGraph.svgKeyDown.call(thisGraph); })
          .on("keyup", function(){ thisGraph.svgKeyUp.call(thisGraph); });
      svg.on("mousedown", function (d) {thisGraph.svgMouseDown.call(thisGraph, d);});
      svg.on("mouseup",   function (d) {thisGraph.svgMouseUp.call(thisGraph, d);});
      svg.on("mouseover", function (d) {thisGraph.focused = true;});
      svg.on("mouseout",  function (d) {thisGraph.focused = false;});
      svg.on("contextmenu", function () {
        //Do no show context menu, the default menu can break the tools ouside the svg.
        d3.event.preventDefault();
      });

      // listen for dragging
      var dragSvg = d3.behavior.zoom()
          .on("zoom", function(){
            if (d3.event.sourceEvent.shiftKey){
              // TODO  the internal d3 state is still changing
              return false;
            } else {
              thisGraph.zoomed.call(thisGraph);
            }
            return true;
          })
          .on("zoomstart", function(){
            var ael = d3.select("#" + thisGraph.consts.activeEditId).node();
            if (ael){
              ael.blur();
            }
            if (!d3.event.sourceEvent.shiftKey) d3.select('body').style("cursor", "move");
          })
          .on("zoomend", function(){
            d3.select('body').style("cursor", "auto");
          });

      svg.call(dragSvg).on("dblclick.zoom", null);

      // listen for resize
      window.onresize = function(){thisGraph.updateWindow(svg);};
      thisGraph.zoom = dragSvg;
    };
    /**********************************/

    /****** PROTOTYPE FUNCTIONS *******/
    GraphCreator.prototype.consts =  {
      selectedClass: "selected",
      connectClass: "connect-node",
      circleGClass: "conceptG",
      mainRectClass: "mainRect",
      mainTitleClass: "mainTitle",
      innerRectClass: "innerRect",
      innerTextClass: "innerText",
      graphClass: "graph",
      activeEditId: "active-editing",
      BACKSPACE_KEY: 8,
      DELETE_KEY: 46,
      ENTER_KEY: 13,
      nodeRadius: 20
    };

    GraphCreator.prototype.dragmove = function(d) {
      var thisGraph = this;
      if (thisGraph.state.shiftNodeDrag){
        thisGraph.dragLine.attr(
            'd', 'M' + d.x + ',' + d.y + 'L' + d3.mouse(thisGraph.svgG.node())[0] +
            ',' + d3.mouse(this.svgG.node())[1]);
      } else {
        d.x += d3.event.dx;
        d.y +=  d3.event.dy;
        thisGraph.updateGraph();
      }
    };

      // remove edges associated with a node
    GraphCreator.prototype.spliceLinksForNode = function(node) {
      var thisGraph = this,
          toSplice = thisGraph.edges.filter(function(l) {
              return (l.source === node || l.target === node);
      });
      toSplice.map(function(l) {
        thisGraph.edges.splice(thisGraph.edges.indexOf(l), 1);
      });
    };

    GraphCreator.prototype.replaceSelectEdge = function(d3Path, edgeData){
      var thisGraph = this;
      d3Path.classed(thisGraph.consts.selectedClass, true);
      if (thisGraph.state.selectedEdge){
        thisGraph.removeSelectFromEdge();
      }
      thisGraph.state.selectedEdge = edgeData;
    };

    GraphCreator.prototype.replaceSelectNode = function(d3Node, nodeData){
      var thisGraph = this;
      d3Node.classed(this.consts.selectedClass, true);
      if (thisGraph.state.selectedNode){
        thisGraph.removeSelectFromNode();
      }
      thisGraph.state.selectedNode = nodeData;
    };

    GraphCreator.prototype.removeSelectFromNode = function(){
      var thisGraph = this;
      thisGraph.circles.filter(function(cd){
        return cd.id === thisGraph.state.selectedNode.id;
      }).classed(thisGraph.consts.selectedClass, false);
      thisGraph.state.selectedNode = null;
    };

    GraphCreator.prototype.removeSelectFromEdge = function(){
      var thisGraph = this;
      thisGraph.paths.filter(function(cd){
        return cd === thisGraph.state.selectedEdge;
      }).classed(thisGraph.consts.selectedClass, false);
      thisGraph.state.selectedEdge = null;
    };

    GraphCreator.prototype.pathMouseDown = function(d3path, d){
      var thisGraph = this,
          state = thisGraph.state;
      d3.event.stopPropagation();
      state.mouseDownLink = d;
      
      if (state.selectedNode){
        thisGraph.removeSelectFromNode();
      }
      
      var prevEdge = state.selectedEdge;
      if (!prevEdge || prevEdge !== d){
        thisGraph.replaceSelectEdge(d3path, d);
      } else {
        thisGraph.removeSelectFromEdge();
      }
    };

    // mousedown on node
    GraphCreator.prototype.circleMouseDown = function(d3node, d){
      var thisGraph = this,
          state = thisGraph.state;
      d3.event.stopPropagation();
      state.mouseDownNode = d;
      if (d3.event.shiftKey){
        state.shiftNodeDrag = d3.event.shiftKey;
        // reposition dragged directed edge
        thisGraph.dragLine.classed('hidden', false)
          .attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
        return;
      }
    };

    // mouseup on nodes
    GraphCreator.prototype.circleMouseUp = function(d3node, d){
      var thisGraph = this,
          state = thisGraph.state,
          consts = thisGraph.consts;
      // reset the states
      state.shiftNodeDrag = false;
      d3node.classed(consts.connectClass, false);
      
      var mouseDownNode = state.mouseDownNode;
      if (!mouseDownNode) return;
      
      thisGraph.dragLine.classed("hidden", true);
      
      if (mouseDownNode !== d){
        // we're in a different node: create new edge for mousedown edge and add to graph
        pGraph.addEdge(mouseDownNode, d);
        /*
        var relation = query.addResource(),
            newEdge = query.addTriple(mouseDownNode, relation, d);
        relation.x = (mouseDownNode.x + d.x) / 2;
        relation.y = (mouseDownNode.y + d.y) / 2;
        relation.rad = 0;
        *TODO first rotation its not working.
        if (mouseDownNode.y > d.y)
          relation.rad = 45 - Math.atan((d.x - mouseDownNode.x)/(d.y - mouseDownNode.y)) * (180/Math.PI);
        else
          relation.rad = 225 + Math.atan((d.x - mouseDownNode.x)/(mouseDownNode.y - d.y)) * (180/Math.PI);
        */
        thisGraph.updateGraph();
        /*
        var a = String( mouseDownNode.getUri() ),
            b = String( d.getUri() );
        if (a && b) request.findRelation(a, b, function (data) {
          if (data.length == 0) {
            relation.fault = true;
            thisGraph.updateGraph();
          }
        });
        else if (a) request.relations(a);
        else if (b) request.inverseRelations(b);*/
      } else {
        // we're in the same node
        if (state.justDragged) {
          // dragged, not clicked
          state.justDragged = false;
        } else{
          // clicked, not dragged
          if (d3.event.shiftKey){
            /* shift-clicked node: do something TODO */
          } else {
            if (state.selectedEdge){
              thisGraph.removeSelectFromEdge();
            }
            var prevNode = state.selectedNode;
            
            if (!prevNode || prevNode.id !== d.id){
              thisGraph.replaceSelectNode(d3node, d);
            } else{
              thisGraph.removeSelectFromNode();
            }
          }
        }
      }
      state.mouseDownNode = null;
      return;
    };

    // mousedown on main svg
    GraphCreator.prototype.svgMouseDown = function(){
      this.state.graphMouseDown = true;
    };

    // mouseup on main svg
    GraphCreator.prototype.svgMouseUp = function(){
      var thisGraph = this,
          state = thisGraph.state;
      if (state.justScaleTransGraph) {
        // dragged not clicked
        state.justScaleTransGraph = false;
      } else if (state.graphMouseDown && d3.event.shiftKey){
        // clicked not dragged from svg
        /* Here we create a new variable */
        var xycoords = d3.mouse(thisGraph.svgG.node()),
            d = pGraph.addNode();
        d.x = xycoords[0];
        d.y = xycoords[1];

        thisGraph.updateGraph();
      } else if (state.shiftNodeDrag){
        // dragged from node
        state.shiftNodeDrag = false;
        thisGraph.dragLine.classed("hidden", true);
      }
      state.graphMouseDown = false;
    };

    // keydown on main svg
    GraphCreator.prototype.svgKeyDown = function() {
      if (!this.focused) return null;
      var thisGraph = this,
          state = thisGraph.state,
          consts = thisGraph.consts;
      // make sure repeated key presses don't register for each keydown
      if(state.lastKeyDown !== -1) return;

      state.lastKeyDown = d3.event.keyCode;
      var selectedNode = state.selectedNode,
          selectedEdge = state.selectedEdge;

      switch(d3.event.keyCode) {
      case consts.BACKSPACE_KEY:
      case consts.DELETE_KEY:
        d3.event.preventDefault();
        if (selectedNode){
          thisGraph.nodes.splice(thisGraph.nodes.indexOf(selectedNode), 1);
          thisGraph.spliceLinksForNode(selectedNode);
          state.selectedNode = null;
          thisGraph.updateGraph();
        } else if (selectedEdge){
          thisGraph.edges.splice(thisGraph.edges.indexOf(selectedEdge), 1);
          state.selectedEdge = null;
          thisGraph.updateGraph();
        }
        break;
      }
    };

    GraphCreator.prototype.svgKeyUp = function() {
      this.state.lastKeyDown = -1;
    };

    GraphCreator.prototype.zoomed = function(){
      this.state.justScaleTransGraph = true;
      d3.select("." + this.consts.graphClass)
        .attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
    };

    GraphCreator.prototype.updateWindow = function(svg){
      var bodyEl = element[0].parentElement;
      var x = bodyEl.clientWidth;
      var y = bodyEl.clientHeight;
      svg.attr("width", x).attr("height", y);
    };

    GraphCreator.prototype.updateGraph = function() {
      var thisGraph = this,
          consts = thisGraph.consts,
          state = thisGraph.state;
      // Select all paths and 'circles' (they are rects..)
      thisGraph.paths = thisGraph.paths.data(thisGraph.edges, function(d){
        return String(d.source.id) + "+" + String(d.target.id);
      });
      thisGraph.circles = thisGraph.circles.data(thisGraph.nodes, function(d){ return d.id;});

      // update existing paths
      thisGraph.paths
        .style('marker-end', 'url(#end-arrow)')
        .style('marker-start', 'url(#start-circle)')
        .classed(consts.selectedClass, function(d){ return d === state.selectedEdge; })
        .attr("d", function(d){ return smartArrow(d.source, d.target); });

      // add new paths
      thisGraph.paths.enter()
        .append("path")
        .style('marker-end','url(#end-arrow)')
        .style('marker-start', 'url(#start-circle)')
        .classed("link", true)
        .attr("d", function(d){ return smartArrow(d.source, d.target); })
        .on("mousedown", function(d){
          thisGraph.pathMouseDown.call(thisGraph, d3.select(this), d);
        })
        .on("mouseup", function(d){ state.mouseDownLink = null; });

      // remove old links
      thisGraph.paths.exit().remove();

      // update existing nodes
      thisGraph.circles.attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
      });
      thisGraph.circles.each(function (d,i) { //FIXME this is not the best way to do this.
        var thisProp, thisSelection, i;
        /* Remove properties */
        if (d.redraw) {
          d3.select(this).selectAll("."+consts.innerTextClass).remove();
          d3.select(this).selectAll("."+consts.innerRectClass).remove();
          d.redraw = false;
          d.lastPropDraw = 0;
        }
        /* Update already drawn properties */
        for (i = 0; i < d.lastPropDraw; i++) {
          thisProp = d.properties[i];
          d3.select(this).filter("."+consts.innerTextClass)
              .text( getChunkText(thisProp.getLabel(), thisProp.getWidth(), consts.innerTextClass) );
        }
        /* Create new properties for existing nodes */
        for (;d.lastPropDraw<d.properties.length; d.lastPropDraw++) {
          thisProp = d.properties[d.lastPropDraw];
          thisSelection = d3.select(this);
          thisSelection.append("rect")
              .classed(consts.innerRectClass, true)
              .attr("width", thisProp.getWidth())
              .attr("height", thisProp.getHeight())
              .attr("x", -thisProp.getWidth()/2)
              .attr("y", thisProp.getOffsetY())
              .style("stroke", thisGraph.colors(thisProp.getUniq()))
              .on("contextmenu", d => {
                menu({ 'Remove': function () { thisProp.delete(); thisGraph.updateGraph(); }});
              });
          thisSelection.append("text")
              .classed(consts.innerTextClass, true)
              .attr("x", 0).attr("y", thisProp.getOffsetY()+ thisProp.getHeight()/2)
              .text( getChunkText(thisProp.getLabel(), thisProp.getWidth(), consts.innerTextClass) );
        }
      });
      /* update the main rect */
      thisGraph.circles.selectAll("rect").filter("."+consts.mainRectClass)
          .style("stroke", function (d) { return thisGraph.colors(d.getUniq()); })
          .attr("height", function (d) { return d.getHeight() });
      thisGraph.circles.selectAll("text").filter("."+consts.mainTitleClass)
          .text( function (d) { return getChunkText(d.getLabel(), d.getWidth(), consts.mainTitleClass); });

      // add new nodes
      var newGs= thisGraph.circles.enter().append("g");

      newGs.classed(consts.circleGClass, true)
        .attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")";})
        .on("mouseover", function(d){ if (state.shiftNodeDrag){ d3.select(this).classed(consts.connectClass, true); }})
        .on("mouseout",  function(d){ d3.select(this).classed(consts.connectClass, false); })
        .on("mousedown", function(d){ thisGraph.circleMouseDown.call(thisGraph, d3.select(this), d); })
        .on("mouseup",   function(d){ thisGraph.circleMouseUp.call(thisGraph, d3.select(this), d); })
        .on("click",     function(d){ /* Do something TODO*/ })
        .on("dblclick",  function(d){ d.describe(); })
        .on('contextmenu', function(d){
            menu({
              'Describe': function () { d.describe(); },
              'Edit':     function () { d.edit(); },
              'Remove':   function () { d.delete(); thisGraph.updateGraph(); }
            });
        })
        .call(thisGraph.drag);

      newGs.append("rect")
          .classed(consts.mainRectClass, true)
          .attr("width", function (d) { return d.getWidth(); })
          .attr("x", function (d) { return -(d.getWidth()/2); })
          .attr("height", function (d) { return d.getHeight() })
          .attr("y", function (d) { return -(d.getBaseHeight()/2) })
          .attr("rx",borderRadius).attr("ry",borderRadius)
          .style("stroke", function (d) {return thisGraph.colors(d.getUniq())});
      newGs.append("text")
          .classed(consts.mainTitleClass, true)
          .attr("x", 0).attr("y", 0)
          .text(function (d) {
            return getChunkText(d.getLabel(), d.getWidth(), consts.mainTitleClass);
          });

      // remove old nodes
      thisGraph.circles.exit().remove();
    };

    /** MAIN SVG **/
    var svg = d3.select(element[0]).append("svg")
          .attr("id", "d3vqb")
          .attr("width", element[0].offsetWidth)
          .attr("height", element[0].offsetHeight);

    var graph = new GraphCreator(svg, pGraph.nodes, pGraph.edges);
    var menu = contextMenu().items('Describe', 'Edit', '...', 'Remove');
    graph.updateGraph();
    
    scope.update = function () {
      graph.updateGraph();
    };

    scope.getZoom = function () {
      var t = graph.zoom.translate();
      return [t[0], t[1], graph.zoom.scale()];
    };

/*************/
    function getChunkText (text, width, myclass) {
      var textWidth = 0, tmp;
      /* temporal text svg */
      tmp = svg.append("text");
      tmp.classed(myclass, true)
         .attr("x", 0).attr("y", 0)
         .text(text);
      textWidth = tmp.node().getComputedTextLength();
      tmp.remove();
      /* remove tail and add dots */
      if (textWidth > width)
        text = text.substring(0, Math.floor((width/textWidth)*text.length)-3) + "...";
      return text;
    }

    function smartArrow (s, t) {
      // init arrow on source
      var sx = s.x,
          sy = s.y + s.getOffsetY() + s.getHeight()/2,
          sw = s.getWidth()/2;
      if (sx + sw < t.x)  sx += sw;
      else                sx -= sw;
      // end arrow on target
      var tx = t.x;
      if (t.x > s.x) tx -= (t.getWidth()/2 +5);
      else tx += (t.getWidth()/2 +5);
      return "M" + sx + "," + sy + "L" + tx + "," + t.y;
    }
/*************/

function contextMenu() {
    var height, width, margin = 0.1, // fraction of width
        items = [], rescale = false;

    function menu(f) {
        var z = scope.getZoom();
        var xycoords = d3.mouse(graph.svgG.node());
        //console.log(z, xycoords); TODO: zoom z[2]
        var x = (xycoords[0] + z[0]);
        var y = (xycoords[1] + z[1]);
        d3.event.preventDefault();
        d3.event.stopPropagation();

        d3.select('.context-menu').remove();
        scaleItems();

        // Draw the menu
        d3.select('svg')
            .append('g').attr('class', 'context-menu')
            .selectAll('tmp')
            .data(items).enter()
            .append('g').attr('class', 'menu-entry')
            .on('click', function (d) { if (f[d]) f[d](); });

        d3.selectAll('.menu-entry')
            .append('rect').attr('class', 'menu-entry-rect')
            .attr('x', x)
            .attr('y', function(d, i){ return y + (i * height); })
            .attr('width', width)
            .attr('height', height);

        d3.selectAll('.menu-entry')
            .append('text').attr('class', 'menu-entry-text')
            .text(function(d){ return d; })
            .attr('x', x)
            .attr('y', function(d, i){ return y + (i * height); })
            .attr('dy', height - margin / 2)
            .attr('dx', margin);

        // Other interactions
        d3.select('body')
            .on('click', function() { d3.select('.context-menu').remove(); });
    }

    menu.items = function(e) { //insert items to the menu.
        if (!arguments.length) return items;
        for (i in arguments) items.push(arguments[i]);
        rescale = true;
        return menu;
    }

    // Automatically set width, height, and margin;
    function scaleItems() {
        if (rescale) {
            d3.select('svg').selectAll('tmp')
                .data(items).enter()
                .append('text').attr('class', 'menu-entry-text')
                .text(function(d){ return d; })
                .attr('x', -1000)
                .attr('y', -1000)
                .attr('class', 'tmp');
            var z = d3.selectAll('.tmp')[0]
                      .map(function(x){ return x.getBBox(); });
            width = d3.max(z.map(function(x){ return x.width; }));
            margin = margin * width;
            width =  width + 2 * margin;
            height = d3.max(z.map(function(x){ return x.height + margin / 2; }));

            // cleanup
            d3.selectAll('.tmp').remove();
            rescale = false;
        }
    }

    return menu;
}
/*************/
  }
}
