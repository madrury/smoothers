/* Create html markup for an input slider element. */
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
 */
let parameter_ui = function() {

    element = null;

    return {

        msg_queue: [],

        /* Bind the parameter-ui to a DOM element. */
        bind: function(e) {
            element = e;
        },

        clear: function() {
            element.innerHTML = '';
        },

        add_parameters: function(parameter_list) {
           // Create slider input elements for each parameter associated to a smoother.
           let parameter = null;
           for(let i = 0; i < parameter_list.length; i++) {
                parameter = parameter_list[i];
                element.innerHTML += make_input_slider(
                    parameter.label, parameter.name,
                    parameter.min, parameter.max, parameter.step,
                    parameter.default)
            }
            // Add event listeners to all the input sliders.
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

        add_parameters_to_queue: function(queue) {
            let parameters = this.get_selected_parameters(); 
            queue.push(parameters);
        },

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

        display_selected_parameter: function(slider_name) {
            let parameters = this.get_selected_parameters();
            let parameter_value_id = "parameter-value-" + slider_name;
            let value_span = document.getElementById(parameter_value_id);
            value_span.innerHTML = parameters[slider_name];
        }

    }

}
