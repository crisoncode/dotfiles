'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('Helpers - Redirect', function () {
    var redirectHelper = proxyquire('../../../../../cartridges/app_storefront_common/cartridge/scripts/helpers/giftCardHelpers.js', {});

    describe('productLineUrl() function', function () {
        it('should return new fixed productline url', function () {
            var expected = {
                '/tennisbekleidung/sergio-tacchini-sergio-tacchini-young-line': '/tennisbekleidung/sergio-tacchini_sergio-tacchini---young-line',
                '/tennisbekleidung/adidas-adidas-essentials/': '/tennisbekleidung/adidas_adidas---essentials',
                '/tennisbekleidung/hydrogen-hydrogen-tennis-court/': '/tennisbekleidung/hydrogen_hydrogen---tennis-court',
                '/tennisbekleidung/yonex-yonex-wawrinka/': '/tennisbekleidung/yonex_yonex---wawrinka',
                '/tennisbekleidung/bidi-badu-by-kilian-kerner/': false,
                '/tennisbekleidung/bjoern-borg-bjoern-borg-performance/': '/tennisbekleidung/bjoern-borg_bjoern-borg---performance'
            };

            Object.keys(expected).forEach(function (oldUrl) {
                var newUrl = expected[oldUrl];
                var productLineRedirect = redirectHelper.productLineUrl(oldUrl);
                assert.equal(productLineRedirect, newUrl);
            });
        });
    });
});
