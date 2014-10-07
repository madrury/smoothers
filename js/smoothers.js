// Helper functions
var linear_regressor = function(xs, ys) {
  var xmean = d3.mean(xs);
  var ymean = d3.mean(ys);
  var xymean = d3.mean(d3.zip(xs, ys).map(function(p) {return p[0]*p[1]}));
  var xsqmean = d3.mean(d3.zip(xs, xs).map(function(p) {return p[0]*p[1]}));
  var beta = (xymean - xmean * ymean) / (xsqmean - xmean * xmean);
  var betaz = ymean - beta * xmean;
  return function(x) {
    return betaz + beta * x;
  }
};

var wmean = function(x, w) {
  var r = [];
  for(i = 0; i < x.length; i++) {
    r.push(x[i]*w[i]);
  }
  return d3.sum(r) / d3.sum(w);
}

var weighted_linear_regressor = function(xs, ys, ws) {
  var xmean = wmean(xs, ws);
  var ymean = wmean(ys, ws);
  var xymean = wmean(d3.zip(xs, ys).map(function(p) {return p[0]*p[1]}), ws);
  var xsqmean = wmean(d3.zip(xs, xs).map(function(p) {return p[0]*p[1]}), ws);
  var beta = (xymean - xmean * ymean) / (xsqmean - xmean * xmean);
  var betaz = ymean - beta * xmean;
  console.log(beta); console.log(betaz);
  return function(x) {
    return betaz + beta * x;
  }
}

// Smoothers should consume two numeric arrays, and return a mapping from 
// numeric arrays to numeric arrays
smoothers = {

  // Simply return the mean of the y values as a smoother
  "smooth-type-mean": function(xs, ys) {
    var mean = d3.mean(ys);
    return function(x) {
      return x.map(function(xi) {return mean});
    };

  },

  // Running mean smoother with a fixed nearest neighbour bandwidth o 3
  "smooth-type-runmean": function(xs, ys) {
    // Reorder xs and ys so that xs is in increasing order
    var psort = d3.zip(xs, ys).sort(function(a, b) {return a[0] - b[0]});
    var xsort = psort.map(function(p) {return p[0]});
    var ysort = psort.map(function(p) {return p[1]});
    var mean_of_symm_nbrd = function(newx) {
      var pos_in_array = d3.bisect(xsort, newx);
      // TODO: Check that you lined up the fenceposts.
      var cutoffs = [Math.max(0, pos_in_array - 3), 
                     Math.min(xsort.length - 1, pos_in_array + 3)
          ];
      return d3.mean(ysort.slice(cutoffs[0], cutoffs[1]));
    };
    return function(x) {
      return x.map(mean_of_symm_nbrd);
    };

  },

  // Statndard linear regression smoother
  "smooth-type-linreg": function(xs, ys) {
    var linreg = linear_regressor(xs, ys);
    return function(x) {
      return x.map(linreg);
    }
  },

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
    return function(x) {
      return x.map(loc_lin_approx);
    }
  },

  "smooth-type-gaussk": function(xs, ys) {
    var lambda = .01;
    var gauss_kern_smooth = function(x) {
      var ds = xs.map(function(xi) {return x - xi;});
      var ws = ds.map(function(di) {return Math.exp(-di*di/lambda);});
      var normc = d3.sum(ws); 
      var normws = ws.map(function(wi) {return wi / normc;});
      return d3.sum(d3.zip(normws, ys).map(function(p) {return p[0]*p[1]}));
    };
    return function(x) {
      return x.map(gauss_kern_smooth)
    }
  },

  "smooth-type-loess": function(xs, ys) {
    var k = 5
    var loess = function(x) {
      console.log("x is: " + x);
      var psort = d3.zip(xs, ys).sort(function(a, b) {
                      return Math.abs(x - a[0]) - Math.abs(x - b[0])}
                  );
      var xsort = psort.map(function(p) {return p[0]}).slice(0, 7);
      console.log(xsort)
      var ysort = psort.map(function(p) {return p[1]}).slice(0, 7);
      var nearest_nbrs = psort.slice(0, 7);
      var ds = nearest_nbrs.map(function(p) {return Math.abs(p[0] - x)});
      var dsmax = d3.max(ds);
      var ws = ds.map(function(d) {
                   return Math.pow(1 - d*d*d, 3) / (dsmax * dsmax * dsmax)
	       });
      return weighted_linear_regressor(xsort, ysort, ws)(x);
    };
    return function(x) {
      return x.map(loess);
    }
  },

};
