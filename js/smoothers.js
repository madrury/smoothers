// Helper functions

// TODO: Abstract out dot product.

// Wrap a slope m and an intercept b into a linear function
var linear_function = function(m, b) {
    return function(x) {
        return b + m * x;
    }
}

// Weighted mean of x with weights w.  Weights may be un-normalized.
var wmean = function(x, w) {
    var r = [];
    for(i = 0; i < x.length; i++) {
        r.push(x[i]*w[i]);
    }
    return d3.sum(r) / d3.sum(w);
}

// Simple linear regression on data (ys, xs).
var linear_regressor = function(xs, ys) {
    var xmean = d3.mean(xs);
    var ymean = d3.mean(ys);
    var xymean = d3.mean(d3.zip(xs, ys).map(function(p) {return p[0]*p[1]}));
    var xsqmean = d3.mean(d3.zip(xs, xs).map(function(p) {return p[0]*p[1]}));
    var beta = (xymean - xmean * ymean) / (xsqmean - xmean * xmean);
    var betaz = ymean - beta * xmean;
    return linear_function(beta, betaz);
};


// Simple linear regression with sample weights.
var weighted_linear_regressor = function(xs, ys, ws) {
    var xmean = wmean(xs, ws);
    var ymean = wmean(ys, ws);
    var xymean = wmean(d3.zip(xs, ys).map(function(p) {return p[0]*p[1]}), ws);
    var xsqmean = wmean(d3.zip(xs, xs).map(function(p) {return p[0]*p[1]}), ws);
    var beta = (xymean - xmean * ymean) / (xsqmean - xmean * xmean);
    var betaz = ymean - beta * xmean;
    return linear_function(beta, betaz)
};

// Convert a function that maps numbers to numbers into one which maps
// arrays to arrays.
var vectorize = function(f) {
    return function(arr) {
        return arr.map(f)
    }
}

// Smoothers should consume two numeric arrays, and return a mapping from 
// numeric arrays to numeric arrays
smoothers = {

    // Trivial mean smoother.
    // Simply return the mean of the y values as the smoothed data.
    "smooth-type-mean": function(xs, ys) {
        var mean = d3.mean(ys);
        return vectorize(x => mean)
    },

    // Running mean smoother. 
    // The smoothed value y at a given x is the mean value of the y data
    // for those data with the closest k x data.
    // TODO: Add number of neighbours parameter.
    "smooth-type-runmean": function(xs, ys) {
        // Reorder xs and ys so that xs is in increasing order
        var psort = d3.zip(xs, ys).sort(function(a, b) {return a[0] - b[0]});
        var xsort = psort.map(function(p) {return p[0]});
        var ysort = psort.map(function(p) {return p[1]});
        var mean_of_symm_nbrd = function(newx) {
            // TODO: Abstract out finding the local neighbourhood.
            var pos_in_array = d3.bisect(xsort, newx);
            // TODO: Check that you lined up the fenceposts.
            var cutoffs = [
                Math.max(0, pos_in_array - 3), 
                Math.min(xsort.length - 1, pos_in_array + 3)
            ];
            return d3.mean(ysort.slice(cutoffs[0], cutoffs[1]));
        };
        return vectorize(mean_of_symm_nbrd);
    },

    // Simple linear regression smoother.
    "smooth-type-linreg": function(xs, ys) {
        var linreg = linear_regressor(xs, ys);
        return vectorize(linreg)
    },

    // Running line smoother.
    // To calculate the smoothed value of y at a given x, first take together the
    // k data points closest to x.  Then fit a simple linear regression to these k
    // data points.  The smoothed value of y is the prediction made from this
    //linear regressor.
    "smooth-type-runline": function(xs, ys) {
        // Reorder xs and ys so that xs is in increasing order
        var psort = d3.zip(xs, ys).sort(function(a, b) {return a[0] - b[0]});
        var xsort = psort.map(function(p) {return p[0]});
        var ysort = psort.map(function(p) {return p[1]});
        var loc_lin_approx = function(newx) {
            var pos_in_array = d3.bisect(xsort, newx);
            // TODO: Check that you lined up the fenceposts.
            var cutoffs = [Math.max(0, pos_in_array - 3), 
                Math.min(xsort.length, pos_in_array + 3)
            ];
            var locx =  xsort.slice(cutoffs[0], cutoffs[1]);
            var locy =  ysort.slice(cutoffs[0], cutoffs[1]);
            return linear_regressor(locx, locy)(newx);
        }
        return vectorize(loc_lin_approx);
    },

    // Gaussian kernel smoother.
    // TODO: Make lamda a parameter.
    "smooth-type-gaussk": function(xs, ys) {
        var lambda = .01;
        var gauss_kern_smooth = function(x) {
            var ds = xs.map(function(xi) {return x - xi;});
            var ws = ds.map(function(di) {return Math.exp(-di*di/lambda);});
            var normc = d3.sum(ws); 
            var normws = ws.map(function(wi) {return wi / normc;});
            return d3.sum(d3.zip(normws, ys).map(function(p) {return p[0]*p[1]}));
        };
        return vectorize(gauss_kern_smooth)
    },

    // Locally weighted linear regression smoother.
    "smooth-type-loess": function(xs, ys) {
        var k = 5
        var loess = function(x) {
            // Sort by increasing absolute distance from x.
            var psort = d3.zip(xs, ys).sort(function(a, b) {
                return Math.abs(x - a[0]) - Math.abs(x - b[0])}
            );
            var xsort = psort.map(function(p) {return p[0]}).slice(0, 7);
            var ysort = psort.map(function(p) {return p[1]}).slice(0, 7);
            var nearest_nbrs = psort.slice(0, 7);
            var ds = nearest_nbrs.map(function(p) {return Math.abs(p[0] - x)});
            var dsmax = d3.max(ds);
            var ws = ds.map(function(d) {
                return Math.pow(1 - d*d*d, 3) / (dsmax * dsmax * dsmax)
            });
            return weighted_linear_regressor(xsort, ysort, ws)(x);
        };
        return vectorize(loess)
    },

};
