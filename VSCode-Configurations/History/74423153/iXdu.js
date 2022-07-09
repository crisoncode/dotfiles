'use strict'

/**
 * fake method
 * @param {dw.order.Order} order
 * @returns {dw.order.ProductLineItem} result
 */
function getFakeProductFromOrder(order) {
    let plis = order.getProductLineItems();
    let result = null;
    for(let pli of plis) {
        if (pli.custom.isFakeProduct) {
            result = pli;
        }
    }
    return result;
}

module.exports = {
    getFakeProductFromOrder: getFakeProductFromOrder
};
