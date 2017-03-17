/* An object representing a physical canvas which contains datapoints, and
   on which a smoothing of those datapoints can be rendered.

   The canvas responds to clicks from the user by rendering a new datapoint at
   the location of the click.  The object stores as internal state:

     - The x, y coordinates of all the currently rendered points.
     - The xhat, yhat coordinates of the currently rendered smoother.
*/
let canvas = function(elem, dimensions, margins) {

    /***********************/
    /* Private Attributes. */
    /***********************/

    /* Physical properties of the canvas */
    let height = dimensions.height;
    let width = dimensions.width;

    /* d3 scale objects for transforming between physical and conceptual units.
    */
    let xscale = d3.scaleLinear()
        .domain([0, 1])
        .range([margins.left, dimensions.width - margins.right]);
    let yscale = d3.scaleLinear()
        .domain([0, 1])
        .range([dimensions.height - margins.bottom, margins.top]);

    /* d3 axis objects for the horizontal and vertical axies. */
    let xaxis = d3.axisBottom(xscale).ticks(10);
    let yaxis = d3.axisLeft(yscale).ticks(10);

    /* Initilize the drawing area:
         - Create a blank svg container to draw on.
         - Render the x and y axis in the drawing area.
    */
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

    /* Internal state of the canvas.
         - (x, y) track the currently rendered points on the canvas.
         - (xhat, yhat) track the currently rendered smoother.
    */
    let x = [];
    let y = [];
    /* We always draw the smoother using 100 sample points. */
    let xhat = d3.range(0, 1, .01);
    /* No smoother to begin with, because no data points yet to smooth. */
    let yhat = [];

    /* Is there a currently rendered smoother? */
    let has_been_smoothed = false;


    /* Object.  Public methods and attributes. */
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
                /* Send a request to the controller to draw a smoother. */
                this.msg_queue.push({"smooth": null});
            }
        },

        /* Bind a click handler to the canvas which will respond to a mouse
           click by rendering a point.

           TODO: The actual rendering of the point should be handled by the
                 controller.  So instead of adding a point explicitly, this
                 method should add to the event queue.
         */
        bind_click_listener: function() {
            let that = this;
            svg.on("click", function() {
                let p = d3.mouse(this);
                that.add_point(p[0], p[1])
            });
        },


        /* Draw a smoothing of the points drawn on the canvus with a supplied
           smoothing algorithm.
        */
        smooth: function(smoother, parameters) {
            /* It only makes sense to smooth more than two points, if 
               there are less points, bail early.
            */
            if(x.length <= 1) {
                return;
            }
            // Smooth the data points
            yhat = smoother.smoother(parameters)(x, y)(xhat);
            let data = d3.zip(xhat, yhat);
            let line = d3.line().curve(d3.curveBasis)
                          .x(d => xscale(d[0]))
                          .y(d => yscale(d[1]))

            if(!has_been_smoothed) {
                /* If no smoothed graph has been rendered yet, render it. */
                svg.append("path")
                    .attr("d", line(data))
                    .attr("stroke", "lightskyblue")
                    .attr("stroke-width", 2)
                    .attr("fill", "none")
                    .attr("id", "smoothed-path");
                has_been_smoothed = true;
            } else {
                /* If we have already rendered a smoother, render the new one
                   with a transition.
                */
                svg.selectAll("path#smoothed-path")
                    .transition()
                    .duration(1000)
                    .attr("d", line(data))
                    .attr("stroke", "lightskyblue")
                    .attr("stroke-width", 2)
                    .attr("fill", "none");
            }
        },

        /* Draw dashed vertical lines on the canvas indicating the position
           of knots in a spline smoother.
        */
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

        /* Remove dashed vertial lines on the canvas that indicate the
           position of knots in a spline smoother.
        */
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
            has_been_smoothed = false;
        },

    };
};
