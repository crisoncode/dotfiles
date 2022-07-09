'use strict';

const assert = require('chai').assert;
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();
const ArrayList = require('../../../../../../../mocks/dw.util.Collection');

describe('Product oneSize decorator', function () {
    const promotions = proxyquire('../../../../../../cartridges/app_storefront_common/cartridge/models/product/decorators/promotions', {
        'dw/campaign/PromotionMgr': {
            getActivePromotions: function () {
                const promo = {
                    ID: 'hello Mister Anderson'
                };

                const mockCollectionOfPromos = new ArrayList([promo]);
                return mockCollectionOfPromos;
            },
            getProductPromotions: function (collection) {
                return collection.toArray[0];
            }
        },
        'collections': ArrayList
    });

    it('Product null', function () {
        let object = {};

        promotions(object, null);

        assert.equal(object, false);
    });
});
