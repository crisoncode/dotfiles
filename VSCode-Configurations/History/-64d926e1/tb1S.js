'use strict';

const quantity = require('./quantity');
const stringingService = require('../product/stringingracket/stringingService');

const configurations = {
    productDetail: '.js-product-detail-container',
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
 * Retrieves url to use when adding a product to the cart
 *
 * @param {Object} data - data object used to fill in dynamic portions of the html
 */
function chooseBonusProducts(data) {
    $('.modal-body').spinner().start();

    if ($('#chooseBonusProductModal').length !== 0) {
        $('#chooseBonusProductModal').remove();
    }
    var bonusUrl;
    if (data.bonusChoiceRuleBased) {
        bonusUrl = data.showProductsUrlRuleBased;
    } else {
        bonusUrl = data.showProductsUrlListBased;
    }
    var htmlString = '<!-- Modal -->'
        + '<div class="modal fade" id="chooseBonusProductModal" role="dialog">'
        + '<div class="modal-dialog choose-bonus-product-dialog" '
        + 'data-total-qty="' + data.maxBonusItems + '"'
        + 'data-UUID="' + data.uuid + '"'
        + 'data-pliUUID="' + data.pliUUID + '"'
        + 'data-addToCartUrl="' + data.addToCartUrl + '"'
        + 'data-pageStart="0"'
        + 'data-pageSize="' + data.pageSize + '"'
        + 'data-moreURL="' + data.showProductsUrlRuleBased + '"'
        + 'data-bonusChoiceRuleBased="' + data.bonusChoiceRuleBased + '">'
        + '<!-- Modal content-->'
        + '<div class="modal-content">'
        + '<div class="modal-header">'
        + '    <span class="">' + data.labels.selectprods + '</span>'
        + '    <button type="button" class="close pull-right" data-dismiss="modal">&times;</button>'
        + '</div>'
        + '<div class="modal-body"></div>'
        + '<div class="modal-footer"></div>'
        + '</div>'
        + '</div>'
        + '</div>';
    $('body').append(htmlString);
    $('.modal-body').spinner().start();

    $.ajax({
        url: bonusUrl,
        method: 'GET',
        dataType: 'html',
        success: function (html) {
            var parsedHtml = parseHtml(html);
            $('#chooseBonusProductModal .modal-body').empty();
            $('#chooseBonusProductModal .modal-body').html(parsedHtml.body);
            $('#chooseBonusProductModal .modal-footer').html(parsedHtml.footer);

            var modalDiv = $('#chooseBonusProductModal');
            modalDiv.modal('show');
            modalDiv.on('shown.bs.modal', function () {
                new BonusProductSlider();  // eslint-disable-line
                $(document).trigger('selectpicker.init');
                $.spinner().stop();
            });
        },
        error: function () {
            $.spinner().stop();
        }
    });
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

                /* TODO-REDESIGN Gift card message
                if (response.showGiftCardMessageOnPdp) {
                    const giftCardModal = $('#giftCardModal');
                    if (giftCardModal && giftCardModal.length > 0) {
                        giftCardModal.modal('show');
                    }
                } */

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
