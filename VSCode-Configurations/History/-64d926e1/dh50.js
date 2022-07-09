'use strict';

const quantity = require('./quantity');
const stringingService = require('../product/stringingracket/stringingService');

const configurations = {
    productDetail: '.js-product-detail-container',
    giftCardModal: '#giftCardModal',
    addToCart: {
        button: '.js-add-to-cart',
        disabled: '.js-add-to-cart[disabled] + .disabled-area',
        url: '.js-add-to-cart-url',
        sizeMsg: '.select-size-text'
    }
};

/**
 * Updates pid attribute
 * @param {string} variationPid - Variation product ID
 */
function updatePid(variationPid) {
    $(configurations.addToCart.button).data('pid', variationPid);
}

/**
 * Enables/disables Add to cart button
 * @param {boolean} enable - True/false to enable or disable button
 */
function enableAddToCartBtn(enable) {
    if (enable) {
        $(configurations.addToCart.button).removeAttr('disabled');
    } else {
        $(configurations.addToCart.button).attr('disabled');
    }
}

/**
 * Hides/shows "Please select a size" message
 * @param {boolean} show - True/false to show or hide message
 */
function showAddToCartSizeMsg(show) {
    if (show) {
        $(configurations.addToCart.sizeMsg).removeClass('d-none');
    } else {
        $(configurations.addToCart.sizeMsg).addClass('d-none');
    }
}

/**
 * Update datalayer with Add to cart event
 * @param {Object} form - form sent to controller
 * @param {Object} response - response data from controller
 */
function updateDatalayer(form, response) {
    if (!response.modal) {
        window.GTMTracking.trackAddToCart(form.pid, form.quantity, response.cartProducts);
    }
}

/**
 * Show gift card modal
 */
function showGiftCardModal() {
    const giftCardModal = $(configurations.giftCardModal);
    if (giftCardModal && giftCardModal.length > 0) {
        giftCardModal.modal('show');
    }
}

/**
 * Triggers minicart events after Add to cart
 * @param {Object} response - response data from controller
 */
function triggerMinicart(response) {
    // Updates minicart quantity label
    $('.minicart').trigger('count:update', response);

    if (response.newBonusDiscountLineItem
        && Object.keys(response.newBonusDiscountLineItem).length !== 0) {
            // TODO-REDESIGN Bonus products
            // chooseBonusProducts(response.newBonusDiscountLineItem);
    } else {
        if (response.error && response.quantityMaxAvailable) {
            $(quantity.qtyConfiguration.inputSelector).val('1');
        } else if (!response.error) {
            $(window).scrollTop(0);

            if (!response.modal) {
                $('.minicart-link').trigger('mouseover', true);
            }
        }

        // Shows Add to cart toast message
        $('.minicart').trigger('message:update', response);
    }
}

/**
 * Add to cart action
 * @param {jquery} addToCartBtn - DOM element for the Add to cart button
 */
function addToCart(addToCartBtn) {
    const pid = addToCartBtn.data('pid');
    const addToCartUrl = $(configurations.addToCart.url).val();

    const form = {
        pid: pid,
        quantity: quantity.getActualQty()
        // TODO-REDESIGN Bonus products
        // options: getOptions($productContainer)
    };

    if (addToCartUrl) {
        $.spinner().start();
        $.ajax({
            url: addToCartUrl,
            method: 'POST',
            data: form,
            success: function (data) {
                updateDatalayer(form, data);
                triggerMinicart(data);

                if (data.showGiftCardMessageOnPdp) {
                    showGiftCardModal();
                }

                addToCartBtn.trigger('product:afterAddToCart', data);

                $.spinner().stop();
            }
        });
    }
}

/**
 * Initializes Add to cart actions for both disabled and enabled buttons
 */
function initAddToCart() {
    $(document).on('click', configurations.addToCart.disabled, function () {
        showAddToCartSizeMsg(true);
    });

    $(document).on('click', configurations.addToCart.button, function () {
        // Shows stringing-modal-dialog, on the first attempt to add to cart, if product is a stringable tennis-racket
        if ($(this).hasClass('stringing-add-to-cart')) {
            $(this).trigger('show.stringing-modal');
            $(this).removeClass('stringing-add-to-cart');

            return;
        }

        addToCart($(this));
    });
}

/**
 * Build function
 */
function build() {
    initAddToCart();

    $('.stringing-add-to-cart').on('show.stringing-modal', stringingService.showStringingModalBox);
}

module.exports = {
    build: build,
    updatePid: updatePid,
    enableAddToCartBtn: enableAddToCartBtn,
    showAddToCartSizeMsg: showAddToCartSizeMsg
};
