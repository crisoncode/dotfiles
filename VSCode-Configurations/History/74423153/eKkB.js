'use strict'

/**
 * fake method
 * @param {dw.order.Order} order
 */
function getFakeProductFromOrder(order) {
    let plis = order.getProductLineItems();

    for(let pli of plis) {
        if (pli.custom.isFakeProduct) {
            return pli;
        }
    }
}

export.modules
