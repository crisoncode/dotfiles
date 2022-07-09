'use strict';

const assert = require('chai').assert;
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();
const ArrayList = require('../../../../../mocks/dw.util.Collection');

describe('Product oneSize decorator', function () {
    const promotions = proxyquire('../../../../../../cartridges/app_storefront_common/cartridge/models/product/decorators/promotions', {
        'dw/campaign/PromotionMgr': {
            getActivePromotions: function () {
                const promo = {

                };

                const collection = new ArrayList([promo]);
                returns
            }
        }
    });

    it('Product null', function () {
        let object = {};

        promotions(object, null);

        assert.equal(object, false);
    });
});
