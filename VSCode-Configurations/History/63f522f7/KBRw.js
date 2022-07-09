'use strict';

const assert = require('chai').assert;
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('Helpers - Badges', function () {
    const categoriesBreadcrumb = proxyquire('../../../../../cartridges/int_customfeeds/cartridge/scripts/helper/categoriesBreadcrumb.js', {});

    describe('getSiteProducts() function', function () {

        it('the iterator contains products', function () {

        });

        it('the site does not have catalog assigned', function () {

        });

        it('the site does not have products assigned to the catalog', function () {

        });

    });
});
