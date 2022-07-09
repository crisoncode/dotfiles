'use strict';

var baseFullProduct = require('app_storefront_base/cartridge/models/product/fullProduct.js');
var decorators = require('*/cartridge/models/product/decorators/index');


/**
 * Decorate product with product tile information
 * @param {Object} product - Product Model to be decorated
 * @param {dw.catalog.Product} apiProduct - Product information returned by the script API
 * @param {Object} options - Options passed in from the factory
 *
 * @returns {Object} - Decorated product model
 */
module.exports = function fullProduct(product, apiProduct, options) {
    this.product = product;
    var params = {};
    params.isBundleProduct = options.isBundleProduct;
    decorators.productType(this.product, apiProduct, params);
    this.product = baseFullProduct.call(this, product, apiProduct, options);

    decorators.freeShipping(this.product);
    decorators.brand(this.product, apiProduct);
    decorators.gender(this.product, apiProduct);
    decorators.categories(this.product, apiProduct, options.productType);
    decorators.video(this.product, apiProduct);
    decorators.tennisRacket(this.product, apiProduct);
    decorators.testRacket(this.product, apiProduct);
    decorators.taxRate(this.product, apiProduct);
    decorators.customLinkedProducts(this.product, apiProduct);

    if (apiProduct.variationGroup) {
        decorators.linkedProducts(this.product, apiProduct, null);
    }
    if (options.variationModel) {
        decorators.variationGroups(this.product, options.variationModel.variationGroups, apiProduct.variant);
    }

    decorators.badges(this.product, apiProduct);
    decorators.expectedDeliveryDate(this.product, apiProduct);
    decorators.dynamicProductNaming(this.product, apiProduct);
    decorators.pageMetaData(product, apiProduct);
    decorators.promotions(this.product, options.promotions, apiProduct, 'PDP');
    decorators.personalizeProduct(this.product, apiProduct);
    decorators.linkedPersonalizationServices(this.product, apiProduct);
    decorators.shoeSizeMe(this.product, apiProduct);
    decorators.priceComparison(this.product);
    decorators.oneSize(this.product, apiProduct);
    decorators.highlights(apiProduct);

    if (apiProduct.variant || apiProduct.variationGroup) {
        decorators.masterid(this.product, apiProduct.masterProduct);
        decorators.masterAttrs(this.product, apiProduct.masterProduct);
    } else if (apiProduct.master) {
        decorators.masterid(this.product, apiProduct);
    }

    return this.product;
};
