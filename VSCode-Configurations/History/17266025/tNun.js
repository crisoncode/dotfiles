
const configurations = {
    shippingBlockContainerSelector: '.js-shipping-info-container'
};

/**
 * Refereshing HTML for the shipping block when an user selects a variant.
 * @param {String} html
 */
function refreshShippingInfo(html) {
    $(configurations.shippingBlockContainerSelector).html(html);
}
