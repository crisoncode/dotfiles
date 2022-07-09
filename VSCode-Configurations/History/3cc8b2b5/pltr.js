'use strict';

module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'variants', {
        enumerable: true,
        writable: true,
        value: (function () {
            var product = object;
            var variants = [];
            if (product.variationAttributes.length > 0) { //
                if (product.id === '00545414747000') {
                    let vg = true;
                }
                for (var i = 0; i < product.variationAttributes.length; i++) {
                    if (product.variationAttributes[i].id === 'size') {
                        var productVariantsArray = product.variationAttributes[i].values.filter(function (obj) {
                            return !empty(obj.variantId) && !empty(obj.url);
                        });
                        for (var j = 0; j < productVariantsArray.length; j++) {
                            var apiVariant;
                            for (var k = 0; k < apiProduct.variants.size(); k++) {
                                if (apiProduct.variants[k].ID === productVariantsArray[j].variantId) {
                                    apiVariant = apiProduct.variants[k];
                                    break;
                                }
                            }

                            var inventoryRecord = apiVariant && apiVariant.getAvailabilityModel().getInventoryRecord();

                            variants.push({
                                ID: productVariantsArray[j].variantId || null,
                                size: productVariantsArray[j].displayValue,
                                stock: inventoryRecord ? inventoryRecord.getATS().getValue() : 0
                            });
                        }
                    }
                    break;
                }
            }
            return variants;
        }())
    });
};
