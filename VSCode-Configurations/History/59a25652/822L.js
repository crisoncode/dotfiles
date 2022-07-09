'use strict';

const racketSizeSelector = require('./racketSizeSelector');
const shipping = require('./shipping');
const stock = require('./stock');
const addToCart = require('./addToCart');


const configurations = {
    productContainerSelector: '.js-product-detail-container',
    sizes: {
        dropdownSelector: '.js-sizes-selector',
        eventListenerSelector: '.js-sizes-selector .js-va-item-size',
        selectedSizeSelector: '.js-size-selected-value'
    },
    shoeSizes: {
        clickLocaleButtonSelector: '.js-shoes-size-select .js-locale',
        currentLocale: 'span.locale.js-locale.active',
        localesContainer: '.js-shoes-size-select .js-container-locale'
    },
    storeInventoryModalID: '#storeInventoryModal .size'
};

/**
 * Check the current value to find the size related to locale
 * @param {Object} sizes have the sizes for the selected current variation
 * @returns {string} the size value related to the selected locale
 */
function getSelectedLocaleSize(sizes) {
    const locale = $(configurations.shoeSizes.currentLocale).data('locale');

    if (locale === 'en-locale' && sizes.enSize) {
        return sizes.enSize;
    } else if (locale === 'us-locale' && sizes.usSize) {
        return sizes.usSize;
    } else if (sizes.euSize) {
        return sizes.euSize;
    }

    return '-';
}

/**
 * Generates html for promotions section
 *
 * @param {array} promotions - list of promotions
 * @return {string} - Compiled HTML
 */
function getPromotionsHtml(promotions) {
    let html = '';

    for (let promotion of promotions) {
        html += '<div class="callout" title="' + promotion.details + '">' + promotion.calloutMsg + '</div>';
    }

    return html;
}

/**
 * build and render promotion messages
 * @param {Object} productAjax result from ajax answer when a customer choice a variation
 */
function buildPromotionsBlock(productAjax) {
    try {
        if (productAjax.promotions && productAjax.promotions.length > 0) {
            let htmlToRender = getPromotionsHtml(productAjax.promotions);
            $('.js-promos').empty().html(getPromotionsHtml(htmlToRender));
        }
    } catch (err) {
        throw new Error('Problem while rendering promotions in PDP');
    }
}

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

        selectedSize = selectedAttribute[0] ? getSelectedLocaleSize(selectedAttribute[0]) : selectedSize;
    }

    $(configurations.sizes.selectedSizeSelector).html(selectedSize);
}

/**
 * This method makes the ajax call for refresh all the things that involves the variation product choice.
 * @param {jQuery} element jQuery element with the selected variant
 */
function buildVariationChoiceAjaxCall(element) {
    const selectedVariantURL = element.attr('href');

    if (selectedVariantURL && selectedVariantURL.length > 0) {
        $.ajax({
            url: selectedVariantURL,
            method: 'GET',
            success: function (data) {
                const productObject = data.product;

                if (productObject) {
                    paintSelectedSize(productObject);
                    buildPromotionsBlock(productObject);
                    $(configurations.productContainerSelector).find('.product-delivery').replaceWith(productObject.deliveryRedesignHtml);
                    shipping.refreshShippingInfo(productObject.shippingRedesignHtml);
                    stock.refreshStockInfo(productObject.stockHtml);
                    addToCart.updatePid(productObject.id);
                    addToCart.enableAddToCartBtn(true);
                    addToCart.showAddToCartSizeMsg(false);
                }
            }
        });
    }
}

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
    $(document).on('click', configurations.storeInventoryModalID, (ev) => {
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

/**
 * initializing size selector event
 */
function initSizeSelectorEvent() {
    const $sizesDropdown = $(configurations.sizes.dropdownSelector);

    if ($sizesDropdown.length > 0) {
        $(configurations.sizes.eventListenerSelector).on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();

            buildVariationChoiceAjaxCall($(this));

            $(this).parent().dropdown('toggle');
        });
    }
}


/**
 * Method to init all the things related with this component
 */
function build() {
    initShoeSizeSelector();
    initStoreInventorySizeSelector();
    initSizeSelectorEvent();
    racketSizeSelector.build();
}

module.exports = {
    build: build,
    buildVariationChoiceAjaxCall: buildVariationChoiceAjaxCall
};
