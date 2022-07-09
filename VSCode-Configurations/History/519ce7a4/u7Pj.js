'use strict';

const assert = require('chai').assert;
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('Product masterAttrs decorator', function () {
    var masterAttrs = proxyquire('../../../../../../cartridges/app_storefront_common/cartridge/models/product/decorators/masterAttrs', {
        'dw/system/Site': {
            getCurrent: function () {
                return {
                    getCustomPreferenceValue: function (key) {
                        if (key === 'pdpBadgeIncludedCategories') {
                            return '["14240","14257","14260"]';
                        }

                        return false;
                    }
                };
            }
        }
    });

    it('Test', function () {
        let mockObject = {
            categories: [
                {
                    ID: '14240',
                    parent: {
                        ID: 'root'
                    }
                }
            ]
        };

        let mockMasterProduct = {
            custom: {
                subProductType: 'test',
                stringStructure: 'candela'
            }
        };

        masterAttrs(mockObject, mockMasterProduct);

        assert.equal(mockObject.subProductType, 'test');
    });

    /* it('Site preference pdpBadgeIncludedCategories has no value', function () {
    });

    it('Product has no categories', function () {
    });

    it('Product belongs to an included category', function () {
    });

    it('Master product has subProductType', function () {
    });

    it('Master product has stringStructure', function () {
    }); */
});
