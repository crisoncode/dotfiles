
const configurations = {
    shippingBlockContainerSelector: '.js-shipping-info-container'
};

/**
 * Refereshing HTML for the shipping block when an user selects a variant.
 * @param {string} html that contains the current info for the selected variant.
 */
function refreshShippingInfo(html) {
    $(configurations.shippingBlockContainerSelector).html(html);
}


module.exports = {
    refreshShippingInfo: refreshShippingInfo
};
