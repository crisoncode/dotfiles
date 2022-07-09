'use strict';

const assert = require('chai').assert;
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();


describe('Helpers - Highlights', function () {
    const highlightsHelper = proxyquire('../../../../../cartridges/app_storefront_common/cartridge/scripts/helpers/highlightsHelper.js', {});
    const productAttributesToHighlight = highlightsHelper.productAttributesToHighlight;

    describe('getAttributesByProductType function', function () {
        it('should return the attributes for a racket', function () {
            let result = highlightsHelper.getAttributesByProductType({ productType: 'racket' });
            assert.deepEqual(result.headSize.title, productAttributesToHighlight.headSize.title);
            assert.deepEqual(result.stringPattern.title, productAttributesToHighlight.stringPattern.title);
        });
    });

});
