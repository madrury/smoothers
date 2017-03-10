/* User interface for smoothing algorithm selection.

   This interface contains two components:
     - A select element containing all the currently available smoothing
       algorithms.
     - A clear button.
*/
let smoother_ui = function(smoothers) {

    /* DOM elements for binding interface components. */
    let element_select = null;
    let element_clear = null;


    return {

        /* Message queue for the controller. */
        msg_queue: [],

        /* Bind the interface components to DOM elements. */
        bind: function(e_select, e_clear) {
            this.bind_select(e_select);
            this.bind_clear(e_clear);
        },

        /* Bind the algorithm selection component to a select element in the
           DOM, populate with all the possible smoothing algoriths, and create
           an event listener to handle change events.
        */
        bind_select: function(element_select) {
            /* Create an <option> for each supported smoothing algorithm. */
            for(let smooth_type in smoothers) {
                if(smoothers.hasOwnProperty(smooth_type)) {
                    element_select.innerHTML += '<option value="' + smooth_type + '">' + 
                                         smoothers[smooth_type]["label"] + 
                                         '</option>';
                }
            }
            /* Bind a listener for change events. */
            let that = this;
            element_select.addEventListener("change", function() {
                let smoother = that.get_selected_smoother();
                that.msg_queue.push({"smoother-change": smoother});
            })
        },

        /* Get the name of the smoothing algorithm currently selected. */
        get_selected_smoother: function() {
            return element_select.options[element_select.selectedIndex].value;
        }

        /* Bind the canvas clear component to a button element in the DOM. */ 
        bind_clear: function(element_clear) {
            let that = this;
            element_clear.addEventListener("click", function() {
                let smoother = that.get_selected_smoother();
                that.msg_queue.push({"smoother-clear": null});
            })
        }

    };

}
