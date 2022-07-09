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
            const mappingResult = highlightsHelper.getAttributesByProductType({ productType: 'apparel' });
            assert.deepEqual(mappingResult.breathable.title,
                highlightsHelper.productAttributesToHighlight.apparel.breathable.title);
            assert.deepEqual(mappingResult.moistureRepellent.title,
                highlightsHelper.productAttributesToHighlight.apparel.moistureRepellent.title);
        });
    });

    describe('fillAttributes function', function () {
        it('fill attributes for a racket', function () {
            let product = new Product();
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

    describe('getProductHighlights function', function () {
        it('fill attributes for a string product type', function () {
            let product = new Product();
            product.custom.tradeGroup = 'strings';
            const filledAttrs = highlightsHelper.getProductHighlights(product);
            let material = filledAttrs.filter((item) => {
                return item.attributeID === '(Co-)Polyester';
            });
            let stringStructure = filledAttrs.filter((item) => {
                return item.attributeID === 'stringStructure';
            });
            assert.deepEqual(stringStructure[0].value, 'Monofil');
            assert.deepEqual(material[0].value, '(Co-)Polyester');
        });
    });
});
