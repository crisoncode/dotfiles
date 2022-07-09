'use strict';


const assert = require('chai').assert;
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

const productHelper = proxyquire('../../../../cartridges/app_storefront_common/cartridge/scripts/productHelper.js', {});

