'use strict';

const gallery = require('./productRedesignComponents/gallery');
const tieredPrices = require('./productRedesignComponents/tieredPrices');
const variationSelectors = require('./productRedesignComponents/variationSelectors');
const stock = require('./productRedesignComponents/stock'); TODO-REDESIGN
const whistList = require('./productRedesignComponents/whistList');
const quantity = require('./productRedesignComponents/quantity');

$(function () {
    gallery.build();
    tieredPrices.build();
    variationSelectors.build();
    // stock.build(); TODO-REDESIGN
    whistList.build();
    quantity.build();
});
