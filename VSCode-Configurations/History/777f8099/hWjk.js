'use strict';

var baseProductTile = require('app_storefront_base/cartridge/models/product/productTile.js');
var decorators = require('*/cartridge/models/product/decorators/index');


/**
 * Decorate product with product tile information
 * @param {Object} product - Product Model to be decorated
 * @param {dw.catalog.Product} apiProduct - Product information returned by the script API
 * @param {string} productType - Product type information
 * @param {string} localeId - The local ID
 * @param {Object} options - Options passed in from the factory
 * @property {dw.util.Collection} options.promotions - Active promotions for a given product
 *
 * @returns {Object} - Decorated product model
 */
module.exports = function productTile(product, apiProduct, productType, localeId, options) {
    this.product = baseProductTile.call(this, product, apiProduct, productType, options);

    if (options.isLargeProductTile) {
        decorators.attributes(this.product, apiProduct.attributeModel);
    }
    decorators.raw(this.product, apiProduct);
    decorators.brand(this.product, apiProduct, true);
    decorators.manufacturerId(this.product, apiProduct);
    decorators.productType(this.product, apiProduct);
    decorators.gender(this.product, apiProduct);
    decorators.images(product, apiProduct, { types: ['low'], quantity: 'single' });
    decorators.badges(this.product, apiProduct, options.readOnlySearchModel);
    decorators.testRacket(this.product, apiProduct, true);
    decorators.dynamicProductNaming(this.product, apiProduct, localeId);
    decorators.promotions(this.product, options.promotions, apiProduct, 'PLP');
    if (apiProduct.masterProduct) {
        decorators.masterid(this.product, apiProduct.masterProduct);
    }
    decorators.raw(product, apiProduct);
    return this.product;
};
