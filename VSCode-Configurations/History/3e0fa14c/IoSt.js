'use strict';

const assert = require('chai').assert;
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();
const ArrayList = require('../../../../../mocks/dw.util.Collection');

describe('Product oneSize decorator', function () {
    const oneSize = proxyquire('../../../../../../cartridges/app_storefront_common/cartridge/models/product/decorators/promotions', {});

    it('Product null', function () {
        let object = {};

        oneSize(object, null);

        assert.equal(object.oneSize, false);
    });
});
