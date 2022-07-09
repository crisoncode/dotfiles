'use strict';


const assert = require('chai').assert;
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

const jose = proxyquire('../../../../cartridges/app_storefront_common/cartridge/scripts/jose.js', {
    'dw/system/Site': { }
});

const order = {
    getProductLineItems: function () {
        let array = [
            { // productLineItem
                id: 3232,
                custom: {
                    isFakeProduct: false
                }
            },
            { // productLineItem
                id: 3333,
                custom: {
                    isFakeProduct: true
                }
            },
            { // productLineItem
                id: 3334,
                custom: {
                    isFakeProduct: false
                }
            }
        ];
        return array;
    }
};

describe('Jose script', function () {
    describe('probando funcion getFakeProductFromOrder() function', function () {
        it('Step 1 - Test normales', function () {
            let result = jose.getFakeProductFromOrder(order);
            assert.equal(result.id, 3333);

            let nullResult = jose.getFakeProductFromOrder(null);
            assert.equal(nullResult, null);
        });
    });
});
