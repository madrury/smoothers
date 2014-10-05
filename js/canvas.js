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
  // Bind an event handler to the canvasr: a click even on the physical canvas
  // draws a physical point, add adds the coordinates of the point to the x and
  // y attributes.  Note that the method add_point resides on the prototype.
  var that = this
  this.svg.on("click", function() {
    var p = d3.mouse(this);
    that.add_point(p[0], p[1])
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
  },

  // Smooth the data drawn on the canvas with a certain smoothing algorithm.
  // The smoother argument should process two arrays representing the x and
  // y data to be smoothed, and return a function that, when applied to an
  // array of new x values, returns the associated smoothed y values.
  smooth: function(smoother) {
     this.clear_smooth();
     this.yhat = smoother(this.x, this.y)(this.xhat)
     that = this  // Preserve for method chain.
     this.svg.selectAll("circles")
             .data(d3.zip(that.xhat, that.yhat))
             .enter()
             .append("circle")
             .attr("cx", function(d) {
               return that.xscale(d[0])
             })
             .attr("cy", function(d) {
               return that.yscale(d[1])
             })
             .attr("r", 2)
             .attr("fill", "lightskyblue")
             .attr("id", "data-smoother");

  },

  // Clear the smoother drawn on the canvas.
  clear_smooth: function() {
    this.yhat = []
    this.svg.selectAll('circle#data-smoother').remove();
  }
};
