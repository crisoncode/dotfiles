'use strict';

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

/**
 * Initializing selector of racket size listeners
 */
function initSizeSelectorEvent() {
    const $sizesSelectors = $(configurations.racketSize.contentSelector);
    const variationsSelector = require('./variationSelectors');

    if ($sizesSelectors.length > 0) {
        $(configurations.racketSize.eventListenerSelector).on('click', function (event) {
            let notSelected = !$(this).hasClass('selected');

            event.preventDefault();
            event.stopPropagation();

            $(configurations.racketSize.eventListenerSelector).removeClass('selected');

            if (notSelected) {
                $(this).addClass('selected');
            }

            variationsSelector.buildVariationChoiceAjaxCall($(this));
        });
    }
}

const build = () => {
    initSizeSelectorEvent();
    buildRacketSizeTooltip();
};

module.exports = {
    build: build
};
