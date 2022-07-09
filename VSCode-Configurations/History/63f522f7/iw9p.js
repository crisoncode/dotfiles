'use strict';

const assert = require('chai').assert;
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('Helpers - Badges', function () {
    const categoriesBreadcrumb = proxyquire('../../../../../cartridges/int_customfeeds/cartridge/scripts/helper/categoriesBreadcrumb.js', {});

    describe('() function', function () {
        it('Compare input email equals output email', function () {

        });
    });
});
