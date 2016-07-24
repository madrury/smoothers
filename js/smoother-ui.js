let smoother_ui = function(smoothers) {

    let element_select = null;
    let element_clear = null;

    return {

        /* Message queue for the controller. */
        msg_queue: [],

        /* Bind the smoother UI to a select input dom element_select, render the possible
         * selections, and then listen for changes. 
         */
        bind: function(e_select, e_clear) {
            this.bind_select(e_select);
            this.bind_clear(e_clear);
        },

        bind_select: function(e) {
            // TODO: assert that e is an select input.
            element_select = e;
            for(let smooth_type in smoothers) {
                if(smoothers.hasOwnProperty(smooth_type)) {
                    element_select.innerHTML += '<option value="' + smooth_type + '">' + 
                                         smoothers[smooth_type]["label"] + 
                                         '</option>';
                }
            }
            // Bind a listener for change events.
            let that = this;
            element_select.addEventListener("change", function() {
                let smoother = that.get_selected_smoother();
                that.msg_queue.push({"smoother-change": smoother});
            })
        },

        bind_clear: function(e) {
            // TODO: assert that e is a button.
            element_clear = e;
            let that = this;
            element_clear.addEventListener("click", function() {
                let smoother = that.get_selected_smoother();
                that.msg_queue.push({"smoother-clear": null});
            })
        },

        get_selected_smoother: function() {
            return element_select.options[element_select.selectedIndex].value;
        }
   
    };

}
