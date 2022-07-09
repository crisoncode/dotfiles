'use strict';

const variationsSelector = require('./variationSelectors');

const configurations = {
    racketSize: {
        selector: '.js-racket-size-oos-tooltip',
        contentSelector: '.js-racket-size-oos-tooltip-content',
        eventListenerSelector: '.js-va-item-racket-size',
        containerSelector: '.js-racket-sizes-selector'
    }
};

/**
 * Build racket size tooltip for show out of stock variants.
 */
const buildRacketSizeTooltip = () => {
    const sizeTooltips = $(configurations.racketSize.selector);

    if (sizeTooltips.length > 0) {
        sizeTooltips.attr('title', $(configurations.racketSize.contentSelector).html());
        sizeTooltips.tooltip();
    }
};

const initSizeSelectorEvent = () => {
    const $sizesSelectors = $(configurations.racketSize.contentSelector);
    variationsSelector.buildVariationChoiceAjaxCall($(this));
};

const build = () => {
    initSizeSelectorEvent();
    buildRacketSizeTooltip();
};

module.exports = {
    build: build
};
