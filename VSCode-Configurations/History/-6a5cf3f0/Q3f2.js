'use strict';

const assert = require('chai').assert;
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();
const Product = require('../../../../mocks/dw/catalog/Product');

describe('Helpers - Highlights', function () {
    const highlightsHelper = proxyquire('../../../../../cartridges/app_storefront_common/cartridge/scripts/helpers/highlightsHelper.js', {});
    describe('getAttributesByProductType function', function () {
        it('should return the attributes for a racket', function () {
            const mappingResult = highlightsHelper.getAttributesByProductType({ productType: 'rackets' });
            assert.deepEqual(mappingResult.headSize.title,
                highlightsHelper.productAttributesToHighlight.rackets.headSize.title);
            assert.deepEqual(mappingResult.stringPattern.title,
                highlightsHelper.productAttributesToHighlight.rackets.stringPattern.title);
        });

        it('should return the attributes for clothing', function () {
            const mappingResult = highlightsHelper.getAttributesByProductType({ productType: 'clothing' });
            assert.deepEqual(mappingResult.breathable.title,
                highlightsHelper.productAttributesToHighlight.clothing.breathable.title);
            assert.deepEqual(mappingResult.moistureRepellent.title,
                highlightsHelper.productAttributesToHighlight.clothing.moistureRepellent.title);
        });
    });

    describe('fillAttributes function', function () {
        it('fill attributes for a racket', function () {
            let product = new Product();
            product.name = 'guille';
            const mappingResult = highlightsHelper.getAttributesByProductType({ productType: 'rackets' });
            const filledAttrs = highlightsHelper.fillAttributes({ product: product, attributesMapping: mappingResult });

            let headSizeAttr = filledAttrs.filter((item) => {
                return item.attributeID === 'headSize';
            });
            assert.deepEqual(headSizeAttr[0].value, '645.00');

            let stringPattern = filledAttrs.filter((item) => {
                return item.attributeID === 'stringPattern';
            });
            assert.deepEqual(stringPattern[0].value, '16/19');
        });
    });
});
