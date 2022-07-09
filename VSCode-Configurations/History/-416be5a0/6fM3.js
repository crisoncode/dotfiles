'use strict';


module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'highlights', {
        enumerable: true,
        value: (function () {
            let result = false;

            if (!apiProduct) {
                return false;
            }

            if (apiProduct.variant) {
                result = isVariantOneSized(apiProduct);
            }

            if ((apiProduct.master || apiProduct.variationGroup) && apiProduct.variants && apiProduct.variants.length === 1) {
                result = isVariantOneSized(apiProduct.variants.toArray()[0]);
            }
            return result;
        }())
    });
};

