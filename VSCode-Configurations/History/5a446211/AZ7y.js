'use strict';

const gallery = require('./productRedesignComponents/gallery');
const tieredPrices = require('./productRedesignComponents/tieredPrices');
const variationSelectors = require('./productRedesignComponents/variationSelectors');
const whistList = require('./productRedesignComponents/whistList');
const quantity = require('./productRedesignComponents/quantity');
const addToCart = require('./productRedesignComponents/addToCart');

$(function () {
    processInclude(require('./product/imageGallery'));
    gallery.build();
    tieredPrices.build();
    variationSelectors.build();
    whistList.build();
    quantity.build();
    addToCart.build();
});
