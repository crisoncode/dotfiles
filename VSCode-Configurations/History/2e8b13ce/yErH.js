'use strict';

var PromotionMgr = require('dw/campaign/PromotionMgr');
var ArrayList = require('dw/util/ArrayList');
var Site = require('dw/system/Site');
var pricingHelper = require('*/cartridge/scripts/helpers/pricing');
var PriceBookMgr = require('dw/catalog/PriceBookMgr');
var DefaultPrice = require('*/cartridge/models/price/default');
var RangePrice = require('*/cartridge/models/price/range');
var priceFactory = require('*/cartridge/scripts/factories/price');

/**
 * Retrieve promotions that apply to current product
 * @param {dw.catalog.ProductSearchHit} searchHit - current product returned by Search API.
 * @param {Array<string>} activePromotions - array of ids of currently active promotions
 * @return {Array<Promotion>} - Array of promotions for current product
 */
function getPromotions(searchHit, activePromotions) {
    var productPromotionIds = searchHit.discountedPromotionIDs;
    let test = PromotionMgr.getActiveCustomerPromotions();
    var promotions = new ArrayList();
    activePromotions.forEach(function (promoId) {
        var index = productPromotionIds.indexOf(promoId);
        if (index > -1) {
            promotions.add(PromotionMgr.getPromotion(productPromotionIds[index]));
        }
    });

    return promotions;
}

/**
 * Get list price for a given product
 * @param {dw.catalog.ProductSearchHit} hit - current product returned by Search API.
 * @param {function} getSearchHit - function to find a product using Search API.
 * @param {boolean} hasPromotionPrice - has promotional price or not
 *
 * @returns {Object} - price for a product
 */
function getListPrices(hit, getSearchHit, hasPromotionPrice) {
    var displayPromotionPrice = Site.getCurrent().getCustomPreferenceValue('displayPromotionPrice');
    var priceModel = hit.firstRepresentedProduct.getPriceModel();
    if (!priceModel.priceInfo) {
        return {};
    }
    var rootPriceBook = pricingHelper.getRootPriceBook(priceModel.priceInfo.priceBook);
    if (session.custom.netPrices) {  // eslint-disable-line
        var uvpNetPricebookID = rootPriceBook.ID.replace(/-prices$/g, '-NETTprices');
        rootPriceBook = PriceBookMgr.getPriceBook(uvpNetPricebookID);
    }
    if (rootPriceBook.ID === priceModel.priceInfo.priceBook.ID && (hasPromotionPrice && displayPromotionPrice)) {
        // TPPBL-1467:
        // if there is only one price book price
        // AND a promotional price is available,
        // this must be shown as list price (comes from productSearchHit)
        return { minPrice: hit.minPrice, maxPrice: hit.maxPrice };
    } else if (rootPriceBook.ID === priceModel.priceInfo.priceBook.ID) {
        return {};
    }
    var searchHit;

    try {
        PriceBookMgr.setApplicablePriceBooks(rootPriceBook);
        searchHit = getSearchHit(hit.product);
    } catch (e) {
        searchHit = hit;
    } finally {
        // Clears price book ID's stored to the session.
        // When switching locales, there is nothing that clears the price book ids stored in the
        // session, so subsequent searches will continue to use the ids from the originally set
        // price books which have the wrong currency.
        PriceBookMgr.setApplicablePriceBooks();
    }

    if (searchHit) {
        return { minPrice: searchHit.minPrice, maxPrice: searchHit.maxPrice };
    }

    return {};
}

module.exports = function (object, searchHit, activePromotions, getSearchHit) {
    var promotions = getPromotions(searchHit, activePromotions);
    var product = searchHit.product;

    Object.defineProperty(object, 'price', {
        enumerable: true,
        value: (function () {
            var salePrice = { minPrice: searchHit.minPrice, maxPrice: searchHit.maxPrice };
            var hasPromotionPrice = false;
            if (promotions.getLength() > 0) {
                var promotionalPrice = pricingHelper.getPromotionPrice(searchHit.firstRepresentedProduct, promotions);
                if (promotionalPrice && promotionalPrice.valueOrNull != null) {
                    hasPromotionPrice = true;
                    salePrice = { minPrice: promotionalPrice, maxPrice: promotionalPrice };
                }
            }
            var listPrice = getListPrices(searchHit, getSearchHit, hasPromotionPrice);

            if (salePrice.minPrice.value !== salePrice.maxPrice.value) {
                // range price
                return new RangePrice(salePrice.minPrice, salePrice.maxPrice);
            }

            if (listPrice.minPrice && listPrice.minPrice.valueOrNull !== null) {
                if (listPrice.minPrice.value !== salePrice.minPrice.value) {
                    return new DefaultPrice(salePrice.minPrice, listPrice.minPrice);
                }
            }

            return new DefaultPrice(salePrice.minPrice);
        }())
    });

    Object.defineProperty(object, 'tieredPrices', {
        enumerable: true,
        writable: true,
        value: priceFactory.getTieredPriceTable(product, null, false, promotions, null)
    });
};
