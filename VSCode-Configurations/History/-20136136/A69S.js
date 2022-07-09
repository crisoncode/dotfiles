'use strict';

const assert = require('chai').assert;
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();
const mockCollections = require('../../../mocks/util/collections');

describe('ProductHelper script', function () {
    const productHelper = proxyquire('../../../../cartridges/app_storefront_common/cartridge/scripts/productHelper.js', {
        '*/cartridge/scripts/util/collections': { map: mockCollections.map }
    });

    describe('isColorSelectorEnabled() function', function () {
        it('Enable colors selector in PDP', function () {
            // dw.catalog.Category
            const primaryCategory = {
                custom: {
                    enableColorSelectorInProducts: true
                }
            };
            let enableColorsSelector = productHelper.isColorSelectorEnabled(primaryCategory);
            assert.isTrue(enableColorsSelector);
        });

        it('Disable colors selector in PDP', function () {
            // dw.catalog.Category
            let primaryCategory = {
                custom: {
                    enableColorSelectorInProducts: null
                }
            };
            let enableColorsSelector = productHelper.isColorSelectorEnabled(primaryCategory);
            assert.isFalse(enableColorsSelector);

            primaryCategory.custom.enableColorSelectorInProducts = false;
            enableColorsSelector = productHelper.isColorSelectorEnabled(primaryCategory);
            assert.isFalse(enableColorsSelector);
        });

        it('Primary category does not exists in a product', function () {
            // dw.catalog.Category
            const primaryCategory = null;
            let enableColorsSelector = productHelper.isColorSelectorEnabled(primaryCategory);
            assert.isFalse(enableColorsSelector);
        });
    });

    describe('getColorsNameListSeparatedByComma() function', function () {
        it('Build colors name list with 4 colors', function () {
            // dw.catalog.Category
            const variationGroups = [
                { custom: { firstColor: 'Blue' } },
                { custom: { firstColor: 'Red' } },
                { custom: { firstColor: 'Lila' } },
                { custom: { firstColor: 'Transparent' } }
            ];

            let colorsNameList = productHelper.getColorsNameListSeparatedByComma(variationGroups);
            assert.equal(colorsNameList, 'Blue, Red');
        });

        it('Build colors name list with 2 colors', function () {
            // dw.catalog.Category
            const variationGroups = [
                { custom: { firstColor: 'Blue' } },
                { custom: { firstColor: 'Red' } }
            ];
            let colorsNameList = productHelper.getColorsNameListSeparatedByComma(variationGroups);
            assert.equal(colorsNameList, 'Blue, Red');
        });

        it('Build colors name list with 1 colors', function () {
            // dw.catalog.Category
            const variationGroups = [
                { custom: { firstColor: 'Cian' } }
            ];
            let colorsNameList = productHelper.getColorsNameListSeparatedByComma(variationGroups);
            assert.equal(colorsNameList, 'Cian');
        });

        it('Build colors name list without variation colors', function () {
            // dw.catalog.Category
            const variationGroups = [];
            let colorsNameList = productHelper.getColorsNameListSeparatedByComma(variationGroups);
            assert.equal(colorsNameList, '');
        });
    });
});
