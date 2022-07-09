'use strict';

const highlightsHelper = require('*/cartridge/scripts/helpers/productHelper');

module.exports = function (object) {
    Object.defineProperty(object, 'highlights', {
        enumerable: true,
        value: (function () {
            return highlightsHelper.getProductHighlights(product);
        }())
    });
};

