'use strict';

const assert = require('chai').assert;
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();
const Product = require('../../../../mocks/dw/catalog/Product');

describe('Helpers - Highlights', function () {
    const highlightsHelper = proxyquire('../../../../../cartridges/app_storefront_common/cartridge/scripts/helpers/highlightsHelper.js', {});
    describe('getAttributesByProductType function', function () {
        it('should return the attributes for a racket', function () {
            let product = new Product();
            let mappingResult = highlightsHelper.getAttributesByProductType({ productType: 'racket' });
            assert.deepEqual(mappingResult.headSize.title, highlightsHelper.productAttributesToHighlight.rackets.headSize.title);
            assert.deepEqual(mappingResult.stringPattern.title, highlightsHelper.productAttributesToHighlight.rackets.stringPattern.title);

            mappingResult = highlightsHelper.getAttributesByProductType({ productType: 'clothing' });
            assert.deepEqual(mappingResult.moistureRepellent.title, highlightsHelper.productAttributesToHighlight.moistureRepellent.headSize.title);
            assert.deepEqual(mappingResult.moistureRepellent.title, highlightsHelper.productAttributesToHighlight.moistureRepellent.stringPattern.title);
        });
    });

});
