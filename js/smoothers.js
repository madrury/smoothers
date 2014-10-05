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
    // Calcualte the intercept and linear term from linear regression
    // over the data
    var xmean = d3.mean(xs);
    var ymean = d3.mean(ys);
    var xymean = d3.mean(d3.zip(xs, ys).map(function(p) {return p[0]*p[1]}));
    var xsqmean = d3.mean(d3.zip(xs, xs).map(function(p) {return p[0]*p[1]}));
    var beta = (xymean - xmean * ymean) / (xsqmean - xmean * xmean);
    var betaz = ymean - beta * xmean;
    var linreg = function(newx) {
      return betaz + beta * newx;
    }
    return function(x) {
      return x.map(linreg);
    }
  }

};
