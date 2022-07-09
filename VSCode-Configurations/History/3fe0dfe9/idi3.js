var Money = require('dw/value/Money');
var Site = require('dw/system/Site')

var PRICEBOOK_BRAND_NAME = {
    'JPO': 'JOPO',
    'TPE': 'TEPE',
    'TPO': 'TEPO',
    'PPO': 'PAPO',
    'CCO': 'CC'
}

var SITE_PRICEBOOKS = require('app_storefront_common/cartridge/config/pricebooksConfig.json')[Site.getCurrent().ID];

var DEAL_OF_DAY_CAMPAIGN = 'deal-of-day';

/**
 * Get list price for a product
 *
 * @param {dw.catalog.ProductPriceModel} priceModel - Product price model
 * @return {dw.value.Money} - List price
 */
function getListPrice(priceModel) {
    var priceBook;
    var priceBookPrice;

    if (priceModel.price.valueOrNull === null && priceModel.minPrice) {
        return priceModel.minPrice;
    }

    priceBook = getRootPriceBook(priceModel.priceInfo.priceBook);
    priceBookPrice = priceModel.getPriceBookPrice(priceBook.ID);

    if (priceBookPrice.available) {
        return priceBookPrice;
    }

    var price = priceModel.price.available ? priceModel.price : priceModel.minPrice;
    return price;
}

/**
 * Get price for a given pricebook
 *
 * pricebook scheme is "<CURRENCY>-<BRAND>_<COUNTRY>-<NAME>-prices"
 *
 * @param {String} name - name of pricebook
 * @param {dw.catalog.ProductPriceModel} priceModel - Product price model
 * @return {dw.value.Money} - deal-of-day price
 */
function getPriceBookPrice(name, priceModel, currency) {
    var priceBookID = null;
    var price = null;
    var siteCurrency = currency || 'default';

    var pricebooksConfig = SITE_PRICEBOOKS[siteCurrency];
    var priceBookIDs = pricebooksConfig[name.toString().toLowerCase()] || null;

    if (priceBookIDs && priceBookIDs.length > 0) {
        priceBookID = priceBookIDs[0];
    } else if (name.toString().toLowerCase() === 'uvp') {
        priceBookID = priceBookIDs['guest'][1];
    }
    if (priceBookID) {
        price = priceModel.getPriceBookPrice(priceBookID);
    }
    // for legacy reasons we check both, new and old EK pricebooks
    if (name === 'EK' && price === Money.NOT_AVAILABLE) {
        price = priceModel.getPriceBookPrice(priceBookIDs[1]);
    }
    return price && price.available ? price.value : null;
}

function isDealOfDayProduct(product) {
    if (product) {
        var PromotionMgr = require('dw/campaign/PromotionMgr')
        var promotions = PromotionMgr.getActivePromotions().getProductPromotionsForDiscountedProduct(product)
        this.promotion = require('*/cartridge/scripts/util/collections').find(promotions, function (promotion) {
            return promotion.getCampaign().ID === DEAL_OF_DAY_CAMPAIGN
        });
        return this.promotion !== null
    }
    return false
}

function getDiscountedProducts() {
    var PromotionMgr = require('dw/campaign/PromotionMgr');
    var promotion = null;
    var dealOfDayConfigurationStrategy = require('dw/system/Site').current.getCustomPreferenceValue('dealOfDayConfigurationStrategy').value;

    if (dealOfDayConfigurationStrategy === 'CampaignBased') {
        var campaign = PromotionMgr.getCampaign(DEAL_OF_DAY_CAMPAIGN);
        if (campaign != null && campaign.isActive() && campaign.isEnabled()) {
            var promotions = campaign.getPromotions().iterator();
            while (promotions.hasNext()) {
                var promo = promotions.next();
                if (promo && promo.isEnabled() && promo.isActive()) {
                    promotion = promo;
                    break;
                }
            }
        }
    }

    if (dealOfDayConfigurationStrategy === 'PromotionFlagBased') {
        var activePromotions = PromotionMgr.getActivePromotions();
        promotion = require('*/cartridge/scripts/util/collections').find(activePromotions.productPromotions, function (productPromotion) {
            return 'isDealOfDay' in productPromotion.custom && productPromotion.custom.isDealOfDay === true;
        });
    }

    var productSearchHits = null
    if (promotion) {
        var ProductSearchModel = require('dw/catalog/ProductSearchModel')
        var apiProductSearch = new ProductSearchModel()
        var CatalogMgr = require('dw/catalog/CatalogMgr')
        apiProductSearch.setCategoryID(CatalogMgr.getSiteCatalog().getRoot().getID())
        apiProductSearch.setPromotionID(promotion.ID)
        apiProductSearch.orderableProductsOnly = true
        apiProductSearch.setPromotionProductType(ProductSearchModel.PROMOTION_PRODUCT_TYPE_DISCOUNTED)
        apiProductSearch.search()
        productSearchHits = apiProductSearch.getProductSearchHits()
    }

    var pids = {}
    while (productSearchHits !== null && productSearchHits.hasNext()) {
        let productSearchHit = productSearchHits.next()
        pids[productSearchHit.product.ID] = ''
        if (productSearchHit.product.variationGroup) {
            let productSearchHitVariants = productSearchHit.product.variants.iterator()
            while (productSearchHitVariants.hasNext()) {
                let productSearchHitVariant = productSearchHitVariants.next()
                pids[productSearchHitVariant.ID] = ''
            }
        }
    }
    return pids
}

/**
 * Return root price book for a given price book
 * @param {dw.catalog.PriceBook} priceBook - Provided price book
 * @returns {dw.catalog.PriceBook} root price book
 */
function getRootPriceBook(priceBook) {
    var rootPriceBook = priceBook;
    while (rootPriceBook.parentPriceBook) {
        rootPriceBook = rootPriceBook.parentPriceBook;
    }
    return rootPriceBook;
}

module.exports = {
    getListPrice: getListPrice,
    getPriceBookPrice: getPriceBookPrice,
    isDealOfDayProduct: isDealOfDayProduct,
    getDiscountedProducts: getDiscountedProducts
}
