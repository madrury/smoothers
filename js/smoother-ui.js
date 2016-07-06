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
                    e.innerHTML += '<option value="' + smooth_type + '">' + 
                                   smoothers[smooth_type]["label"] + 
                                   '</option>';
                }
            }
            // Bind a listener for change events.
            let that = this;
            e.addEventListener("change", function() {
                let smoother = e.options[e.selectedIndex].value;
                console.log(that);
                that.msg_queue.push({"smoother-change": smoother});
            })
        },
   
    };

}
