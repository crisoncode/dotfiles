'use strict';

const highlightsHelper = require('*/cartridge/scripts/helpers/highlightsHelper');
const Logger = require('dw/system/Logger');
module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'highlights', {
        enumerable: true,
        value: (function () {
            let masterProduct = apiProduct;
            try {
                let masterProduct = apiProduct.isMaster() ? apiProduct.isMaster() : apiProduct.masterProduct;
            } catch (error) {
                Logger.error('problem while rendering highlights in PDP redesign with SFCC product structure');
            }
            return highlightsHelper.getProductHighlights(masterProduct);
        }())
    });
};

