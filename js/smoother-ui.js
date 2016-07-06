let smoother_ui = function(smoothers) {

    let element = null;

    return {

        /* Message queue for the controller. */
        msg_queue: [],

        /* Bind the smoother UI to a select input dom element, render the possible
         * selections, and then listen for changes. 
         */
        bind: function(e) {
            // TODO: assert that e is an select input.
            element = e;
            for(let smooth_type in smoothers) {
                if(smoothers.hasOwnProperty(smooth_type)) {
                    element.innerHTML += '<option value="' + smooth_type + '">' + 
                                         smoothers[smooth_type]["label"] + 
                                         '</option>';
                }
            }
            // Bind a listener for change events.
            let that = this;
            element.addEventListener("change", function() {
                let smoother = that.get_selected_smoother()
                that.msg_queue.push({"smoother-change": smoother});
            })
        },

        get_selected_smoother: function() {
            return element.options[element.selectedIndex].value;
        }
   
    };

}
