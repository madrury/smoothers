smoothers = {

  // Simply return the mean of the y values as a smoother
  "smooth-type-mean": function(xs, ys) {
    var mean = d3.mean(ys);
    return function(x) {
      return x.map(function(xi) {return mean})
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
    var beta = (xymean - xmean * ymean) / (xsqmean - xmean * xmean) 
    var betaz = ymean - beta * xmean
    var linreg = function(newx) {
      return betaz + beta * newx
    }
    return function(x) {
      return x.map(linreg) 
    }
  }

};
