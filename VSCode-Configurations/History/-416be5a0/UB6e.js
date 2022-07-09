'use strict';

const highlightsHelper = require('*/cartridge/scripts/helpers/highlightsHelper');

module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'highlights', {
        enumerable: true,
        value: (function () {
            return highlightsHelper.getProductHighlights(apiProduct);
        }())
    });
};

