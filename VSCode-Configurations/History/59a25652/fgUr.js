'use strict';

const racketSizeSelector = require('./racketSizeSelector');

const configurations = {
    productContainerSelector: '.js-product-detail-container',
    sizes: {
        dropdownSelector: '.js-sizes-selector',
        eventListenerSelector: '.js-sizes-selector .js-va-item-size',
        selectedSizeSelector: '.js-size-selected-value'
    },
    shoeSizes: {
        clickLocaleButtonSelector: '.js-shoes-size-select .js-locale',
        localesContainer: '.js-shoes-size-select .js-container-locale'
    }
};

/**
 * Paint the selected size inside the size selector
 * @param {Object} product Contains all the product info getted by the Ajax call
 */
function paintSelectedSize(product) {
    let selectedSize = '-';

    if (product.variationAttributes) {
        const sizesVariationAttr = product.variationAttributes.filter(function (element) {
            return element.id === 'size';
        });

        const selectedAttribute = sizesVariationAttr[0].values.filter(function (element) {
            return element.selected;
        });

        selectedSize = selectedAttribute[0] && selectedAttribute[0].displayValue ? selectedAttribute[0].displayValue : selectedSize;
    }

    $(configurations.sizes.selectedSizeSelector).html(selectedSize);
}

/**
 * This method makes the ajax call for refresh all the things that involves the variation product choice.
 * @param {jQuery} element jQuery element with the selected variant
 */
const buildVariationChoiceAjaxCall = (element) => {
    const selectedVariantURL = element.attr('href');

    if (selectedVariantURL && selectedVariantURL.length > 0) {
        $.ajax({
            url: selectedVariantURL,
            method: 'GET',
            success: function (data) {
                const productObject = data.product;

                if (productObject) {
                    paintSelectedSize(productObject);
                    $(configurations.productContainerSelector).find('.product-delivery').replaceWith(productObject.deliveryRedesignHtml);
                }
            }
        });
    }
};

/**
 * This function builds the shoe size selector with tabs inner for EU, UK and US localized sizing.
 */
function initShoeSizeSelector() {
    if ($(configurations.shoeSizes.clickLocaleButtonSelector).length > 0) {
        $(document).on('click', configurations.shoeSizes.clickLocaleButtonSelector, (ev) => {
            ev.preventDefault();
            ev.stopPropagation();

            const currentTarget = $(ev.currentTarget);
            const locale = currentTarget.data('locale');
            const dropDown = currentTarget.closest('.dropdown-menu');

            $(configurations.shoeSizes.localesContainer).removeClass('active');

            currentTarget.addClass('active');

            dropDown.find('.inner').removeClass('active');
            dropDown.find('.' + locale).addClass('active');
            dropDown.addClass('show');
        });
    }
}

/**
 * This method enables the storeinventory list for mobile devices.
 */
function initStoreInventorySizeSelector() {
    $(document).on('click', (ev) => {
        ev.preventDefault();

        const $currentTarget = $(ev.currentTarget);
        const urlAction = $currentTarget.data('url');

        $('#storeInventoryList').spinner().start();

        $.ajax({
            url: urlAction,
            method: 'GET',
            success: function (data) {
                // Load request content into the modal box
                $('#storeInventoryModal #storeInventoryList').html(data);
                $('#storeInventoryList').spinner().stop();
            },
            error: function () {
                $('#storeInventoryList').spinner().stop();
            }
        });
    });
}

const initSizeSelectorEvent = () => {
    const $sizesDropdown = $(configurations.sizes.dropdownSelector);
    if ($sizesDropdown.length > 0) {
        $(configurations.sizes.eventListenerSelector).on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();

            buildVariationChoiceAjaxCall($(this));

            $(this).parent().dropdown('toggle');
        });
    }
};

const build = () => {
    initShoeSizeSelector();
    initStoreInventorySizeSelector();
    initSizeSelectorEvent();
    racketSizeSelector.build();
};

module.exports = {
    build: build,
    buildVariationChoiceAjaxCall: buildVariationChoiceAjaxCall
};
