// Helper functions

// Dot product of two vectors
let dot = function(v1, v2) {
    let s = 0;
    for(let i = 0; i < v1.length; i++) {
        s += v1[i] * v2[i];
    }
    return s
}

// Wrap a slope m and an intercept b into a linear function
let linear_function = function(m, b) {
    return function(x) {
        return b + m * x;
    }
}

// Weighted mean of x with weights w.  Weights may be un-normalized.
let wmean = function(x, w) {
    let r = [];
    for(i = 0; i < x.length; i++) {
        r.push(x[i]*w[i]);
    }
    return d3.sum(r) / d3.sum(w);
}

// Simple linear regression on data (ys, xs).
let linear_regressor = function(xs, ys) {
    let xmean = d3.mean(xs);
    let ymean = d3.mean(ys);
    let xymean = d3.mean(d3.zip(xs, ys).map(p => p[0]*p[1]));
    let xsqmean = d3.mean(d3.zip(xs, xs).map(p => p[0]*p[1]));
    let beta = (xymean - xmean * ymean) / (xsqmean - xmean * xmean);
    let betaz = ymean - beta * xmean;
    return linear_function(beta, betaz);
};

// Simple linear regression with sample weights.
let weighted_linear_regressor = function(xs, ys, ws) {
    let xmean = wmean(xs, ws);
    let ymean = wmean(ys, ws);
    let xymean = wmean(d3.zip(xs, ys).map(p => p[0]*p[1]), ws);
    let xsqmean = wmean(d3.zip(xs, xs).map(p => p[0]*p[1]), ws);
    let beta = (xymean - xmean * ymean) / (xsqmean - xmean * xmean);
    let betaz = ymean - beta * xmean;
    return linear_function(beta, betaz)
};

// Convert a function that maps numbers to numbers into one which maps
// arrays to arrays.
let vectorize = function(f) {
    return function(arr) {
        return arr.map(f)
    }
}


/* Ridge Regression functions. */

fit_ridge_regression = function(X, ys, lambda) {
    // Standarzide the predictors and response.
    let X_standardization = compute_matrix_standardization(X);
    let Xsd = standardize_matrix(X, X_standardization);
    let y_standardization = compute_vector_standardization(ys);
    let ysd = standardize_vector(ys, y_standardization);
    // Compute the regression.
    let Xsdt = numeric.transpose(Xsd);
    let XtX = numeric.dot(Xsdt, Xsd);
    let Xty = numeric.dot(Xsdt, ysd);
    let shrink_matrix = make_ridge_shrinkage_matrix(X[0].length, lambda);
    let betas = numeric.solve(numeric.add(XtX, shrink_matrix), Xty);
    return {
        "betas": betas,
        "Xsd": X_standardization,
        "ysd": y_standardization
    }
}

make_ridge_shrinkage_matrix = function(n, lambda) {
    let shrink_matrix = numeric.diag(numeric.rep([n + 1], lambda));
    shrink_matrix[0][0] = 0;  // Don't shrink linear term in basis expansions.
    return shrink_matrix
}

let compute_matrix_standardization = function(X) {
    let standardization = {"mean": [], "sd": []};
    // Easier to iterate over the rows of a matrix than the columns.
    let Xt = numeric.transpose(X);
    for(let i = 0; i < Xt.length; i++) {
        let standardized_row = compute_vector_standardization(Xt[i]);
        standardization.mean.push(standardized_row.mean);
        standardization.sd.push(standardized_row.sd);
    }
    return standardization;
}

let compute_vector_standardization = function(v) {
    let mean = d3.mean(v);
    let sd = d3.deviation(v);
    return {'mean': mean, 'sd': sd}
}

let standardize_matrix = function(X, standardization) {
    let Xt = numeric.transpose(X);
    let S = []
    for(let i = 0; i < Xt.length; i++) {
        let row_standardization = {
            "mean": standardization.mean[i],
            "sd": standardization.sd[i]
        };
        let standardized_row = standardize_vector(Xt[i], row_standardization);
        S.push(standardized_row);
    }
    return numeric.transpose(S);
}

let standardize_vector = function(v, standardization) {
    return v.map(x => (x - standardization.mean) / standardization.sd)
}


/* Basies for fitting basis expansion models. */

let basies = {

    polynomial_basis: function(d) {
        let basis = [];
        for(let i = 1; i <= d; i++) {
            basis.push(x => Math.pow(x, i));
        }
        return basis;
    },

    pl_spline_basis: function(knots) {
        let basis = [];
        basis.push(x => x);
        for(let i = 0; i < knots.length; i++) {
            basis.push(x => Math.max(x - knots[i], 0));
        }
        return basis;
    },

    quadratic_spline_basis: function(knots) {
        let basis = [];
        basis.push(x => x);
        basis.push(x => x*x);
        for(let i = 0; i < knots.length; i++) {
            basis.push(x => Math.pow(x - knots[i], 2)*((x - knots[i]) >= 0));
        }
        return basis
    },

    cubic_spline_basis: function(knots) {
        let basis = [];
        basis.push(x => x);
        basis.push(x => x*x);
        basis.push(x => x*x*x);
        for(let i = 0; i < knots.length; i++) {
            basis.push(x => Math.max(Math.pow(x - knots[i], 3), 0));
        }
        return basis
    },

    natural_cubic_spline_basis: function(knots) {
        n_knots = knots.length;
        let basis = [];
        basis.push(x => x);
        let ppart = (t => Math.max(t, 0))
        let cube = (t => t*t*t);
        let d = function(knot_idx) {
            return function(x) {
                return (
                    // Sure would be nice if this was scheme.
                    (cube(ppart(x - knots[knot_idx], 0)) 
                        - cube(ppart(x - knots[n_knots - 1], 0)))
                    / (knots[n_knots - 1] - knots[knot_idx]));
            };
        };
        for(let k = 0; k < n_knots - 2; k++) {
            basis.push(x => d(k)(x) - d(n_knots - 2)(x));
        }
        return basis
    }
}

let evaluate_basis_expansion = function(basis, xs) {
    return xs.map(x => basis.map(s => s(x)))
}

let make_spline_regression = function(spline_basis_function) {
    return function(parameters) {
        let n = Number(parameters["n"]);
        let knots = make_knots(n);
        let sp = spline_basis_function(knots);
        let lambda = Number(parameters["lambda"]);
        return make_basis_expansion_regression(sp, lambda);
    }
}

let make_knots = function(n) {
    return numeric.linspace(0, 1, n + 2).slice(1, n + 1);
}

let make_polynomial_regression = function(polynomial_basis_function) {
    return function(parameters) {
        let d = Number(parameters["degree"]);
        let p = polynomial_basis_function(d);
        let lambda = Number(parameters["lambda"]);
        return make_basis_expansion_regression(p, lambda);
    }
}

let make_basis_expansion_regression = function(basis, lambda) {
    return function(xs, ys) {
        let X = evaluate_basis_expansion(basis, xs);
        let ridge = fit_ridge_regression(X, ys, lambda);
        let smooth_value = function(newx) {
            // There is a small hack here.  After getting the basis
            // expansion, we have a vector.  We immediately wrap this in a
            // list, creating a one row matrix.  This allows us to use
            // standardize_matrix, avoiding duplication of some logic.
            let basis_expansion = [basis.map(s => s(newx))]
            let standardized_basis_expansion = 
                standardize_matrix(basis_expansion, ridge.Xsd)[0];
            return (
                numeric.dot(ridge.betas, standardized_basis_expansion) * ridge.ysd.sd
                + ridge.ysd.mean); 
        }
        return vectorize(smooth_value);
    };
}



/* A namespace for scatterplot smoother objects.

  Each smoother object has three attributes:

    - label: A short description of the smoother.  Appears in a select input
      field.
    - smoother: A smoother function.  Each smoother function has the form
          f(parameters)(xs, ys)
      where parameters is a dictionary containing the values of huperparameters
      for the smoother, and xs, ys are equal length vectors of x-coordinates
      and y-coordinates of data points to be smoothed.
    - parameters: Configuration objects for hyperparameters.  These are used
      to populate input slider elements.
*/
smoothers = {

    /* Trivial global mean smoother.

    Simply return the mean of the y values as the smoothed data.

    Hyperparamters: None
    */
    "smooth-type-mean": {

        "label": "Constant Mean",

        "smoother": function(parameters) {
            return function(xs, ys) {
                let mean = d3.mean(ys);
                return vectorize(x => mean)
            }
        },

        "parameters": []
    },

    /* Running mean smoother. 

    The smoothed value y at a given x is the mean value of the y data for
    those data with the closest k x data.

    Hyperparameters:
        k: Number of data points included in each side of the symmetric nbhd.
    */
    "smooth-type-runmean": {

        "label": "Running Mean",
    
        "smoother": function(parameters) {
            let k = Number(parameters["k"]);
            return function(xs, ys) {
                // Reorder xs and ys so that xs is in increasing order
                let psort = d3.zip(xs, ys).sort(function(a, b) {return a[0] - b[0]});
                let xsort = psort.map(p => p[0]);
                let ysort = psort.map(p => p[1]);
                let mean_of_symm_nbrd = function(newx) {
                    // TODO: Abstract out finding the local neighbourhood.
                    let pos_in_array = d3.bisect(xsort, newx);
                    // TODO: Check that you lined up the fenceposts.
                    let cutoffs = [
                        Math.max(0, pos_in_array - k), 
                        Math.min(xsort.length - 1, pos_in_array + k)
                    ];
                    return d3.mean(ysort.slice(cutoffs[0], cutoffs[1]));
                };
                return vectorize(mean_of_symm_nbrd);
            };
        },

        "parameters": [
            {"label": "Number of Neighbors", "name": "k",
             "min": 1, "max": 20, "step": 1, "default": 2}
        ]
    },

    /* Simple linear regression smoother. */
    "smooth-type-linreg": {

        "label": "Linear Regression",

        "smoother": function(parameters) {
            return function(xs, ys) {
                let linreg = linear_regressor(xs, ys);
                return vectorize(linreg);
            };
        },

        "parameters": []

    },


    /* Multi linear regression with a quadratic basis expansion and reidge
     *  regression shrinkage. 
     */
    "smooth-type-polyreg": {
    
        "label": "Polynomial Ridge Regression",

        "smoother": make_polynomial_regression(basies.polynomial_basis),

        "parameters": [
            {"label": "Polynomial Degree", "name": "degree",
             "min": 1, "max": 20, "step": 1, "default": 2},
            {"label": "Ridge Shrinkage", "name": "lambda",
             "min": 0, "max": .01, "step": .00001, "default": 0}
        ]

    },

    // Gaussian kernel smoother.
    "smooth-type-gaussk": {

        "label": "Gaussian Kernel Smoother",

        "smoother": function(parameters) {
            let lambda = Number(parameters["lambda"]);
            return function(xs, ys) {
                let gauss_kern_smooth = function(x) {
                    let ds = xs.map(function(xi) {return x - xi;});
                    let ws = ds.map(function(di) {return Math.exp(-di*di/lambda);});
                    let normc = d3.sum(ws); 
                    let normws = ws.map(function(wi) {return wi / normc;});
                    return d3.sum(d3.zip(normws, ys).map(function(p) {return p[0]*p[1]}));
                };
                return vectorize(gauss_kern_smooth)
            };
        },

        "parameters": [
            {"label": "Width of Kernel", "name": "lambda",
             "min": .001, "max": .05, "step": .001, "default": .01}
        ]

    },

    /* Running line smoother.
     * To calculate the smoothed value of y at a given x, first take together the
     * k data points closest to x.  Then fit a simple linear regression to these k
     * data points.  The smoothed value of y is the prediction made from this
     * linear regressor.
     */
    "smooth-type-runline": {

        "label": "Running Line",

        "smoother": function(parameters) {
            let k = Number(parameters["k"]);
            return function(xs, ys) {
                // Reorder xs and ys so that xs is in increasing order
                let psort = d3.zip(xs, ys).sort(function(a, b) {return a[0] - b[0]});
                let xsort = psort.map(function(p) {return p[0]});
                let ysort = psort.map(function(p) {return p[1]});
                let loc_lin_approx = function(newx) {
                    let pos_in_array = d3.bisect(xsort, newx);
                    // TODO: Check that you lined up the fenceposts.
                    let cutoffs = [
                        Math.max(0, pos_in_array - k), 
                        Math.min(xsort.length, pos_in_array + k)
                    ];
                    let locx =  xsort.slice(cutoffs[0], cutoffs[1]);
                    let locy =  ysort.slice(cutoffs[0], cutoffs[1]);
                    return linear_regressor(locx, locy)(newx);
                }
                return vectorize(loc_lin_approx);
            };
        },

        "parameters": [
            {"label": "Number of Neighbors", "name": "k",
             "min": 2, "max": 20, "step": 1, "default": 2}
        ]

    },

    "smooth-type-pl": {

        "label": "Piecewise Linear Spline (Fixed Knots)",

        "smoother": make_spline_regression(basies.pl_spline_basis),

        "parameters": [
            {"label": "Number of Knots", "name": "n",
             "min": 2, "max": 10, "step": 1, "default": 2},
            {"label": "Ridge Shrinkage", "name": "lambda",
             "min": 0, "max": .1, "step": .0001, "default": 0}
        ],

        "knot_function": make_knots
    },

    "smooth-type-quad": {

        "label": "Quadratic Spline (Fixed Knots)",

        "smoother": make_spline_regression(basies.quadratic_spline_basis),

        "parameters": [
            {"label": "Number of Knots", "name": "n",
             "min": 2, "max": 10, "step": 1, "default": 2},
            {"label": "Ridge Shrinkage", "name": "lambda",
             "min": 0, "max": .01, "step": .00001, "default": 0}
        ],

        "knot_function": make_knots
    },

    "smooth-type-spline": {

        "label": "Cubic Spline (Fixed Knots)",

        "smoother": make_spline_regression(basies.cubic_spline_basis),

        "parameters": [
            {"label": "Number of Knots", "name": "n",
             "min": 2, "max": 10, "step": 1, "default": 2},
            {"label": "Ridge Shrinkage", "name": "lambda",
             "min": 0, "max": .001, "step": .000001, "default": 0}
        ],

        "knot_function": make_knots
    },

    "smooth-type-natural-spline": {

        "label": "Natural Cubic Spline (Fixed Knots)",

        "smoother": make_spline_regression(basies.natural_cubic_spline_basis),

        "parameters": [
            {"label": "Number of Knots", "name": "n",
             "min": 2, "max": 10, "step": 1, "default": 3},
            {"label": "Ridge Shrinkage", "name": "lambda",
             "min": 0, "max": .001, "step": .000001, "default": 0}
        ],

        "knot_function": make_knots
    }


/*
    // Locally weighted linear regression smoother.
    "smooth-type-loess": function(xs, ys) {
        let k = 5
        let loess = function(x) {
            // Sort by increasing absolute distance from x.
            let psort = d3.zip(xs, ys).sort(function(a, b) {
                return Math.abs(x - a[0]) - Math.abs(x - b[0])}
            );
            let xsort = psort.map(function(p) {return p[0]}).slice(0, 7);
            let ysort = psort.map(function(p) {return p[1]}).slice(0, 7);
            let nearest_nbrs = psort.slice(0, 7);
            let ds = nearest_nbrs.map(function(p) {return Math.abs(p[0] - x)});
            let dsmax = d3.max(ds);
            let ws = ds.map(function(d) {
                return Math.pow(1 - d*d*d, 3) / (dsmax * dsmax * dsmax)
            });
            return weighted_linear_regressor(xsort, ysort, ws)(x);
        };
        return vectorize(loess)
    },
*/
};
