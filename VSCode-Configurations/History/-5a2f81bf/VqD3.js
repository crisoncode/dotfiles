'use strict';

var CatalogMgr = require('dw/catalog/CatalogMgr');
var ProductSearchModel = require('dw/catalog/ProductSearchModel');
var ArrayList = require('dw/util/ArrayList');

/**
 * Creates an object of all possible badges of a given product
 * @param {dw.catalog.Product} product - the given product
 * @param {Object|null} priceReduction - the price reduction
 * @param {dw.catalog.ProductSearchModel} readOnlySearchModel for the original product
 * @return {Object|null} an object containing the badges
 */
function calculateBadges(product, priceReduction, readOnlySearchModel) {
    var helper = require('*/cartridge/scripts/helpers/productHelper');
    var SALE_CATEGORY_ID = require('*/cartridge/config/categories.json').sale;
    var badges = {};

    //
    // 'Deal of Day' badge
    //
    //    A product is considered a deal-of-day product, if it is assigned as a discounted product of a product-promotion
    //    contained by a 'deal-of-day' campaign
    //
    var DealOfDay = require('*/cartridge/scripts/dealOfDay');
    var dealOfDay = new DealOfDay();
    badges.dealOfDay = dealOfDay.isDiscountedProduct(product);

    if (badges.dealOfDay) {
        badges.dayOfferEnd = dealOfDay.getEndDay();
        if (priceReduction && priceReduction.value > 0) {
            badges.reduction = priceReduction;
        }
    }


    //
    // 'Video' badge
    //
    badges.video = 'video' in product.custom && product.custom.video !== '' && helper.hasVideo(product);


    //
    // 'New' badge
    //
    //    A product is considered new, if the time since the first-in-stock date (product custom attribute "First Date in Stock" of a variation-group)
    //    is less than a given display period defined at a category level (category custom attribute "Display Period of New-Badge").
    //
    //    In order to leverage a low page cache diversity, the display period has to be defined at the primary category (default is 14 days).
    //    For accurate results, you must also consider a suitable caching time.
    //
    //
    //                  retention period start date
    //                               |
    //                               |<------ retention period ------>|
    //                               |                                |
    //    -------------+-------------+--------------------------------+------------> t
    //                 |                                              |
    //           first stock date                                   today
    //
    //
    badges.new = (function (prod) {
        var newBadge = false;

        // get retention period start date
        var Calendar = require('dw/util/Calendar');
        var category = prod.primaryCategory;
        var displayPeriod = (category && 'newBadgeDisplayPeriod' in category.custom && category.custom.newBadgeDisplayPeriod) ? category.custom.newBadgeDisplayPeriod : 14;
        var retentionPeriodStartDate = new Calendar();
        retentionPeriodStartDate.add(Calendar.DAY_OF_MONTH, displayPeriod * -1);

        var firstStockDate = prod.custom.firstStockDate;

        if (prod.variationGroup) {
            if (!firstStockDate) {
                newBadge = true;
                for (var i = 0; i < prod.variants.length; i++) {
                    firstStockDate = prod.variants[i].custom.firstStockDate;
                    if (!firstStockDate || (firstStockDate && new Calendar(firstStockDate).before(retentionPeriodStartDate))) {
                        newBadge = false;
                        break;
                    }
                }
            } else if (new Calendar(firstStockDate).after(retentionPeriodStartDate)) {
                newBadge = true;
            }
        }
        if (prod.variant) {
            if (firstStockDate && new Calendar(firstStockDate).after(retentionPeriodStartDate)) {
                newBadge = true;
            }
        }

        return newBadge;
    }(product));


    //
    // 'Sale' badge
    //
    //    A product is considered a sale product, if its variation-group-product
    //    is assigned to a sub-category within the sale-category SALE_CATEGORY_ID
    //
    if (empty(readOnlySearchModel)) {
        var variationGroupProduct = null;
        if (product.variant) {
            var productLookup = require('*/cartridge/scripts/helpers/productLookup.js');
            variationGroupProduct = productLookup.toVariationGroup(product);
        }
        var productSearch = new ProductSearchModel();
        productSearch.setProductIDs(new ArrayList(product.variant && variationGroupProduct ? variationGroupProduct.ID : product.ID));
        productSearch.setCategoryID(SALE_CATEGORY_ID);
        productSearch.setRecursiveCategorySearch(true);
        productSearch.search();
        badges.sale = productSearch.count > 0;
    } else {
        badges.sale = !readOnlySearchModel.refinements.getNextLevelCategoryRefinementValues(CatalogMgr.getCategory(SALE_CATEGORY_ID)).empty;
    }

    if (badges.sale && priceReduction && priceReduction.value > 0) {
        badges.reduction = priceReduction;
    }


    //
    // 'Discount' badge
    //
    //    A product is considered discounted, if it is not assigned to a sale category and has a discount larger than 25%
    //
    badges.discount = false;
    if (!badges.sale && priceReduction && priceReduction.value >= 25) {
        badges.discount = true;
        badges.reduction = priceReduction;
    }


    //
    // 'PreOrder' badge
    //
    //    A product is considered preOrder, if the Inventory record has the Availability Status 'Pre-Order'.
    //    An inventory record has the Availability Status 'Pre-Order' if "Allocation" is set to `0` and "Pre-Order/Backorder Handling" is set to `Pre-Order`
    //
    badges.preOrder = (function (prod) {
        var Catalog = require('dw/catalog/ProductAvailabilityModel');
        return (prod.variationGroup || prod.variant) &&
            prod.availabilityModel.availabilityStatus === Catalog.AVAILABILITY_STATUS_PREORDER;
    }(product));


    //
    // 'Sustainable' badge
    //
    //    The product attribute 'sustainability' is of type Integer (due to sorting requirements)
    //    and should be set at a variation-group or master level.
    //
    //    A product is sustainable, if the attribute value is 1 or larger
    //    A product is not sustainable, if the attribute value is not set or equals 0
    //
    badges.sustainable = 'sustainability' in product.custom && product.custom.sustainability >= 1;


    //
    // 'Oversize' badge
    //
    //    The product attribute 'specialSize' is of type 'Set of Integers'
    //
    //    A product has oversize, if the attribute is 1
    //    A product has no oversize, if the attribute is 'none'
    //
    badges.oversize = 'specialSize' in product.custom && product.custom.specialSize.length > 0 && product.custom.specialSize[0] === 1;


    //
    // 'Test Racket' badge
    //
    //    The product attribute 'testRacket' is of type 'boolean'
    //
    //    A product is a test racket, if the attribute is true
    //    A product is a not test racket, if the attribute is false
    //
    badges.testRacket = 'testRacket' in product.custom && product.custom.testRacket === true;


    //
    // 'Exclusive' badge
    //
    //    The product attribute 'exklusiv' is of type 'Integer' and is defined on a Product Master level
    //
    //    A product is exclusive, if the attribute value is 1
    //    A product is not exclusive, if the attribute value is not set or 0
    //
    badges.exclusive = 'exklusiv' in product.custom && product.custom.exklusiv === 1;


    return badges;
}

module.exports = function (product, apiProduct, readOnlySearchModel) {
    Object.defineProperty(product, 'badges', {
        enumerable: true,
        value: (function () {
            var priceReduction = null;
            if (product.price && product.price.percentage) {
                priceReduction = product.price.percentage;
            }
            return calculateBadges(apiProduct, priceReduction, readOnlySearchModel);
        }())
    });
};
