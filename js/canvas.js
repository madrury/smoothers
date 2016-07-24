/* An object representing a physical canvas which contains datapoints, and
   on which a smoothing of those datapoints can be rendered.

   The canvas responds to clicks from teh user by rendering a new datapoint
   at the location of the click, and storing the x, y coordinates of the new
   point as internal state.  When enough points have been stored, clicks also
   cause the canvas to send a "smooth" message to a controller, which will
   respond with the smoother and parameters to use for drawing a smoother.
 */
let canvas = function(elem, dimensions, margins) {

    /* Physical properties of the canvas */
    let height = dimensions.height;
    let width = dimensions.width;
    let xscale = d3.scaleLinear()
        .domain([0, 1])
        .range([margins.left, dimensions.width - margins.right]);
    let xaxis = d3.axisBottom(xscale).ticks(10);
    let yscale = d3.scaleLinear()
        .domain([0, 1])
        .range([dimensions.height - margins.bottom, margins.top]);
    let yaxis = d3.axisLeft(yscale).ticks(10);

    let svg = d3.select(elem).append("svg")
        .attr("height", dimensions.height)
        .attr("width", dimensions.width);
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0, " + (dimensions.height - margins.top) + ")")
        .call(xaxis);
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + margins.left + ", 0)")
        .call(yaxis);

    /* Data associated with the canvas. (x, y) is the collection of user drawn
     * points; (xhat, yhat) is a smoothing of those points.
     */
    let x = [];
    let xhat = d3.range(0, 1, .01);
    let y = [];
    let yhat = [];

    /* Is there a currently rendered smoother? */
    let hasbeensmoothed = false;


    return {

        /* Message queue for the contorller object. */
        msg_queue: [],

        /* Draw a point on the canvas and update the internal state. */
        add_point: function(px, py) {
            x.push(xscale.invert(px));
            y.push(yscale.invert(py));
            svg.append("circle")
                .attr("cx", px)
                .attr("cy", py)
                .attr("r", 3)
                .attr("id", "data-point");
            if(x.length > 2) {
                this.msg_queue.push({"smooth": null});
            }
        },

        /* Bind a click handler to the canvas which will respond to a mouse
         * click by rendering a point and possibly drawing a smoothed curve.
         */
        bind_click_listener: function() {
            let that = this;
            svg.on("click", function() {
                let p = d3.mouse(this);
                that.add_point(p[0], p[1])
            });
        },


        /* Smooth the x, y data drawn on the canvas with a certain smoothing
         * algorithm in accord with certain parameters. 
         */
        smooth: function(smoother, parameters) {
            // Only makes sense to smooth more than two points, if less, bail early.
            if(x.length <= 1) {
                return;
            }
            // Smooth the data points
            yhat = smoother.smoother(parameters)(x, y)(xhat);
            let data = d3.zip(xhat, yhat);
            let line = d3.line().curve(d3.curveBasis)
                          .x(d => xscale(d[0]))
                          .y(d => yscale(d[1]))

            if(!hasbeensmoothed) {
                // If no smoothed graph has been rendered yet, render it.
                svg.append("path")
                    .attr("d", line(data))
                    .attr("stroke", "lightskyblue")
                    .attr("stroke-width", 2)
                    .attr("fill", "none")
                    .attr("id", "smoothed-path");
                hasbeensmoothed = true;
            } else {
                // If there is already a smoothed graph, render it with a transition
                svg.selectAll("path#smoothed-path")
                    .transition()
                    .duration(1000)
                    .attr("d", line(data))
                    .attr("stroke", "lightskyblue")
                    .attr("stroke-width", 2)
                    .attr("fill", "none");
            }
        },

        draw_knots: function(knot_function, k) {
            let kn = Number(k);
            let knots = knot_function(kn);
            let s = svg.selectAll()
                .data(knots)
                .enter()
                .append("line")
                    .attr("class", "knot-line")
                    .attr("x1", d => xscale(d))
                    .attr("y1", d => yscale(-1))
                    .attr("x2", d => xscale(d))
                    .attr("y2", d => yscale(2))
                    .style("stroke-width", 2)
                    .style("stroke-dasharray", "10, 10")
                    .style("stroke", "lightgrey")
                    .style("fill", "none");
        },

        clear_knots: function() {
            svg.selectAll("line.knot-line").remove()
        },

        /* Remove everything from the canvas and clear all applicable state. */
        clear: function() {
            x = [];
            y = [];
            yhat = [];
            svg.selectAll('circle').remove();
            svg.selectAll('path#smoothed-path').remove();
            svg.selectAll("line.knot-line").remove()
            hasbeensmoothed = false;
        },

    };
};
