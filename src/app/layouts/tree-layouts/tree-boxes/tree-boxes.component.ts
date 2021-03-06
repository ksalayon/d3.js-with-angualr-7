//SOURCE: https://github.com/swayvil/d3js-tree-boxes/blob/master/src/scripts/tree-boxes.js

import { Component, OnInit, Input, HostListener } from '@angular/core';
import * as d3 from 'd3';
import * as $ from 'jquery';
import {FunctionalityService} from 'src/app/services/functionality.service';
import {DataLoaderService} from 'src/app/services/data-loader.service'

@Component({
  selector: 'app-tree-boxes',
  templateUrl: './tree-boxes.component.html',
  styleUrls: ['./tree-boxes.component.css']
})
export class TreeBoxesComponent implements OnInit {
  @Input('data') data;
   d3: d3.TreeLayout<any>;
  root: any;
  
constructor(private functionalityService: FunctionalityService, private dataLoaderService: DataLoaderService) {
  
}
  ngOnInit() {
 
    let TreeLayout: d3.TreeLayout<any>;
	
	let margin = {
					top : 0,
					right : 0,
					bottom : 100,
					left : 0
  }

  // Height and width are redefined later in function of the size of the tree
		// (after that the data are loaded)
    let root;
    let treeData;
    let width = window.innerWidth - margin.right - margin.left;
    let height = window.innerHeight - margin.top - margin.bottom;
    
    let rectNode = { width : 120, height : 45, textMargin : 5 };
		let tooltip = { width : 150, height : 40, textMargin : 5 };
	  let  i = 0;
		let duration = 750;
    
    let mousedown; // Use to save temporarily 'mousedown.zoom' value
    let mouseWheel;
    let mouseWheelName;
    let isKeydownZoom = false;

    let  baseSvg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
		let svgGroup: any;
		let nodeGroup: any; // If nodes are not grouped together, after a click the svg node will be set after his corresponding tooltip and will hide it
		let nodeGroupTooltip: any
		let linkGroup:any;
    let linkGroupToolTip: any;
    let defs: any;
    
    let drawTree = (data) => {
      let rootNode = this.dataLoaderService.findRoot(this.data.nodes, this.data.links)
      this.root = d3.hierarchy(rootNode);
      TreeLayout = d3.tree().size([height, width]); 

      // Dynamically set the height of the main svg container
      // breadthFirstTraversal returns the max number of node on a same level
      // and colors the nodes
      var maxDepth = 0;
        
      var maxTreeWidth = breadthFirstTraversal(TreeLayout(this.root).descendants(), function(currentLevel) {
        maxDepth++;});
        height = maxTreeWidth * (rectNode.height + 20) + tooltip.height + 20 - margin.right - margin.left;
        width = maxDepth * (rectNode.width * 1.5) + tooltip.width / 2 - margin.top - margin.bottom;
        
      TreeLayout = d3.tree().size([height, width]); 
      treeData = TreeLayout(this.root);
      this.root['x0'] = height / 2;
      this.root['y0'] = 0; 

     
     baseSvg = <any>d3.select('#container').append('svg')
      .attr('width', width + margin.right + margin.left)
      .attr('height', height + margin.top + margin.bottom)
      .attr('style', "display: block")
      .attr('style', "margin: auto")
      .append("g");

     baseSvg.call(<any>d3.zoom()
        .on("zoom",this.functionalityService.zoomed))
      
      svgGroup = baseSvg.append('g')
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
          
  
      // SVG elements under nodeGroupTooltip could be associated with nodeGroup,
      // same for linkGroupToolTip and linkGroup,
      // but this separation allows to manage the order on which elements are drew
      // and so tooltips are always on top.
      nodeGroup = svgGroup.append('g')
            .attr('id', 'nodes');
      linkGroup = svgGroup.append('g')
            .attr('id', 'links');
      linkGroupToolTip = svgGroup.append('g')
                   .attr('id', 'linksTooltips');
      nodeGroupTooltip = svgGroup.append('g')
                   .attr('id', 'nodesTooltips');
  
      defs = baseSvg.append('defs');
      initArrowDef();
      initDropShadow();
      update(treeData);
    }

    let update  = (source) => {
  // Compute the new tree layout
  let nodes = treeData.descendants();
  let links = treeData.links(nodes);

  // Check if two nodes are in collision on the ordinates axe and move them
  breadthFirstTraversal(treeData.descendants(), collision);
  // Normalize for fixed-depth
  
  nodes.forEach(function(d) {
   d['y'] = d.depth * (rectNode.width * 1.5);
  });

// 1) ******************* Update the nodes *******************
  var node = nodeGroup.selectAll('g').data(nodes, function(d) {
    return d['id'] || (d['id'] = ++i);
  });
  var nodesTooltip = nodeGroupTooltip.selectAll('g').data(nodes, function(d) {
    return d['id'] || (d['id'] = ++i);
  });

  // Enter any new nodes at the parent's previous position
  // We use "insert" rather than "append", so when a new child node is added (after a click)
  // it is added at the top of the group, so it is drawed first
  // else the nodes tooltips are drawed before their children nodes and they
  // hide them
  let click = this.functionalityService.click;
  var nodeEnter = node.enter().append('g')
  .attr('style', 'cursor: pointer')
  .attr('transform', d => 
'translate(' + source['y0'] + ',' + source['x0'] + ')')
    .on('click', function(d) {
        let newD = click(d);
        update(newD);
  });

var nodeEnterTooltip = nodesTooltip.enter().append('g')
.style("font", "7px sans-serif")
  .attr('transform', function(d) {
    return 'translate(' + source['y0'] + ',' + source['x0'] + ')'; })
    
  nodeEnter.append('rect')
  .attr('rx', 6)
  .attr('ry', 6)
  .attr('width', rectNode.width)
  .attr('height', rectNode.height)
  .attr('fill', d =>  d['data']['color'])
  .attr('filter', 'url(#drop-shadow)');

  nodeEnter.append('foreignObject')
  .attr('x', rectNode.width/2)
  .attr('y', rectNode.textMargin)
  .attr('width', function() {
        return (rectNode.width - rectNode.textMargin * 2) < 0 ? 0
            : (rectNode.width - rectNode.textMargin * 2)
      })
  .attr('height', function() {
        return (rectNode.height - rectNode.textMargin * 2) < 0 ? 0
            : (rectNode.height - rectNode.textMargin * 2)
      })
  .append('xhtml').html(function(d) {
        var html = '<img src=' + '"' + (d.data.iconPath) + '"' + 
            'style="width: '
            + (rectNode.width /5 - rectNode.textMargin * 20) + 'px; height: '
            +(rectNode.height - rectNode.textMargin * 5) + 'px">'
            return html;
      })

  nodeEnter.append('foreignObject')
  .attr('x', rectNode.textMargin)
  .attr('y', rectNode.textMargin/9)
  .attr('width', function() {
        return (rectNode.width - rectNode.textMargin * 2) < 0 ? 0
            : (rectNode.width - rectNode.textMargin * 2)
      })
  .attr('height', function() {
        return (rectNode.height - rectNode.textMargin * 6) < 0 ? 0
            : (rectNode.height - rectNode.textMargin * 6 )
      })
  .append('xhtml').html(function(d) {
        var html = '<div style="color: white; font: 10px sans-serif">'
            + d['data']['label']
            + '</div>';
            return html;
      })
  .on('mouseover', function(d) {
    $('#nodeInfoID' + d['id']).css('visibility', 'visible');
    $('#nodeInfoTextID' + d['id']).css('visibility', 'visible');
  })
  .on('mouseout', function(d) {
    $('#nodeInfoID' + d['id']).css('visibility', 'hidden');
    $('#nodeInfoTextID' + d['id']).css('visibility', 'hidden');
  });

  nodeEnterTooltip.append("rect")
  .attr('id', function(d) { 
    return 'nodeInfoID' + d['id']; })
    .attr('x', rectNode.width / 2)
  .attr('y', rectNode.height / 2)
  .attr('width', tooltip.width)
  .attr('height', tooltip.height)
    .attr("style", "background: rgba(0, 0, 0, 0.7)")
    .attr("visibility", "hidden")
    .attr("style", "position: absolute")
    .attr("style", "border-width: 1px")
    .attr("style", "border-style: solid")
    .attr("style", "border-color: black")
    .attr("style", "border-top-right-radius: 0.5em")
    .style('fill-opacity', 0.8)
  .on('mouseover', function(d) {
    $('#nodeInfoID' + d['id']).css('visibility', 'visible');
    $('#nodeInfoTextID' + d['id']).css('visibility', 'visible');
    removeMouseEvents();
  })
  .on('mouseout', function(d) {
  	$('#nodeInfoID' + d['id']).css('visibility', 'hidden');
			$('#nodeInfoTextID' + d['id']).css('visibility', 'hidden');
    reactivateMouseEvents();
  });

  nodeEnterTooltip.append("text")
  .attr('id', function(d) { 
    return 'nodeInfoTextID' + d['id']; })
    .attr('x', rectNode.width / 2 + tooltip.textMargin)
  .attr('y', rectNode.height / 2 + tooltip.textMargin * 2)
  .attr('width', tooltip.width)
  .attr('height', tooltip.height)
  .attr('class', 'tooltip-text')
  .attr("visibility", "hidden")
  .attr("fill", "white")
  .attr("display", "block")
  .attr("style", "padding: 5px")
  .append("tspan")
    .text(d => d['data']['type'])
    .append("tspan")
    .attr('x', rectNode.width / 2 + tooltip.textMargin)
    .attr('dy', '1.5em')
    .text(d =>d['data']['serialNumber']);

  // Transition nodes to their new position.
  var nodeUpdate = node.merge(nodeEnter).transition().duration(duration)
		.attr('transform', function (d) { 
      return 'translate(' + d['y'] + ',' + d['x'] + ')'; })
      
		nodesTooltip.merge(nodeEnterTooltip).transition().duration(duration)
		.attr('transform', function(d) { 
      return 'translate(' + d['y'] + ',' + d['x'] + ')'; });

    nodeUpdate.select('rect')
    .attr("stroke-width", function(d) { 
      return d['_children'] ? '2px' : ' '; })
    .attr("stroke", function(d) { 
      return d['_children'] ? 'rgb(0,0,0)' : ''; });

		nodeUpdate.select('text').style('fill-opacity', 1);


		// Transition exiting nodes to the parent's new position
		var nodeExit = node.exit().transition().duration(duration).remove()
      .attr('transform', function(d) { 
        return `translate(${source.y},${source.x})`; });

		nodesTooltip.exit().transition().duration(duration)
      .attr('transform', function(d) { return 'translate(' + source.y + ',' + source.x + ')'; })
      .remove()
      .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0);

      nodeExit.select('text').style('fill-opacity', 1e-6);



// 2) ******************* Update the links *******************
  var link = linkGroup.selectAll('path').data(links, function(d) {
    return d;
  });
  var linkTooltip = linkGroupToolTip.selectAll('g').data(links);

  function linkMarkerStart(status, isSelected) {
    if (status == 'SYNC')
    {
      return isSelected ? 'url(#start-arrow-selected)' : 'url(#start-arrow)';
    }
    return '';
  }

  function linkType(status) {
    if (status == 'SYNC')
      return "Synchronous [\u2194]";
    else
    {
      if (status == 'ASYN')
        return "Asynchronous [\u2192]";
    }
    return '???';
  }

  // Enter any new links at the parent's previous position.
    // Enter any new links at the parent's previous position.
    var linkenter = link.enter().append('path')
    .attr("fill", "none")
    .attr("stroke", "lightsteelblue")
    .attr("stroke-width", "2px") 
    .attr('id', function(d) { 
      return 'linkID' + d['id']; })
    .attr('d', function(d) { 
      return diagonal(d); })
    .attr('marker-end', 'url(#end-arrow)')
    .attr('marker-start', function(d) { 
      return linkMarkerStart('SYNC', false); })
    .on('mouseover', function(d) {
      // d3.select(this).moveToFront();
      d3.select(this).attr('marker-end', 'url(#end-arrow-selected)');
      d3.select(this).attr('marker-start', linkMarkerStart('SYNC', true));
      d3.select(this).attr('style', 'fill: none; stroke: tomato; stroke-width: 2px;');

      $('#tooltipLinkID' + d['target']['id']).attr('x', (d['target']['y'] + rectNode.width - d['source']['y']) / 2 + d['source']['y']);
      $('#tooltipLinkID' + d['target']['id']).attr('y', (d['target']['x'] - d['source']['x']) / 2 + d['source']['x']);
      $('#tooltipLinkID' + d['target']['id']).css('visibility', 'visible');
      $('#tooltipLinkTextID' + d['target']['id']).css('visibility', 'visible');
    })
    .on('mouseout', function(d) {
      d3.select(this).attr('marker-end', 'url(#end-arrow)');
      d3.select(this).attr('marker-start', linkMarkerStart('SYNC', false));
      d3.select(this).attr('style', 'fill: none; stroke: lightsteelblue; stroke-width: 2px;');
      $('#tooltipLinkID' + d['target']['id']).css('visibility', 'hidden');
      $('#tooltipLinkTextID' + d['target']['id']).css('visibility', 'hidden');
    });

    linkTooltip.enter().append('rect')
    .attr('id', function(d) { return 'tooltipLinkID' + d['target']['id']; })
    .attr('style', 'background: rgba(0, 0, 0, 0.7); visibility: hidden; position: absolute; border-style: solid; border-width: 1px; border-color: black; border-top-right-radius: 0.5em;')
    .style('fill-opacity', 0.8)
    .attr('x', function(d) { return (d['target']['y'] + rectNode.width - d['source']['y']) / 2 + d['source']['y']; })
    .attr('y', function(d) { return (d['target']['x'] - d['source']['x']) / 2 + d['source']['x']; })
    .attr('width', tooltip.width)
    .attr('height', tooltip.height)
    .on('mouseover', function(d) {
      $('#tooltipLinkID' + d['target']['id']).css('visibility', 'visible');
      $('#tooltipLinkTextID' + d['target']['id']).css('visibility', 'visible');
      // After selected a link, the cursor can be hover the tooltip, that's why we still need to highlight the link and the arrow
      $('#linkID' + d['target']['id']).attr('style', 'fill: none; stroke: tomato; stroke-width: 2px;');
      $('#linkID' + d['target']['id']).attr('marker-end', 'url(#end-arrow-selected)');
      $('#linkID' + d['target']['id']).attr('marker-start', linkMarkerStart('SYNC', true));

      removeMouseEvents();
    })
    .on('mouseout', function(d) {
      $('#tooltipLinkID' + d.target.id).css('visibility', 'hidden');
      $('#tooltipLinkTextID' + d.target.id).css('visibility', 'hidden');
      $('#linkID' + d.target.id).attr('class', 'link');
      $('#linkID' + d.target.id).attr('marker-end', 'url(#end-arrow)');
      $('#linkID' + d.target.id).attr('marker-start', linkMarkerStart('SYNC', false));

      reactivateMouseEvents();
    });

    linkTooltip.enter().append('text')
    .attr('id', function(d) { return 'tooltipLinkTextID' + d['target']['id']; })
    .attr('style', 'visibility: hidden; font: 7px sans-serif; color: white; display: block; padding: 5px;')
    .attr('x', function(d) { return (d['target']['y'] + rectNode.width - d['source']['y']) / 2 + d['source']['y'] + tooltip.textMargin; })
    .attr('y', function(d) { return (d['target']['x'] - d['source']['x']) / 2 + d['source']['x'] + tooltip.textMargin * 2; })
    .attr('width', tooltip.width)
    .attr('height', tooltip.height)
    .style('fill', 'white')
    .append("tspan")
       .text(function(d) { return linkType("SYNC"); })
       .append("tspan")
      .attr('x', function(d) { return (d['target']['y'] + rectNode.width - d['source']['y']) / 2 + d['source']['y'] + tooltip.textMargin; })
       .attr('dy', '1.5em')
      .text(function(d) { return "working..."});

  // Transition links to their new position.
  var linkUpdate = link.merge(linkenter).transition().duration(duration)
              .attr('d', function(d) {return diagonal(d); });

  linkTooltip.transition().duration(duration)
         .attr('d', function(d) { return diagonal(d); });

  // Transition exiting nodes to the parent's new position.
  link.exit().transition()
  .remove();

  linkTooltip.exit().transition()
    .remove();

  // Stash the old positions for transition.
  nodes.forEach(function(d) {
    d['x0'] = d['x'];
    d['y0'] = d['y'];
  });
}
  
// Breadth-first traversal of the tree
	// func function is processed on every node of a same level
	// return the max level
  let breadthFirstTraversal = (tree, func) =>
  {    
    var max = 0;
    if (tree && tree['length'] > 0)
    {
      var currentDepth = tree[0].depth;
      var fifo = [];
      var currentLevel = [];

      fifo.push(tree[0]);
      while (fifo.length > 0) {
        var node = fifo.shift();
        if (node.depth > currentDepth) {
          func(currentLevel);
          currentDepth++;
          max = Math.max(max, currentLevel.length);
          currentLevel = [];
        }
        currentLevel.push(node);
        if (node.children) {
          for (var j = 0; j < node.children.length; j++) {
            fifo.push(node.children[j]);
          }
        }
      }
    func(currentLevel);
    return Math.max(max, currentLevel.length);
  }
  return 0;
  }

  let collision = siblings =>{
	  var minPadding = 5;
	  if (siblings) {
		  for (var i = 0; i < siblings.length - 1; i++)
		  {
			  if (siblings[i + 1].x - (siblings[i].x + rectNode.height) < minPadding)
				  siblings[i + 1].x = siblings[i].x + rectNode.height + minPadding;
		  }
	  }
  }
  let removeMouseEvents = () => {
		// Drag and zoom behaviors are temporarily disabled, so tooltip text can be selected
		mousedown = d3.select('#container').select('svg').on('mousedown.zoom');
		d3.select('#container').select('svg').on("mousedown.zoom", null);
	}
  let reactivateMouseEvents =() =>  {
		// Reactivate the drag and zoom behaviors
		d3.select('#container').select('svg').on('mousedown.zoom', mousedown);
	}

  let getMouseWheelEvent = () => {
    console.log("mouse event")
		if (d3.select('#container').select('svg').on('wheel.zoom'))
		{
			mouseWheelName = 'wheel.zoom';
			return d3.select('#container').select('svg').on('wheel.zoom');
		}
		if (d3.select('#container').select('svg').on('mousewheel.zoom') != null)
		{
			mouseWheelName = 'mousewheel.zoom';
			return d3.select('#container').select('svg').on('mousewheel.zoom');
		}
		if (d3.select('#container').select('svg').on('DOMMouseScroll.zoom'))
		{
			mouseWheelName = 'DOMMouseScroll.zoom';
			return d3.select('#container').select('svg').on('DOMMouseScroll.zoom');
		}
  }
  
  let diagonal = d => {
		var p0 = {
			x : d.source.x + rectNode.height / 2,
			y : (d.source.y + rectNode.width)
		}, p3 = {
			x : d.target.x + rectNode.height / 2,
			y : d.target.y  - 12 // -12, so the end arrows are just before the rect node
		}, m = (p0.y + p3.y) / 2, p = [ p0, {
			x : p0.x,
			y : m
		}, {
			x : p3.x,
			y : m
		}, p3 ];
		p = <any>p.map(function(d) {
			return [ d.y, d.x ];
		});
		return 'M' + p[0] + 'C' + p[1] + ' ' + p[2] + ' ' + p[3];
  }
  
  let initDropShadow = () => {
		var filter = defs.append("filter")
		    .attr("id", "drop-shadow")
		    .attr("color-interpolation-filters", "sRGB");

		filter.append("feOffset")
		.attr("result", "offOut")
		.attr("in", "SourceGraphic")
	    .attr("dx", 0)
	    .attr("dy", 0);

		filter.append("feGaussianBlur")
		    .attr("stdDeviation", 2);

		filter.append("feOffset")
		    .attr("dx", 2)
		    .attr("dy", 2)
		    .attr("result", "shadow");

		filter.append("feComposite")
	    .attr("in", 'offOut')
	    .attr("in2", 'shadow')
	    .attr("operator", "over");
  }
  


  let  initArrowDef = () => {
		// Build the arrows definitions
		// End arrow
		defs.append('marker')
		.attr('id', 'end-arrow')
		.attr('viewBox', '0 -5 10 10')
		.attr('refX', 0)
		.attr('refY', 0)
		.attr('markerWidth', 6)
		.attr('markerHeight', 6)
		.attr('orient', 'auto')
		.attr('style', 'fill: lightsteelblue; stroke-width: 1px;')
		.append('path')
		.attr('d', 'M0,-5L10,0L0,5');

		// End arrow selected
		defs.append('marker')
		.attr('id', 'end-arrow-selected')
		.attr('viewBox', '0 -5 10 10')
		.attr('refX', 0)
		.attr('refY', 0)
		.attr('markerWidth', 6)
		.attr('markerHeight', 6)
		.attr('orient', 'auto')
		.attr('class', 'arrowselected')
		.append('path')
		.attr('d', 'M0,-5L10,0L0,5');

		// Start arrow
		defs.append('marker')
		.attr('id', 'start-arrow')
		.attr('viewBox', '0 -5 10 10')
		.attr('refX', 0)
		.attr('refY', 0)
		.attr('markerWidth', 6)
		.attr('markerHeight', 6)
		.attr('orient', 'auto')
		.attr('style', 'fill: lightsteelblue; stroke-width: 1px;')
		.append('path')
		.attr('d', 'M10,-5L0,0L10,5');

		// Start arrow selected
		defs.append('marker')
		.attr('id', 'start-arrow-selected')
		.attr('viewBox', '0 -5 10 10')
		.attr('refX', 0)
		.attr('refY', 0)
		.attr('markerWidth', 6)
		.attr('markerHeight', 6)
		.attr('orient', 'auto')
		.attr('class', 'fill: tomato; stroke-width: 2px;')
		.append('path')
		.attr('d', 'M10,-5L0,0L10,5');
	}
  drawTree(this.data);
    
}
}