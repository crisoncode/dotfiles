'use strict';

const highlightsHelper = require('*/cartridge/scripts/helpers/highlightsHelper');
const Logger = require('dw/system/Logger');

module.exports = function (object, apiProduct) {
    /**
     * This attribute is used for render the "highlights"
     * block in the new PDP design.
     */
    Object.defineProperty(object, 'highlights', {
        enumerable: true,
        value: (function () {
            let result = false;

            try {
                const masterProduct = !apiProduct.isMaster() ? apiProduct.masterProduct : apiProduct.masterProduct;
                result = highlightsHelper.getProductHighlights(masterProduct);
            } catch (error) {
                Logger.error('Problem while rendering highlights in PDP redesign with SFCC product structure');
            }

            return result;
        }())
    });
};

