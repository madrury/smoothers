let slider_interface = function(name, msg, min, max, step, selected) {
    
    let element_id = null;
    let elem = null;
    let slider = null;

    return {

        "bind_to_element": function(e) {
            element_id = "div-slider-" + name;
            slider_id = "slider-" + name;
            e.innerHTML = '<div id="' + element_id + '">' +
                            '<span>' + msg + ':</span>' +
                            '<input type="range" id="' + slider_id + 
                                    '"min="' + min +
                                    '"max="' + max + 
                                    '"step="' + step + '">' +
                          '</div>';
            elem = document.getElementById(element_id);
            slider = document.getElementById(slider_id);
        },

        "destroy": function(e) {
            elem.parentNode.removeChild(elem);
            element_id = null;
            elem = null;
        },

        "get_selection": function() {
            return Number(slider.value)
        }

    }
};
