'use strict';

var DEFAULT_MAX_ORDER_QUANTITY = 9;
var Logger = require('dw/system/Logger');
var inventoryLogger = Logger.getLogger('inventoryinfo', 'inventoryinfo');

module.exports = function (object, product, quantity) {
    Object.defineProperty(object, 'selectedQuantity', {
        enumerable: true,
        value: parseInt(quantity, 10) || (product && product.minOrderQuantity ? product.minOrderQuantity.value : 1)
    });
    Object.defineProperty(object, 'minOrderQuantity', {
        enumerable: true,
        value: product && product.minOrderQuantity ? product.minOrderQuantity.value : 1
    });
    Object.defineProperty(object, 'maxOrderQuantity', {
        enumerable: true,
        value: (function () {
            if (product.variant) {
                var ats = 0;
                if (product.availabilityModel && product.availabilityModel.inventoryRecord) {
                    ats = product.availabilityModel.inventoryRecord.ATS;
                } else {
                    inventoryLogger.warn('Variant ' + product.ID + ' does not have a valid inventory record');
                }
                return ats;
            }
            return DEFAULT_MAX_ORDER_QUANTITY;
        }())
    });
};
