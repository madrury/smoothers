/* Create html markup for an input slider element. */
let make_input_slider = function(id, min, max, step) {
    return '<span>' + id + ':</span>' +
           '<input type="range" id="parameter-slider-' + id + 
                        '" name="' + id +
                        '" class="parameter-slider" min="' + min +
                        '" max="' + max + 
                        '" step="' + step + '">';
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
                    parameter.name, parameter.min, parameter.max, parameter.step)
            }
            // Add event listeners to all the input sliders.
            let sliders = document.getElementsByClassName("parameter-slider");
            let that = this;
            for(let i = 0; i < sliders.length; i++) {
                sliders[i].addEventListener('change', 
                    function() {that.add_parameters_to_queue(that.msg_queue)});
            }
        },

        add_parameters_to_queue: function(queue) {
            let parameters = {};
            let sliders = document.getElementsByClassName("parameter-slider");
            let slider = null;
            for(let i = 0; i < sliders.length; i++) {
                slider = sliders[i];
                parameters[slider.getAttribute("name")] = Number(slider.value);
            }
            queue.push(parameters);
        }

    }

}
