'use strict';

var decorators = require('*/cartridge/models/product/decorators/index');
var promotionCache = require('*/cartridge/scripts/util/promotionCache');
var ProductSearchModel = require('dw/catalog/ProductSearchModel');

/**
 * Get product search hit for a given product
 * @param {dw.catalog.Product} apiProduct - Product instance returned from the API
 * @param {Object} options - Options passed in from the factory (optional)
 * @returns {dw.catalog.ProductSearchHit} - product search hit for a given product
 */
function getProductSearchHit(apiProduct, options) {
    var searchModel = new ProductSearchModel();
    searchModel.setSearchPhrase(apiProduct.ID);
    searchModel.search();

    if (searchModel.count === 0) {
        searchModel.setSearchPhrase(apiProduct.ID.replace(/-/g, ' '));
        searchModel.search();
    }

    if (options) {
        options.readOnlySearchModel = searchModel;
    }

    var hit = searchModel.getProductSearchHit(apiProduct);
    if (!hit) {
        var tempHit = searchModel.getProductSearchHits().next();
        if (tempHit.firstRepresentedProductID === apiProduct.ID) {
            hit = tempHit;
        }
    }
    return hit;
}

/**
 * Decorate product with product tile information
 * @param {Object} product - Product Model to be decorated
 * @param {dw.catalog.Product} apiProduct - Product information returned by the script API
 * @param {string} productType - Product type information
 * @param {Object} options - Options passed in from the factory
 *
 * @returns {Object} - Decorated product model
 */
module.exports = function productTile(product, apiProduct, productType, options) {
    var productSearchHit = getProductSearchHit(apiProduct, options);
    decorators.base(product, apiProduct, productType);
    decorators.searchPrice(product, productSearchHit, options.promotions, getProductSearchHit);
    decorators.images(product, apiProduct, { types: ['medium'], quantity: 'single' });
    decorators.ratings(product);
    decorators.searchVariationAttributes(product, productSearchHit);

    return product;
};