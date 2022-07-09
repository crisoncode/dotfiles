'use strict';

/**
 * Presentation logic for multiple product badges.
 * See badges-decorator `models/product/decorators/badges.js` for business logic of each badge
 *
 *    The displayed badges are in this precedence:
 *    1. Deal of day
 *    2. exclusive
 *    3. sale
 *    4. pre-order
 *    5. new
 *    6. discount
 *
 * @param {Object} product - the product model
 * @param {number} numBadges - the number of badges to display
 * @returns {Object} the presentation data for the badge to display
 */
var getBadges = function (product, numBadges = 1) {
    const badges = [];
    const isTestRacket = product.isTestRacket || false;

    if ('badges' in product) {
        // 1. deal-of-day
        if (product.badges.dealOfDay) {
            badges.push({
                type: 'deal-of-day',
                reduction: product.badges.reduction ? product.badges.reduction.fixedValue : null,
                dayOfferEnd: product.badges.dayOfferEnd,
                priceHighlight: !isTestRacket
            });
        }

        // 2. exclusive
        if (product.badges.exclusive) {
            badges.push({
                type: 'exclusive'
            });
        }

        // 3. sale
        if (!isTestRacket && product.badges.sale) {
            badges.push({
                type: 'sale',
                reduction: product.badges.reduction ? product.badges.reduction.fixedValue * -1 : null,
                priceHighlight: true
            });
        }

        // 4. pre-order
        if (product.badges.preOrder) {
            badges.push({
                type: 'pre-order'
            });
        }

        // 5. new
        if (product.badges.new) {
            badges.push({
                type: 'new'
            });
        }

        // 6. discount
        if (!isTestRacket && product.badges.discount) {
            badges.push({
                type: 'discount',
                reduction: product.badges.reduction.fixedValue * -1
            });
        }
    }

    return badges.slice(0, numBadges);
};

module.exports = {
    getBadges: getBadges
};
