// A class representing a physical canvas which contains datapoints, and
// on which a smoothing of those datapoints can be rendered.
var Canvas = function(elem, dimensions, margins) {

  // Physical properties of the canvas
  this.height = dimensions.height;
  this.width = dimensions.width;
  this.margins = margins;
  this.xscale = d3.scale.linear()
                  .domain([0, 1])
                  .range([margins.left, dimensions.width - margins.right]);
  this.xaxis = d3.svg.axis()
                 .scale(this.xscale)
                 .orient("bottom")
                 .ticks(10);
  this.yscale = d3.scale.linear()
                  .domain([0, 1])
                  .range([dimensions.height - margins.bottom, margins.top]);
  this.yaxis = d3.svg.axis()
                 .scale(this.yscale)
                 .orient("left")
                 .ticks(10);

  // Physical manifestation of the canvas
  this.svg = d3.select(elem).append("svg")
               .attr("height", dimensions.height)
               .attr("width", dimensions.width);
  this.svg.append("g")
          .attr("class", "axis")
          .attr("transform", "translate(0, " + 
                                (dimensions.height - margins.top) +
                              ")")
          .call(this.xaxis);
  this.svg.append("g")
          .attr("class", "axis")
          .attr("transform", "translate(" + 
                                margins.left +
                              ", 0)")
          .call(this.yaxis);

  // Data associated with the canvas. (x, y) is the collection of user drawn
  // points; (xhat, yhat) is a smoothing of those points.  
  this.x = [];
  this.xhat = d3.range(0, 1, .01)
  this.y = [];
  this.yhat = [];

  // Smoothing function currently associated with the canvas
  this.smoother = undefined;

  // Is there a currently rendered smoother?
  this.hasbeensmoothed = false;

  // Bind an event handler to the canvasr: a click even on the physical canvas
  // draws a physical point, add adds the coordinates of the point to the x and
  // y attributes.  Note that the method add_point resides on the prototype.
  var that = this
  this.svg.on("click", function() {
    var p = d3.mouse(this);
    that.add_point(p[0], p[1])
    if(that.x.length > 2) {
      that.smooth();
    }
  });
}

Canvas.prototype = {
  constructor: Canvas,

  // Draw a point on the canvas and update the internal state.
  add_point: function(px, py) {
    this.x.push(this.xscale.invert(px));
    this.y.push(this.yscale.invert(py));
    this.svg.append("circle")
            .attr("cx", px)
            .attr("cy", py)
            .attr("r", 3)
            .attr("id", "data-point");
  },

  // Remove everything from the canvas.
  clear: function() {
    this.x = [];
    this.y = [];
    this.yhat = [];
    this.svg.selectAll('circle').remove();
    this.svg.selectAll('path#smoothed-path').remove();
    this.hasbeensmoothed = false;
  },

  // Smooth the data drawn on the canvas with a certain smoothing algorithm.
  // The smoother argument should process two arrays representing the x and
  // y data to be smoothed, and return a function that, when applied to an
  // array of new x values, returns the associated smoothed y values.
  smooth: function() {
    // Only makes sense to smooth more than two points, if less, bail early.
    if(this.x.length <= 1) {return;}
    // Smooth the data points
    this.yhat = this.smoother(this.x, this.y)(this.xhat);
    var data = d3.zip(this.xhat, this.yhat);
    var that = this;
    var line = d3.svg.line()
                     .x(function(d) {return that.xscale(d[0]);})
		     .y(function(d) {return that.yscale(d[1]);})
		     .interpolate("linear")

    that = this;  // Preserve for method chain.
    if(!this.hasbeensmoothed) {
      // If no smoothed graph has been rendered yet, render it.
      this.svg.append("path")
	      .attr("d", line(data))
	      .attr("stroke", "lightskyblue")
	      .attr("stroke-width", 2)
	      .attr("fill", "none")
	      .attr("id", "smoothed-path");
      this.hasbeensmoothed = true;
    } else {
      // If there is already a smoothed graph, render it with a transition
      this.svg.selectAll("path#smoothed-path")
			.transition()
			.duration(1000)
			.attr("d", line(data))
			.attr("stroke", "lightskyblue")
			.attr("stroke-width", 2)
			.attr("fill", "none");
    }
  },

  // Clear the smoother drawn on the canvas.
  clear_smooth: function() {
    this.yhat = []
    this.svg.selectAll('circle#data-smoother').remove();
    this.hasbeensmoothed = false;
  }
};
