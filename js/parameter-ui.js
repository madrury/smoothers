/* Create html markup for an input slider element to control the selection of a
   hyperparameter for a smoothing algorithm.

   For example:
   
    <div class="input-slider">
      <span>Number of Knots:</span>
      <input type="range" 
            id="parameter-slider-n" 
            name="n" 
            class="parameter-slider" 
            min="2" 
            max="10" 
            step="1" 
            value="2">
      <span id="parameter-value-n">2</span>
    </div>
*/
let make_input_slider = function(label, id, min, max, step, default_value) {
    return '<div class=input-slider>' +
                '<span>' + label + ':</span>' +
                '<input type="range" id="parameter-slider-' + id + 
                                '" name="' + id +
                                '" class="parameter-slider" min="' + min +
                                '" max="' + max + 
                                '" step="' + step + 
                                '" value="' + default_value +
                                '">' +
                    '<span id="parameter-value-' + id + '"></span>' +
            '</div>';
}

/* User interface for hyper-parameter selection.

   This interface contains (possibly) multiple input sliders that allow a user
   to select hyperparameters for the currently selected smoothing algorithm.

   Each smoothing algorithm has a different specification for which
   hyperparameters are available, and what the possible range of values for
   each hyperparameter is.  This object manages creating, destorying, and
   inspecting the interface elements needed for each hyperparameter.
 */
let parameter_ui = function() {

    /* Html element ui is bound to. */
    element = null;

    return {

        /* Message queue for the controller object. */
        msg_queue: [],

        /* Bind the parameter-ui to a DOM element. */
        bind: function(e) {
            element = e;
        },

        /* Destroy all the html elements associated with the parameter
           interface.
        */
        clear: function() {
            element.innerHTML = '';
        },

        /* Add interface elements for each hyperparameter defined in a list of
         * specifications. */
        add_parameters: function(parameter_list) {
           /* Create slider input elements for each parameter associated to a
              smoother. */
           let parameter_spec = null;
           for(let i = 0; i < parameter_list.length; i++) {
                parameter_spec = parameter_list[i];
                element.innerHTML += make_input_slider(
                    parameter_spec.label, parameter_spec.name,
                    parameter_spec.min, parameter_spec.max, parameter_spec.step,
                    parameter_spec.default)
            }
            /* Add event listeners to all the input sliders. */
            let sliders = document.getElementsByClassName("parameter-slider");
            let that = this;
            for(let i = 0; i < sliders.length; i++) {
                let slider_name = sliders[i].getAttribute("name");
                sliders[i].addEventListener('change', function() {
                    that.display_selected_parameter(slider_name);
                    that.add_parameters_to_queue(that.msg_queue);
                });
                // Force display of selected value when first displayed.
                that.display_selected_parameter(slider_name);
            }
        },

        /* Add the parameters selected in each interface slider to the
           msg_queue.
        */
        add_parameters_to_queue: function(queue) {
            let parameters = this.get_selected_parameters(); 
            queue.push(parameters);
        },

        /* Get all the currently selected values in the input sliders.
        */
        get_selected_parameters: function() {
            let parameters = {};
            let sliders = document.getElementsByClassName("parameter-slider");
            let slider = null;
            for(let i = 0; i < sliders.length; i++) {
                slider = sliders[i];
                parameters[slider.getAttribute("name")] = Number(slider.value);
            }
            return parameters;
        },

        /* Display the currently selected value in the input sliders.
        */
        display_selected_parameter: function(slider_name) {
            let parameters = this.get_selected_parameters();
            let parameter_value_id = "parameter-value-" + slider_name;
            let value_span = document.getElementById(parameter_value_id);
            value_span.innerHTML = parameters[slider_name];
        }

    }

}
