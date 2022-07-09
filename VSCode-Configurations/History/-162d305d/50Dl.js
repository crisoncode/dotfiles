'use strict';

var URLUtils = require('dw/web/URLUtils');
var decorators = require('*/cartridge/models/product/decorators/index');

/**
 * Decorate teamwear-product
 * @param {Object} product - Product Model to be decorated
 * @param {dw.catalog.Product} apiProduct - Product information returned by the script API
 * @param {Object} options - Options passed in from the factory
 *
 * @returns {Object} - Decorated teamwear-product model
 */
module.exports = function teamwearProduct(product, apiProduct, options) {
    decorators.base(product, apiProduct, options.productType);
    decorators.images(product, (options.variationModel ? options.variationModel : apiProduct), { types: ['base'], quantity: 'single' });
    decorators.quantity(product, apiProduct, options.quantity);
    decorators.price(product, apiProduct, options.promotions, false, options.optionModel, options.quantity);
    decorators.dynamicProductNaming(product, apiProduct);
    decorators.brand(product, apiProduct, true);
    decorators.promotions(product, options.promotions);
    decorators.variationAttributes(product, options.variationModel, { attributes: '*', endPoint: 'Variation' });
    if (apiProduct.variationGroup && product.variationAttributes) {
        decorators.teamwearVariants(product, apiProduct);
    }
    product.url = URLUtils.url('Product-Show', 'pid', product.id).toString(); // eslint-disable-line no-param-reassign
    return product;
};
