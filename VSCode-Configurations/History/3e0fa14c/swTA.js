'use strict';

const assert = require('chai').assert;
const expect = require('chai').expect;
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();
const ArrayList = require('../../../../../mocks/dw.util.Collection');
const mockCollections = require('../../../../../mocks/util/collections');
const promoMock = {
    ID: 'hello Mister Anderson',
    custom: {
        displayCMOnCart: true
    }
};
const mockCollectionOfPromos = new ArrayList([promoMock]);

describe('Product promotions decorator', function () {
    const promotions = proxyquire('../../../../../../cartridges/app_storefront_common/cartridge/models/product/decorators/promotions', {
        'dw/campaign/PromotionMgr': {
            getActivePromotions: function () {
                return mockCollectionOfPromos;
            },
            getProductPromotions: function (collection) {
                return collection.toArray()[0];
            }
        },
        '*/cartridge/scripts/util/collections': { map: mockCollections.map }
    });

    it('Product null', function () {
        let object = {};

        promotions(object, mockCollectionOfPromos);
        expect(object.promotionMessage).to.equal({});
        // assert.isEmpty(object.promotionMessage);
    });
});
