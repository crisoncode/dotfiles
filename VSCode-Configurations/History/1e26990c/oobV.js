'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('GiftCardHelpers', function () {
    var giftCardHelpers = proxyquire('../../../../../cartridges/app_storefront_common/cartridge/scripts/helpers/giftCardHelpers.js', {});

    describe('showGiftCardMessageOnPdp() function', function () {
        it('should return true', function () {
            const result = {
                error: false
            };

            const product = {
                ID: 'ea00032'
            };

            const cartModel = {
                items: [
                    {
                        id: '291320494902309',
                        isGiftCardProduct: false
                    },
                    {
                        id: '291320494902309',
                        isGiftCardProduct: false
                    },
                    {
                        id: 'ea00032',
                        isGiftCardProduct: true
                    }
                ]
            };

            const methodResult = giftCardHelpers.showGiftCardMessageOnPdp(result, product, cartModel);

            assert.isTrue(methodResult);
        });

        it('should return false', function () {
            const result = {
                error: false
            };

            const product = {
                ID: 'ea00032'
            };

            const cartModel = {
                items: []
            };

            const methodResult = giftCardHelpers.showGiftCardMessageOnPdp(result, product, cartModel);

            assert.isFalse(methodResult);
        });

        it('With null params', function () {
            const methodResult = giftCardHelpers.showGiftCardMessageOnPdp(null, null, null);

            assert.isFalse(methodResult);
        });
    });
});
