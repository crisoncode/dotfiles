'use strict';

const highlightsHelper = require('*/cartridge/scripts/helpers/highlightsHelper');
const Logger = require('dw/system/Logger');
module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'highlights', {
        enumerable: true,
        value: (function () {
            try {
                let masterProduct = apiproduct.isMaster() ? apiproduct.isMaster() : apiproduct.masterProduct
            } catch (error) {
                Logger.error
            }
            return highlightsHelper.getProductHighlights(apiProduct);
        }())
    });
};

