'use strict';


module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'highlights', {
        enumerable: true,
        value: (function () {
            return '';
        }())
    });
};

