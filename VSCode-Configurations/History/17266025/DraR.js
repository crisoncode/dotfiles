
const configurations = {
    shippingBlockContainerSelector: '.js-shipping-info-container'
};

function refreshShippingInfo(html) {
    $(configurations.shippingBlockContainerSelector).html(html);
}
