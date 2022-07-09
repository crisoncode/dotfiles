'use strict';


var collections = require('*/cartridge/scripts/util/collections');

/**
 * Get the best ranked promotion.
 *
 * @param {Object} promos - all promotions
 * @param {string} pageType to check the display PDP/PLP
 * @return {Object} - Promotion
 */
function getPromotionForCallOutMsg(promos, pageType) {
    var promotionForCallOutMsg = null;
    if (promos) {
        var iteration = promos.length;
        var rank = 100;
        var i = 0;
        while (i < iteration) {
            var promotionItem = promos[i];
            if (promotionItem.active
                    && promotionItem.basedOnCoupons
                    && (pageType === 'PDP' ? promotionItem.custom.displayCMOnPDP : promotionItem.custom.displayCMOnPLP)) {
                if (promotionItem.rank <= rank) {
                    rank = promotionItem.rank;
                    promotionForCallOutMsg = promotionItem;
                }
            }
            i++;
        }
    }

    return promotionForCallOutMsg;
}

module.exports = function (object, promotions, apiProduct, pageType) {
    // All applied promotions
    Object.defineProperty(object, 'promotions', {
        enumerable: true,
        writable: true,
        value: promotions.length === 0 ? null : collections.map(promotions, function (promotion) {
            return {
                calloutMsg: promotion.calloutMsg ? promotion.calloutMsg.markup : '',
                displayCMOnCart: 'displayCMOnCart' in promotion.custom ? promotion.custom.displayCMOnCart : false,
                details: promotion.details ? promotion.details.markup : '',
                enabled: promotion.enabled,
                id: promotion.ID,
                name: promotion.name,
                promotionClass: promotion.promotionClass,
                rank: promotion.rank
            };
        })
    });

    // Highest ranked (lowest number) active coupon promotion (independent from qualifier)
    Object.defineProperty(object, 'promotionMessages', {
        enumerable: true,
        writable: true,
        value: (function () {
            var PromotionMgr = require('dw/campaign/PromotionMgr');
            var promotionsForCallOutMsg = {};
            if (apiProduct) {
                var promotionPlan = PromotionMgr.getActivePromotions();
                var promos = promotionPlan.getProductPromotions(apiProduct);
                promotionsForCallOutMsg[pageType] = getPromotionForCallOutMsg(promos, pageType);
            }
            return promotionsForCallOutMsg;
        }())
    });
};
