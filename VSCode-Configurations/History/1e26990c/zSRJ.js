'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('GiftCardHelpers', function () {
    var giftCardHelpers = proxyquire('../../../../../cartridges/app_storefront_common/cartridge/scripts/helpers/giftCardHelpers.js', {});

    describe('showGiftCardMessageOnPdp() function', function () {
        it('should return true', function () {
            let result = [];
            let product = {};
            giftCardHelpers.showGiftCardMessageOnPdp([], );
        });
    });
});
