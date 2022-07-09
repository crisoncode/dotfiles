'use strict';

/**
 * Badges hierarchy
 *
 * 1. Deal of the day (dealOfDay)
 * 2. Exclusive (exclusive)
 * 3. Sale (sale)
 * 4. Pre-order (preOrder)
 * 5. New (new)
 * 6. Discount (discount)
 */

const assert = require('chai').assert;
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('Helpers - Badges', function () {
    var badgesHelper = proxyquire('../../../../../cartridges/app_storefront_common/cartridge/scripts/helpers/badges.js', {});

    describe('getBadges() function', function () {
        it('should return one badge', function () {
            const product = {
                badges: {
                    dealOfDay: true,
                    preOrder: true
                }
            };
            let result = badgesHelper.getBadges(product);
            assert.equal(result[0].type, 'deal-of-day');
        });

        it('should return two badges', function () {
            const product = {
                badges: {
                    exclusive: true,
                    preOrder: true,
                    new: true
                }
            };
            let result = badgesHelper.getBadges(product, 2);
            assert.equal(result[0].type, 'exclusive', result[1].type, 'preOrder');
        });

        it('should return two badges with test raquet', function () {
            const product = {
                badges: {
                    exclusive: true,
                    sale: true,
                    new: true
                },
                isTestRacket: true
            };
            let result = badgesHelper.getBadges(product, 2);
            assert.equal(result[0].type, 'exclusive', result[1].type, 'new');
        });

        it('should return no badges', function () {
            let result = badgesHelper.getBadges();
            assert.equal(result, '');
        });
    });
});
