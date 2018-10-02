angular.module('rdfvis.directives').directive('visualQueryBuilder', visualQueryBuilder);

visualQueryBuilder.$inject = ['propertyGraphService'];

function visualQueryBuilder (pGraph) {
  var directive = {
    link: link,
    restrict: 'EA',
    scope: {
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

      thisGraph.state = {
        clickedProperty: false,
        selectedNode: null,
        selectedEdge: null,
        mouseDownNode: null,
        mouseDownLink: null,
        justDragged: false,
        justScaleTransGraph: false,
        lastKeyDown: -1,
        shiftNodeDrag: false,
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
          .classed(thisGraph.classes.graph, true);
      var svgG = thisGraph.svgG;

      // displayed when dragging between nodes
      thisGraph.dragLine = svgG.append('svg:path')
          .attr('class', 'link dragline hidden')
          .attr('d', 'M0,0L0,0')
          .style('marker-end', 'url(#mark-end-arrow)');

      // highlight
      var filter = defs.append('filter')
          .attr('id', 'highlight')
          .attr('x', '-20%').attr('y', '-40%')
          .attr('width', '140%').attr('height', '180%');
      filter.append('feGaussianBlur')
          .attr('in', 'SourceAlpha')
          .attr('stdDeviation', 3)
          .attr('result', 'blur');
      filter.append('feFlood')
          .attr('flood-color', "#51cbee")
          .attr('flood-opacity', 1)
          .attr('result', 'color');
      filter.append('feComposite')
          .attr('in', 'color')
          .attr('in2', 'blur')
          .attr('operator', 'in')
      var merge = filter.append('feMerge');
      merge.append('feMergeNode');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');

      // svg nodes and edges
      thisGraph.circles = svgG.append("g").classed(thisGraph.classes.allNodes, true).selectAll("g");
      thisGraph.paths   = svgG.append("g").classed(thisGraph.classes.allEdges, true).selectAll("g");

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
          .on("zoom", function () {
            if (d3.event.sourceEvent.shiftKey) {
              return false;
            } else {
              thisGraph.zoomed.call(thisGraph);
            }
            return true;
          })
          .on("zoomstart", function(){
            if (!d3.event.sourceEvent.shiftKey) d3.select('body').style("cursor", "move");
          })
          .on("zoomend", function(){
            d3.select('body').style("cursor", "auto");
          });

      svg.call(dragSvg).on("dblclick.zoom", null)
                       .on("wheel.zoom", null);

      // listen for resize
      window.onresize = function(){thisGraph.updateWindow(svg);};
      thisGraph.zoom = dragSvg;
    };

    /****** PROTOTYPE FUNCTIONS *******/
    GraphCreator.prototype.classes = {
      graph:      "graph",
      allNodes:   "nodes",
      allEdges:   "edges",
      selected:   "selected",
      connect:    "connect",
      node:       "node",
      mainRect:   "node-rect",
      mainTitle:  "node-text",
      properties: "properties",
      property:   "property",
      propRect:   "property-rect",
      propText:   "property-text",
      litRect:    "literal-rect",
      litText:    "literal-text",
      litLink:    "literal-path",
    };

    GraphCreator.prototype.keys =  {
      BACKSPACE_KEY: 8,
      DELETE_KEY: 46,
      ENTER_KEY: 13,
      nodeRadius: 20
    };

    GraphCreator.prototype.dragmove = function (d) { //META: d3.behavior.drag()
      var thisGraph = this;
      if (thisGraph.state.shiftNodeDrag){
        thisGraph.dragLine.attr(
            'd', 'M' + d.x + ',' + d.y + 'L' + d3.mouse(thisGraph.svgG.node())[0] +
            ',' + d3.mouse(this.svgG.node())[1]);
      } else {
        d.x += d3.event.dx;
        d.y += d3.event.dy;
        thisGraph.updateGraph();
      }
    };

    // remove edges associated with a node
    GraphCreator.prototype.spliceLinksForNode = function (node) { //META: svgkeydown
      var thisGraph = this,
          toSplice = thisGraph.edges.filter(function(l) {
              return (l.source === node || l.target === node);
      });
      toSplice.map(function(l) {
        thisGraph.edges.splice(thisGraph.edges.indexOf(l), 1);
      });
    };

    GraphCreator.prototype.replaceSelectEdge = function (d3Path, edgeData) { //META: pathmousedown
      var thisGraph = this;
      d3Path.classed(thisGraph.classes.selected, true);
      if (thisGraph.state.selectedEdge){
        thisGraph.removeSelectFromEdge();
      }
      thisGraph.state.selectedEdge = edgeData;
    };

    GraphCreator.prototype.replaceSelectNode = function (d3Node, nodeData) { //META: circlemouseup
      var thisGraph = this;
      d3Node.classed(this.classes.selected, true);
      if (thisGraph.state.selectedNode){
        thisGraph.removeSelectFromNode();
      }
      thisGraph.state.selectedNode = nodeData;
    };

    GraphCreator.prototype.removeSelectFromNode = function () { //META: replaceselecnode, pathmousedown, circlemouseup
      var thisGraph = this;
      thisGraph.circles.filter(function(cd){
        return cd.id === thisGraph.state.selectedNode.id;
      }).classed(thisGraph.classes.selected, false);
      thisGraph.state.selectedNode = null;
    };

    GraphCreator.prototype.removeSelectFromEdge = function () { //META: pathmousedown, circlemouseup, replaceselectededge
      var thisGraph = this;
      thisGraph.paths.filter(function(cd){
        return cd === thisGraph.state.selectedEdge;
      }).classed(thisGraph.classes.selected, false);
      thisGraph.state.selectedEdge = null;
    };

    GraphCreator.prototype.pathMouseDown = function (d3path, d) { //META: updategraph
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
    GraphCreator.prototype.circleMouseDown = function (d3node, d) { //META: updategraph
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
    GraphCreator.prototype.circleMouseUp = function (d3node, d) { //META: updategraph
      var thisGraph = this,
          state = thisGraph.state;
      // reset the states
      state.shiftNodeDrag = false;
      d3node.classed(thisGraph.classes.connect, false);
      
      var mouseDownNode = state.mouseDownNode;
      if (!mouseDownNode) return;
      
      thisGraph.dragLine.classed("hidden", true);
      
      if (mouseDownNode !== d){
        // we're in a different node: create new edge for mousedown edge and add to graph
        var e = pGraph.addEdge(mouseDownNode, d);
        e.source.onClick();
        thisGraph.updateGraph();
        /*else if (a) request.relations(a);
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
    GraphCreator.prototype.svgMouseDown = function () { //META: updategraph
      this.state.graphMouseDown = true;
    };

    // mouseup on main svg
    GraphCreator.prototype.svgMouseUp = function () { //META: updategraph
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
        d.setPosition(xycoords[0],xycoords[1]);
        d.onClick();

        thisGraph.updateGraph();
      } else if (state.shiftNodeDrag){
        // dragged from node
        state.shiftNodeDrag = false;
        thisGraph.dragLine.classed("hidden", true);
      }
      state.graphMouseDown = false;
    };

    // keydown on main svg
    GraphCreator.prototype.svgKeyDown = function () { //META: onkeydown
      if (!this.focused) return null;
      var thisGraph = this,
          state = thisGraph.state,
          keys = thisGraph.keys;
      // make sure repeated key presses don't register for each keydown
      if(state.lastKeyDown !== -1) return;

      state.lastKeyDown = d3.event.keyCode;
      var selectedNode = state.selectedNode,
          selectedEdge = state.selectedEdge;

      switch(d3.event.keyCode) {
      case keys.BACKSPACE_KEY:
      case keys.DELETE_KEY:
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

    GraphCreator.prototype.svgKeyUp = function () { //META: onkeyup
      this.state.lastKeyDown = -1;
    };

    GraphCreator.prototype.zoomed = function () { //META: d3.behavior.zoom()
      this.state.justScaleTransGraph = true;
      d3.select("." + this.classes.graph)
        .attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
    };

    GraphCreator.prototype.getZoom = function () { //META: menu()
      var t = this.zoom.translate();
      return [t[0], t[1], this.zoom.scale()];
    };

    GraphCreator.prototype.updateWindow = function (svg) { //META: window.onresize();
      var bodyEl = element[0].parentElement;
      var x = bodyEl.clientWidth;
      var y = bodyEl.clientHeight;
      svg.attr("width", x).attr("height", y);
    };

    GraphCreator.prototype.drawArrow = function (s, t) {
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

    GraphCreator.prototype.textEllipsis = function (text, width, myclass) {
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

    GraphCreator.prototype.updateGraph = function () {
      var thisGraph = this,
          classes = thisGraph.classes,
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
        .classed(classes.selected, function(d){ return d === state.selectedEdge; })
        .attr("d", function(d){ return thisGraph.drawArrow(d.source, d.target); });

      // add new paths
      thisGraph.paths.enter()
        .append("path")
        .style('marker-end','url(#end-arrow)')
        .style('marker-start', 'url(#start-circle)')
        .classed("link", true)
        .attr("d", function(d){ return thisGraph.drawArrow(d.source, d.target); })
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

      thisGraph.circles.selectAll("rect").filter("."+classes.mainRect)
          .style("filter", function (d) { return d.isSelected() ? 'url(#highlight)' : '';})
          .style("stroke", function (d) { return d.getColor(); })
          .attr("height", function (d) { return d.getHeight() });
      thisGraph.circles.selectAll("text").filter("."+classes.mainTitle)
          .style("fill", d => { return d.getRepr() == null ? 'red': 'black'; })
          .text( function (d) {
            var title = d.getRepr();
            if (!title) title = 'No values set!';
            return thisGraph.textEllipsis(title, d.getWidth(), classes.mainTitle);
          });

      // add new nodes
      var newGs= thisGraph.circles.enter().append("g");

      newGs.classed(classes.node, true)
        .attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")";})
        .on("mouseover", function(d){ if (state.shiftNodeDrag){ d3.select(this).classed(classes.connect, true); }})
        .on("mouseout",  function(d){ d3.select(this).classed(classes.connect, false); })
        .on("mousedown", function(d){ thisGraph.circleMouseDown.call(thisGraph, d3.select(this), d); })
        .on("mouseup",   function(d){ thisGraph.circleMouseUp.call(thisGraph, d3.select(this), d); })
        .on("click",     function(d){
            if (state.clickedProperty) state.clickedProperty = false;
            else d.onClick();
            thisGraph.updateGraph();
          })
        .on("dblclick",  function(d){ d.onDblClick(); })
        .on('contextmenu', function(d){
            var menuItems = {
              'Edit':     x => { d.edit(); },
              'Remove':   x => { d.delete(); thisGraph.updateGraph(); },
            };
            if (!d.isVariable() && d.hasUris()) {
              menuItems['Describe'] = function () { d.describe() };
              menuItems['Copy URI'] = function () { d.getUri().copyToClipboard() };
            }
            menu(menuItems);
        })
        .call(thisGraph.drag);

      newGs.append("rect")
          .classed(classes.mainRect, true)
          .attr("width", function (d) { return d.getWidth(); })
          .attr("x", function (d) { return -(d.getWidth()/2); })
          .attr("height", function (d) { return d.getHeight() })
          .attr("y", function (d) { return -(d.getBaseHeight()/2) })
          .attr("rx",borderRadius).attr("ry",borderRadius)
          .style("filter", function (d) { return d.isSelected() ? 'url(#highlight)' : '';})
          .style("stroke", function (d) { return d.getColor() });
      newGs.append("text")
          .classed(classes.mainTitle, true)
          .attr("x", 0).attr("y", 0)
          .text(function (d) {
            return thisGraph.textEllipsis(d.getRepr(), d.getWidth(), classes.mainTitle);
          });
      newGs.append("g").classed(classes.properties, true);

      // remove old nodes
      thisGraph.circles.exit().remove();

      // Properties
      thisGraph.circles.each(function (d, i) {
        var sel = d3.select(this).selectAll('.' + classes.properties);
        var props = sel.selectAll('g').data(d.properties, function (p) {return p.id;});
        //UPDATE
        props.selectAll('.' + classes.propRect)
            .style("filter", p => { return p.isSelected() ? 'url(#highlight)' : '';})
            .style("stroke", p => { return p.getColor(); })
            .attr("y",       p => { return + p.getOffsetY(); });

        props.selectAll('.' + classes.propText)
            .attr("y", p => { return (p.getOffsetY() + p.getHeight()/2); })
            .style("fill", p => { return p.getRepr() == null ? 'red': 'black'; })
            .text( p => { 
              var title = p.getRepr();
              if (!title) title = 'No values set!';
              return thisGraph.textEllipsis(title, p.getWidth(), classes.propText); });

        props.selectAll('.' + classes.litRect)
            .style("filter", p => { return p.literal.isSelected() ? 'url(#highlight)' : '';})
            .style("stroke", p => { return p.literal.getColor(); })
            .attr("y",       p => { return + p.literal.getOffsetY(); });

        props.selectAll('.' + classes.litText)
            .attr("x", p => { return 15; } )
            .attr("y", p => { return (p.literal.getOffsetY() + p.getHeight()/2); })
            .style("fill", p => { return p.literal.getRepr() == null ? 'red': 'black'; })
            .text( p => { 
              var title = p.literal.getRepr();
              if (!title) title = 'No values set!';
              return thisGraph.textEllipsis(title, p.literal.getWidth(), classes.litText); });

        props.selectAll('.' + classes.litLink)
            .attr("d", p => { return p.literal.getPath(); });

        /*props.selectAll('.aw-icon')
            .attr("y", p => { return p.getOffsetY()+ p.getHeight()/2; })
            .text(p => {return p.getLiteral().filters.length > 0 ? "\uf0b0" : "\uf06e"});*/

        //ENTER
        var newP = props.enter().append('g').classed(classes.property, true);

        newP.append("rect")
            .classed(classes.propRect, true)
            .attr("width",  p => { return p.getWidth(); })
            .attr("height", p => { return p.getHeight(); })
            .attr("x",      p => { return p.getX(); })
            .attr("y",      p => { return p.getY(); })
            .style("filter", p => { return p.isSelected() ? 'url(#highlight)' : ''; })
            .style("stroke", p => { return p.getColor(); })
            .on("click",    p => { state.clickedProperty = true; p.onClick(); })
            .on("dblclick", p => { p.onDblClick(); })
            .on("contextmenu", p => {
              var menuItems = {
                'Edit':     x => { p.edit(); },
                'Remove':   x => { p.delete(); thisGraph.updateGraph(); },
              };
              if (!p.isVariable() && p.hasUris()) {
                menuItems['Describe'] = function () { p.describe() };
                menuItems['Copy URI'] = function () { p.getUri().copyToClipboard(); };
              }
              menu(menuItems);
            });

        newP.append("text")
            .classed(classes.propText, true)
            .attr("y", p => { return (p.getOffsetY() + p.getHeight()/2); })
            .text( p => { return thisGraph.textEllipsis(p.getRepr(), p.getWidth(), classes.propText); });

        //Literal properties
        var newL = newP.filter(p=>{return p.isLiteral()});
        newL.append("rect")
            .classed(classes.litRect, true)
            .attr("width",  p => { return p.getWidth() - 30; })
            .attr("height", p => { return p.getHeight(); })
            .attr("x", p => { return 30 - p.getWidth()/2; })
            .attr("y", p => { return p.literal.getOffsetY(); })
            .style("filter", p => { return p.literal.isSelected() ? 'url(#highlight)' : ''; })
            .style("stroke", p => { return p.literal.getColor(); })
            // FIXME p.literal.onClick();
            .on("click", p => { state.clickedProperty = true; p.onClick();})
            .on("dblclick", p => { p.onDblClick(); })
            .on("contextmenu", p => {
              var menuItems = {
                'Edit':     x => { p.literal.edit(); },
                'Remove':   x => { p.delete(); thisGraph.updateGraph(); },
              };
              menu(menuItems);
            });

        newL.append("text")
            .classed(classes.litText, true)
            .attr("x", p => { return 15; } )
            .attr("y", p => { return (p.literal.getOffsetY() + p.getHeight()/2); })
            .text( p => { return thisGraph.textEllipsis(p.literal.getRepr(), p.literal.getWidth(), classes.litText); });

        newL.append("path")
            .classed(classes.litLink, true)
            .style('marker-end', 'url(#end-arrow)')
            .attr("d", p => { return p.literal.getPath(); });

        /*newL.append("text")
            .classed('aw-icon', true)
            .attr("x", p => { return (p.getWidth() - p.getHeight())/2; })
            .attr("y", p => { return p.getOffsetY()+ p.getHeight()/2; })
            .text(p => {return p.getLiteral().filters.length > 0 ? "\uf0b0" : "\uf06e"});*/

        props.exit().remove();

      });
    };

    /* Custom context menu FIXME: add this into graphcreator and create two separated menues. */
    function contextMenu() {
      var height, width, margin = 0.1, // fraction of width
          items = [], rescale = false;

      function menu(f) {
        var z = graph.getZoom();
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
            //.append('g').attr('class', 'menu-entry')
            .append('g').classed('menu-entry', true)
            .classed('disabled', function (d) {return !f[d];})
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

    
    /** MAIN SVG **/
    var svg = d3.select(element[0]).append("svg")
          .attr("id", "d3vqb")
          .attr("width", element[0].offsetWidth)
          .attr("height", element[0].offsetHeight);

    var graph = new GraphCreator(svg, pGraph.nodes, pGraph.edges);
    var menu = contextMenu().items('Describe', 'Edit', 'Copy URI', 'Remove');
    graph.updateGraph();
    
    pGraph.connect(element[0], graph);

  }
}
