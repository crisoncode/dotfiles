'use strict';

const assert = require('chai').assert;
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('Helpers - Badges', function () {
    var badgesHelper = proxyquire('../../../../../cartridges/app_storefront_common/cartridge/scripts/helpers/badges.js', {});

    describe('getBadges() function', function () {

        it('should return one badge', function () {

            const product = {

            };
        });

    });
});
