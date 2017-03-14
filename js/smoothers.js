/*********************/
/* Helper Functions. */
/*********************/

/* Compute the dot product of two vectors. */
let dot = function(v1, v2) {
    let s = 0;
    for(let i = 0; i < v1.length; i++) {
        s += v1[i] * v2[i];
    }
    return s
}

/* Construct a linear function given a slope and an intercept. */
let linear_function = function(m, b) {
    return function(x) {
        return b + m * x;
    }
}

/* Compute the weighted mean of x with weights w.  Weights may be
   un-normalized.
*/
let wmean = function(x, w) {
    let r = [];
    for(i = 0; i < x.length; i++) {
        r.push(x[i]*w[i]);
    }
    return d3.sum(r) / d3.sum(w);
}

/* The sum of squared errors of a data set when making a prediction equal
   to the mean.
*/
let sum_of_squared_errors = function(xs) {
    return xs.map(x => x - d3.mean(xs)).map(x => x*x).reduce((a, b) => a + b, 0);
}

/* Fit a simple linear regression on data (ys, xs).

   This returns a linear function, i.e. the prediction function from the
   fit linear regression.
*/
let linear_regressor = function(xs, ys) {
    let xmean = d3.mean(xs);
    let ymean = d3.mean(ys);
    let xymean = d3.mean(d3.zip(xs, ys).map(p => p[0]*p[1]));
    let xsqmean = d3.mean(d3.zip(xs, xs).map(p => p[0]*p[1]));
    let beta = (xymean - xmean * ymean) / (xsqmean - xmean * xmean);
    let intercept = ymean - beta * xmean;
    return linear_function(beta, intercept);
};

/* Simple linear regression with sample weights. */
let weighted_linear_regressor = function(xs, ys, ws) {
    let xmean = wmean(xs, ws);
    let ymean = wmean(ys, ws);
    let xymean = wmean(d3.zip(xs, ys).map(p => p[0]*p[1]), ws);
    let xsqmean = wmean(d3.zip(xs, xs).map(p => p[0]*p[1]), ws);
    let beta = (xymean - xmean * ymean) / (xsqmean - xmean * xmean);
    let betaz = ymean - beta * xmean;
    return linear_function(beta, betaz)
};

/* Given a function from numbers to numbers, return one that maps arrays to
   arrays through mapping.
*/
let vectorize = function(f) {
    return function(arr) {
        return arr.map(f)
    }
}

/* Undo a zip operation */
let unzip = function(ps, i) {
    return ps.map(p => p[i]);
}

/* Sort ordered pairs of x, y data by x. */
let sort_data = function(xs, ys) {
    let psort = d3.zip(xs, ys).sort(function(a, b) {return a[0] - b[0]});
    let xsort = unzip(psort, 0);
    let ysort = unzip(psort, 1);
    return [xsort, ysort];
}


/*******************************************/
/* Ridge Regression with Basis Expansions. */
/*******************************************/

/* Fit a ridge regression to data X and response ys with regularization
   strength lambda.

   This returns an object containing the data needed to score the fitted
   regression:
   
   {
       "betas": <array of standardized parameter estiamtes>,
       "Xsd": <standardizer data for X>,
       "ysd": <standardizer data for y>
   }
*/
let fit_ridge_regression = function(X, ys, lambda) {

    /* Construct a square matrix of size n with lambdas along the main
       diagonal, and a zero in the (0, 0) position.  This type of matrix is
       useful in ridge regression.
    */
    let make_ridge_shrinkage_matrix = function(n, lambda) {
        let shrink_matrix = numeric.diag(numeric.rep([n + 1], lambda));
        /* Dont shrink the linear term in basis expansion regressions. */
        shrink_matrix[0][0] = 0;
        return shrink_matrix
    }

    /* Compute the translation and scale factors necessary to standardize the
      columns of a matrix.

      This returns an object with two attributes:

      { "mean": [<array of translation factors>],
        "sd": [<array of scale factors>] }
    */
    let compute_matrix_standardization = function(X) {
        let standardization = {"mean": [], "sd": []};
        /* It is easier to iterate over the rows of a matrix than the columns. */
        let Xt = numeric.transpose(X);
        for(let i = 0; i < Xt.length; i++) {
            let standardized_row = compute_vector_standardization(Xt[i]);
            standardization.mean.push(standardized_row.mean);
            standardization.sd.push(standardized_row.sd);
        }
        return standardization;
    }

    /* Compute the translation and scale factor necessary to standardize a
      vector.

      This returns an object with two attributes:

      {"mean": <mean of vector>, "sd": <standard deviation of vector>}
    */
    let compute_vector_standardization = function(v) {
        let mean = d3.mean(v);
        let sd = d3.deviation(v);
        return {'mean': mean, 'sd': sd}
    }

    let X_standardization = compute_matrix_standardization(X);
    let Xsd = standardize_matrix(X, X_standardization);
    let y_standardization = compute_vector_standardization(ys);
    let ysd = standardize_vector(ys, y_standardization);
    // Compute the regression.
    let Xsdt = numeric.transpose(Xsd);
    let XtX = numeric.dot(Xsdt, Xsd);
    let Xty = numeric.dot(Xsdt, ysd);
    let shrink_matrix = make_ridge_shrinkage_matrix(X[0].length, lambda);
    console.log(shrink_matrix);
    let betas = numeric.solve(numeric.add(XtX, shrink_matrix), Xty);
    return {
        "betas": betas,
        "Xsd": X_standardization,
        "ysd": y_standardization
    }
}

/* Apply standardization data to a matrix.  Returns a standardized version
   of the matrix, i.e. a matrix with standardized columns.
*/
let standardize_matrix = function(X, standardization) {
    /* It is easier to iterate over the rows of a matrix than the columns. */
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

/* Apply standardization data to a vector. */
let standardize_vector = function(v, standardization) {
    return v.map(x => (x - standardization.mean) / standardization.sd)
}


/* Basies for fitting basis expansion models. 

   A basis is a linearly independent sequence of functions [f_1, f_2, ..., f_k].
   A basis expansion is a transformation of a vector v into a matrix..  The
   columns of the basis expanded matrix are created by mapping each of the
   functions in the basis expansion over the vector in turn.
*/
let basies = {

    /* Polynomial basis expansion.

         x -> [1, x, x^2, ...]
    */
    polynomial_basis: function(d) {
        let basis = [];
        for(let i = 1; i <= d; i++) {
            basis.push(x => Math.pow(x, i));
        }
        return basis;
    },

    /* Piecewise linear spline basis.

       This basis depends on a sequence of knots: k_1, k_2, ...
       The basis expansion is given by the sequence of functions
       x -> max(0, x - k_i).

       Models fit using a PL basis expansion as predictors result in piecewise
       linear prediction functions.
    */
    pl_spline_basis: function(knots) {
        let basis = [];
        basis.push(x => x);
        for(let i = 0; i < knots.length; i++) {
            basis.push(x => Math.max(x - knots[i], 0));
        }
        return basis;
    },

    /* Quadratic spline basis function.

       This basis depends on a sequence of knots: k_1, k_2, ...

       Models fit with a quadratic spline basis expansion as predictors reult
       in a peicewise quadratic prediction function.
    */ 
    quadratic_spline_basis: function(knots) {
        let basis = [];
        basis.push(x => x);
        basis.push(x => x*x);
        for(let i = 0; i < knots.length; i++) {
            basis.push(x => Math.pow(x - knots[i], 2)*((x - knots[i]) >= 0));
        }
        return basis
    },

    /* Cubic spline (unrestricted) basis function.

       This basis depends on a sequence of knots: k_1, k_2, ...

       Models fit with a cubic spline basis expansion as predictors reult
       in a peicewise cubic prediction function.
    */ 
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

    /* Natural cubic spline (unrestricted) basis function.

       This basis depends on a sequence of knots: k_1, k_2, ...

       Models fit with a natural cubic spline basis expansion as predictors
       reult in a peicewise cubic prediction function, but with the extra
       feature that the function is linear outside of the leftmost and
       rightmost knots.
    */ 
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

/* Construct a regression operator given a basis of functions, and a
   regularization strength.

   This constructs a function witht he following signature:
       (xs, ys) => (x => _)
   I.e. a function that consumes data, and returns a prediction function.
   The prediction function is constructed by fitting a ridge regression
   on the data (xs, ys) after applying the given basis expansion.
*/
let make_basis_expansion_regression = function(basis, lambda) {

    /* Map a basis expansion across a vector. The result is a vector. */
    let evaluate_basis_expansion = function(basis, xs) {
        return xs.map(x => basis.map(s => s(x)))
    }

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

/* Consume a basis expansion representing a spline basis, and return a function
   that consumes a object of parameters (the only parameter being the number of
   knots), and returns a basis expansion regression (See definition above).

   I.e., the signature of this function is:

   basis => (parameters => ((xs, ys) => (x => _)))
*/
let make_spline_regression = function(spline_basis_function) {

    return function(parameters) {
        let n = Number(parameters["n"]);
        let knots = make_knots(n);
        let sp = spline_basis_function(knots);
        let lambda = Number(parameters["lambda"]);
        return make_basis_expansion_regression(sp, lambda);
    }
}

/* Make a set of equally spaced knots in the interval [0, 1] */
let make_knots = function(n) {
    return numeric.linspace(0, 1, n + 2).slice(1, n + 1);
}

/* Consume a basis expansion representing a polynomial basis, and return a
   function that consumes a object of parameters (the only parameter being the
   degree), and returns a basis expansion regression (See definition above).

   I.e., the signature of this function is:

   basis => (parameters => ((xs, ys) => (x => _)))
*/
let make_polynomial_regression = function(polynomial_basis_function) {
    return function(parameters) {
        let d = Number(parameters["degree"]);
        let p = polynomial_basis_function(d);
        let lambda = Number(parameters["lambda"]);
        return make_basis_expansion_regression(p, lambda);
    }
}


/********************/
/* Regression Trees */
/********************/

/* Construct a function that fits regression trees of a specified depth.

   Returns a function ((xs, ys) => (x => _)) that fits a regression tree
   to the supplied xs, ys data.
*/
let make_regression_tree = function(parameters) {
    let depth = Number(parameters["depth"]);
    return function(xs, ys) {
        /* We sort the data once up front, it will stay sorted as we
           decend the tree.
        */
        let [xsorted, ysorted] = sort_data(xs, ys);
        let tree = fit_regression_tree(xsorted, ysorted, depth);
        let regression_tree_predict_pointwise = function(x) {
            return score_regression_tree(x, tree);
        }
        return vectorize(regression_tree_predict_pointwise);
    }
}

/* Fit a regression tree to data of a specified depth.

   Returns a simple object (informally of type tree) representing a fit
   regression tree.  A tree object has the following shape.

    {
        "is_leaf": <boolean: is this tree a lead node?>,
        "value": <float: The value to predict in this node, if a leaf>,
        "left_child_condition": <function: f(x) answers "is x in the reigon
                                 defined by the left child node>
        "left_child": <tree: A fit regression tree to those xs, ys in the left
                       child>,
        "right_child": <tree: A fit regression tree to those xs, ys in the
                        right child>,
    }

    The field "value" is only defined for leaf nodes.  The fields
    "left_child_condition", "left_child", and "right_child" are only defined if
    *not* a lead node.
*/
let fit_regression_tree = function(xs, ys, depth) {
    if(depth === 0 || ys.length <= 1) {
        /* Base case step. */
        let tree = make_tree_object();
        tree.is_leaf = true;
        tree.value = d3.mean(ys);
        return tree;
    } else {
        /* Recursive step. */
        let split = compute_split_point(xs, ys);
        let condition = function(x) {return x <= split}
        let ps = d3.zip(xs, ys);
        let left_data = ps.filter(p => condition(p[0]));
        let right_data = ps.filter(p => !condition(p[0]));
        /* Construct and return the tree */
        let tree = make_tree_object();
        tree.left_child_condition = condition;
        tree.left_child = fit_regression_tree(
            unzip(left_data, 0), unzip(left_data, 1), depth - 1);
        tree.right_child = fit_regression_tree(
            unzip(right_data, 0), unzip(right_data, 1), depth - 1);
        return tree;
    }
}


/* Construct an empty tree object. */
let make_tree_object = function() {
    return {
        "is_leaf": false,
        "left_child_condition": null,
        "left_child": null,
        "right_child": null,
        "value": null
    }
}

/* Compute the optimal split point in data xs, ys.

   The split point is the midpoint between two data points, so that grouping
   the ys data into those left of and right of the split point produces the
   least total varaince.

   Note: This function assumes that the xs, ys data is sorted in increasing
         xs order.
*/
let compute_split_point = function(xs, ys) {
    let best_sosd = Infinity;
    let best_split = null;
    for(let i = 1; i <= ys.length - 1; i++) {
        let left_ys = ys.slice(0, i);
        let right_ys = ys.slice(i, ys.length);
        let this_sosd = sum_of_squared_errors(left_ys) + 
                        sum_of_squared_errors(right_ys);
        if(this_sosd <= best_sosd) {
            best_sosd  = this_sosd;
            best_split = (xs[i-1] + xs[i]) / 2;
        }
    }
    return best_split;
}

/* Generate a predictor from a regression tree at a point x */
let score_regression_tree = function(x, tree) {
    if(tree.is_leaf == true) {
        return tree.value;
    } else {
        if(tree.left_child_condition(x)) {
            return score_regression_tree(x, tree.left_child);
        } else {
            return score_regression_tree(x, tree.right_child);
        }
    }
}


/*********************/
/* Gradient Boosting */
/*********************/

/* Construct a function that fits a gradient boosted regression.

   Returns a function ((xs, ys) => (x => _)) that fits a gradient booster
   to the supplied xs, ys data.
*/
let make_boosted_model = function(parameters) {
    let learning_rate = Number(parameters["learning_rate"]);
    let n_trees = Number(parameters["n_trees"]);
    let tree_depth = Number(parameters["tree_depth"]);
    return function(xs, ys) {
        let [xsorted, ysorted] = sort_data(xs, ys);
        let booster = fit_boosted_model(xs, ys, n_trees, learning_rate, tree_depth);
        let boosted_model_predict_pointwise = function(x) {
            return score_boosted_model(x, booster);
        }
        return vectorize(boosted_model_predict_pointwise);
    }
}

/* Fit a gradient boosted regression to data of a specified depth.

   Returns a simple object (informally of type booster) representing a fit
   boosted model.  A booster object has the following shape.

   {
       "intercept": <The mean of the training data, used as the 0'th
                     boosting stage>,
       "trees": [<Array of tree objects, the boosting stages>],
       "learning_rate": <The learning rate of the boosted model>
   }
*/
let fit_boosted_model = function(xs, ys, n_trees, learning_rate, tree_depth) {
    let boosted_model = new_boosted_model();
    boosted_model.learning_rate = learning_rate;
    let working_ys = ys.slice(); // Copy.
    /* Fit the first stage */
    boosted_model.intercept = d3.mean(ys);
    working_ys = working_ys.map(y => y - boosted_model.intercept);
    /* Boost */
    for(let i = 0; i <= n_trees; i++) {
        let tree = fit_regression_tree(xs, working_ys, tree_depth);
        working_ys = 
            d3.zip(xs, working_ys)
              .map(p => p[1] - learning_rate * score_regression_tree(p[0], tree));
        boosted_model.trees.push(tree);
    }
    return boosted_model;
}

/* Construct a booster object. */
let new_boosted_model = function() {
    return {"intercept": null, "trees": [], "learning_rate": null};
}

/* Make predictions on a new datapoint from a booster object. */
let score_boosted_model = function(x, booster) {
    let y_hat = booster.intercept;
    for(let i = 0; i < booster.trees.length; i++) {
        y_hat += booster.learning_rate * score_regression_tree(x, booster.trees[i]);
    }
    return y_hat;
}

/************************/
/* Smoothing Algorithms */
/************************/

/* A namespace for scatterplot smoother objects.

  Each smoother object has three attributes:

    - label: A short description of the smoother.  Appears in a select input
      field.
    - smoother: A smoother function.  Each smoother function has the form

          parameters => ((xs, ys) => (x => _))

      where parameters is a dictionary containing the values of huperparameters
      for the smoother, and xs, ys are equal length vectors of x-coordinates
      and y-coordinates of data points to be smoothed.
    - parameters: Configuration objects for hyperparameters.  These are used
      to populate input slider elements in the user interface.
*/
let smoothers = {

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
                let [xsort, ysort] = sort_data(xs, ys);
                let mean_of_symm_nbrd = function(newx) {
                    let pos_in_array = d3.bisect(xsort, newx);
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

    /* Simple linear regression smoother. 
    
    Hyperparameters:
        None.
    */
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

    /* Gaussian kernel smoother.

    Hyperparmeters:
        lambda: Width of the gaussian kernel.
    */
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

       To calculate the smoothed value of y at a given x, we first take
       together the k data points closest to x.  Then fit a simple linear
       regression to these k data points.  The smoothed value of y is the value
       f(x), where f is the prediction function of this linear regression.

    Hyperparameters:
        k: The number of neighbours to consider when fitting the local linear
           regressions.
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

    /* Ridge regression with a polynomial basis expansion.

    Hyperparameters:
        degree: The maximum degree of polynomial in the basis.
        lambda: The ridge regularization strength.
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

    /* Ridge regression with a piecewise linear basis expansion.

    Hyperparameters:
        n: The number of knots to use in the PL basis.
        lambda: The ridge regularization strength.
    */
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

    /* Ridge regression with a piecewise quadratic basis expansion.

    Hyperparameters:
        n: The number of knots to use in the basis.
        lambda: The ridge regularization strength.
     */
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

    /* Ridge regression with a piecewise cubic (unrestricted) basis expansion.

    Hyperparameters:
        n: The number of knots to use in the basis.
        lambda: The ridge regularization strength.
    */
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

    /* Ridge regression with a natural cubic spline basis expansion.

    Hyperparameters:
        n: The number of knots to use in the basis.
        lambda: The ridge regularization strength.
    */
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
    },

    /* Regression tree smoother.

    Hyperparameters:
        depth: The maximum depth in the fit tree.  The final tree has 2**depth
               leaf nodes.
    */
    "smooth-type-regression-tree": {
    
        "label": "Regression Tree",

        "smoother": make_regression_tree,

        "parameters": [
            {"label": "Maximum Tree Depth", "name": "depth",
             "min": 0, "max": 7, "step": 1, "default": 1}
        ]
    },

    /* Gradient boosting to minimize the sum of squared errors.

    Hyperparameters:
        n_trees: The number of boosting stages.
        learning_rate: Learning rate.
        tree_depth: The maximum depth of the individual trees.
    */
    "smooth-type-boosting": {
    
        "label": "Gradient Boosting Regression",

        "smoother": make_boosted_model,

        "parameters": [
            {"label": "Number of Boosting Stages", "name": "n_trees",
             "min": 0, "max": 250, "step": 1, "default": 5},
            {"label": "Learning Rate", "name": "learning_rate",
             "min": 0, "max": 1, "step": 0.01, "default": 0.05},
            {"label": "Maximum Tree Depth", "name": "tree_depth",
             "min": 0, "max": 7, "step": 1, "default": 1}
        ]
    },
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
