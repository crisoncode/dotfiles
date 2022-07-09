'use strict';

var base = require('../product/base');
var productDetail = require('../product/detail');
var TPCookie = require('app_storefront_common/src/default/js/tpCookie');

/**
 * appends params to a url
 * @param {string} url - Original url
 * @param {Object} params - Parameters to append
 * @returns {string} result url with appended parameters
 */
function appendToUrl(url, params) {
    var newUrl = url;
    newUrl += (newUrl.indexOf('?') !== -1 ? '&' : '?') + Object.keys(params).map(function (key) {
        return key + '=' + encodeURIComponent(params[key]);
    }).join('&');

    return newUrl;
}

/**
 * Checks whether the basket is valid. if invalid displays error message and disables
 * checkout button
 * @param {Object} data - AJAX response from the server
 */
function validateBasket(data) {
    if (data.valid.error) {
        if (data.valid.message) {
            var errorHtml = '<div class="alert alert-danger alert-dismissible valid-cart-error ' +
                'fade show" role="alert">' +
                '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
                '<span aria-hidden="true">&times;</span>' +
                '</button>' + data.valid.message + '</div>';

            $('.cart-error').html(errorHtml);
        } else {
            $('.cart').empty().append('<div class="row"> ' +
                '<div class="col-12 text-center"> ' +
                '<h1>' + data.resources.emptyCartMsg + '</h1> ' +
                '</div> ' +
                '</div>'
            );
            $('.item-count').empty().append(data.resources.numberOfItems);
        }

        $('.checkout-btn').addClass('disabled');
    } else {
        $('.checkout-btn').removeClass('disabled');
    }
}

/**
 * re-renders the order totals and the number of items in the cart
 * @param {Object} data - AJAX response from the server
 */
function updateCartTotals(data) {
    $('.item-count').empty().append(data.resources.numberOfItems);
    $('.coupons-and-promos').empty().append(data.totals.discountsHtml).append(data.giftCardHtml);
    $('.shipping-cost').empty().append(data.totals.totalShippingCost);
    $('.subtotal').empty().append(data.totals.subTotal);
    $('.tax-total').empty().append(data.totals.totalTax);
    $('.grand-total').empty().append(data.totals.grandTotal);
    $('.sub-total').empty().append(data.totals.subTotal);
    $('.minicart-quantity').empty().append(data.numItems);

    var $saving = $('.saving');
    if (data.itemSaving) {
        $saving.find('.value').html(data.itemSaving);
        $saving.show();
    } else {
        $saving.hide();
    }

    if (data.totals.orderLevelDiscountTotal.value > 0) {
        $('.order-discount').removeClass('hide-order-discount');
        $('.order-discount-total').empty()
            .append('- ' + data.totals.orderLevelDiscountTotal.formatted);
    } else {
        $('.order-discount').addClass('hide-order-discount');
    }

    if (data.totals.shippingLevelDiscountTotal.value > 0) {
        $('.shipping-discount').removeClass('hide-shipping-discount');
        $('.shipping-discount-total').empty().append('- ' +
            data.totals.shippingLevelDiscountTotal.formatted);
    } else {
        $('.shipping-discount').addClass('hide-shipping-discount');
    }

    data.items.forEach(function (item) {
        $('.item-' + item.UUID).empty().append(item.renderedPromotions);
        $('.item-price-' + item.UUID).empty().append(item.price.renderedPrice);
        $('.item-total-' + item.UUID).empty().append(item.priceTotal.renderedPrice);
    });
}

/**
 * re-renders the order totals and the number of items in the cart
 * @param {Object} message - Error message to display
 * @param {Object} type - Alert type class (Bootstrap class)
 */
function createNotification(message, type) {
    var alertType = type || 'danger';
    var errorHtml = '<div class="alert alert-' + alertType + ' alert-dismissible valid-cart-error ' +
        'fade show" role="alert">' +
        '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
        '<span aria-hidden="true">&times;</span>' +
        '</button>' + message + '</div>';

    $('.cart-error').html(errorHtml);
}

/**
 * re-renders the approaching discount messages
 * @param {Object} approachingDiscounts - updated approaching discounts for the cart
 */
function updateApproachingDiscounts(approachingDiscounts) {
    var html = '';
    $('.approaching-discounts').empty().hide();
    if (approachingDiscounts.length > 0) {
        approachingDiscounts.forEach(function (item) {
            html += '<div class="single-approaching-discount">'
                + item.discountMsg + '</div>';
        });
    }
    $('.approaching-discounts').append(html);

    if (html.length) {
        $('.approaching-discounts').show();
    }
}

/**
 * triggers an ajax request to retrieve delivery time of product line items
 * the list of PLIs ist retrieved from the data-url of the elements selected via the passed selector
 *
 * @param {*} lineItemsSelector - Selecotor
 */
function loadPLIDeliveryTime(lineItemsSelector) {
    var pliDeliveryTimeElements = $(lineItemsSelector);
    var actionUrl = $('.table.table-products').data('deliverytimeurl');
    if (actionUrl) {
        var pliIDs = [];
        for (var i = 0; i < pliDeliveryTimeElements.length; i++) {
            pliIDs.push($(pliDeliveryTimeElements[i]).data('pliid'));
        }
        if (pliIDs.length > 0) {
            $.ajax({
                url: actionUrl + '?plis=' + pliIDs.join(','),
                method: 'GET',
                dataType: 'json',
                complete: function (data) {
                    for (var i = 0; i < pliDeliveryTimeElements.length; i++) { //eslint-disable-line
                        var pliElement = $(pliDeliveryTimeElements[i]);
                        pliElement.html(data.responseJSON.deliveryTimesInfos[pliElement.data('pliid')]);
                    }
                }
            });
        }
    }
}

module.exports = function () {
    $('body').on('click', '.remove-product:not(.remove-conf)', function (e) {
        e.preventDefault();

        var actionUrl = $(this).data('action');
        var productID = $(this).data('pid');
        var productName = $(this).data('name');
        var productSize = $(this).data('size');
        var productPrice = $(this).data('price');
        var productQuantity = $(this).data('quantity');
        var uuid = $(this).data('uuid');

        var $deleteConfirmBtn = $('.cart-delete-confirmation-btn');
        var $productToRemoveSpan = $('.product-to-remove');

        $deleteConfirmBtn.data('pid', productID);
        $deleteConfirmBtn.data('name', productName);
        $deleteConfirmBtn.data('size', productSize);
        $deleteConfirmBtn.data('price', productPrice);
        $deleteConfirmBtn.data('quantity', productQuantity);
        $deleteConfirmBtn.data('action', actionUrl);
        $deleteConfirmBtn.data('uuid', uuid);

        $productToRemoveSpan.empty().append(productName);
    });

    // used for stringing service configuration line items and personalization configuration line items
    $('body').on('click', '.remove-product.remove-conf', function (e) {
        e.preventDefault();

        var rowContainer = $(this).parents('.table-row');
        var configurationId = rowContainer.data('configid');
        var configurationelements = $('div.table-row[data-configid="' + configurationId + '"]');

        if (!configurationId) {
            configurationId = $(this).data('configid');
            configurationelements = $('div.product-line-item[data-configid="' + configurationId + '"]');
        }

        var lineItemsToDelete = [];

        for (var index = 0; index < configurationelements.length; index++) {
            var uuid = $(configurationelements[index]).data('uuid');
            lineItemsToDelete.push(uuid);
        }
        var actionUrl = $(this).data('action');
        var productName = $(this).data('name');
        var $deleteConfirmBtn = $('.cart-delete-conf-confirmation-btn');
        var $productToRemoveSpan = $('.product-to-remove');

        $productToRemoveSpan.empty().append(productName);
        $deleteConfirmBtn.data('action', actionUrl);
        $deleteConfirmBtn.data('uuids', lineItemsToDelete.join(';'));
    });

    $('.optional-promo').click(function (e) {
        e.preventDefault();
        $('.promo-code-form').toggle();
    });

    $('body').on('click', '.cart-delete-confirmation-btn', function (e) {
        e.preventDefault();
        var productID = $(this).data('pid');
        var productName = $(this).data('name');
        var size = $(this).data('size');
        var price = $(this).data('price');
        var quantity = $(this).data('quantity');
        var url = $(this).data('action');
        var uuid = $(this).data('uuid');
        var urlParams = {
            pid: productID,
            uuid: uuid
        };

        GTMTracking.trackRemoveFromCart(productID, productName, price, size, quantity); // eslint-disable-line

        url = appendToUrl(url, urlParams);

        $('body > .modal-backdrop').remove();

        $.spinner().start();
        $.ajax({
            url: url,
            type: 'get',
            dataType: 'json',
            success: function () {
                location.reload();
                $.spinner().stop();
            },
            error: function (err) {
                if (err.responseJSON.redirectUrl) {
                    window.location.href = err.responseJSON.redirectUrl;
                } else {
                    createNotification(err.responseJSON.errorMessage, 'danger');
                    $.spinner().stop();
                }
            }
        });
    });

    $('body').on('click', '.cart-delete-conf-confirmation-btn', function (e) {
        e.preventDefault();
        var url = $(this).data('action');
        var uuids = $(this).data('uuids');
        var urlParams = {
            uuids: uuids
        };

        url = appendToUrl(url, urlParams);

        $('body > .modal-backdrop').remove();
        $.ajax({
            url: url,
            type: 'get',
            dataType: 'json',
            success: function () {
                location.reload();
            }
        });
    });

    $('body').on('change', '.quantity-config-form > .quantity', function () {
        $.spinner().start();

        var $select = $(this);
        var quantity = $select.val();
        var configid = $select.data('configid');
        var configurationelements = $('div.table-row[data-configid="' + configid + '"]');
        var lineItemsUpdate = [];

        for (var index = 0; index < configurationelements.length; index++) {
            var uuid = $(configurationelements[index]).data('uuid');
            lineItemsUpdate.push(uuid);
        }

        var url = $(this).data('action');
        var urlParams = {
            quantity: quantity,
            uuids: lineItemsUpdate.join(';')
        };

        url = appendToUrl(url, urlParams);

        $(this).parents('.card').spinner().start();

        $.ajax({
            url: url,
            type: 'get',
            context: this,
            success: function () {
                location.reload();
                $.spinner().stop();
            },
            error: function () {
                $.spinner().stop();
            }
        });
    });

    $('body').on('change', '.quantity-form > .quantity', function (evt) {
        $.spinner().start();

        var $select = $(evt.target);
        var preSelectQty = $select.data('pre-select-qty');
        var quantity = $select.val();
        var productID = $select.data('pid');
        var uuid = $select.data('uuid');
        var thisElm = $(this);
        var dataURL = $select.data('action');
        var splitURL = dataURL.split('?quantity=');
        var url = splitURL[0];

        var urlParams = {};
        urlParams.pid = productID;
        urlParams.uuids = uuid;
        urlParams.quantity = quantity;
        url = appendToUrl(url, urlParams);

        thisElm.parents('.card').spinner().start();

        $.ajax({
            url: url,
            type: 'get',
            context: this,
            dataType: 'json',
            success: function (data) {
                if (!$select.data('action').match(/adjustqnt/)) {
                    $('.cart-error').html('');
                }
                // Test rackets has an order limit of 3 pieses.
                if (data.error && data.reason === 'INVALID_TEST_RACKETS_QUANTITY') {
                    // Show alert message
                    var $modal = $('#genericModalBox');
                    $modal.modal('show');
                    $modal.find('.modal-title').html(data.messageTitle);
                    $modal.find('.modal-body').html(`<h3>${data.message}</h3>`);

                    // Set input select to prev state
                    $select.val(parseInt(preSelectQty, 10));

                    // Stop spinner and finish logic
                    $.spinner().stop();
                    return;
                } else if (data.error && data.reason === 'QUANTITY_LIMIT_REACHED') {
                    createNotification(data.errorMessage, 'info');

                    // Set input select to prev state
                    $select.val(parseInt(preSelectQty, 10));

                    // Stop spinner and finish logic
                    $.spinner().stop();
                    return;
                }
                location.reload();
            },
            error: function (err) {
                if (err.responseJSON.redirectUrl) {
                    window.location.href = err.responseJSON.redirectUrl;
                } else {
                    if (err.responseJSON.errorMessage) {
                        createNotification(err.responseJSON.errorMessage, 'danger');
                    }

                    if (err.responseJSON.quantityMaxAvailable && err.responseJSON.quantityMaxAvailable !== 0) {
                        thisElm.val(err.responseJSON.quantityAlreadyInCart);
                    }

                    $.spinner().stop();
                }
            }
        });
    });

    $('body').on('change', '.size-form select.size-select', function (e) {
        const $selection = $(e.currentTarget);
        const urlAction = appendToUrl($selection.data('action'), {
            quantity: $selection.data('quantity'),
            uuid: $selection.data('uuid'),
            pid: $selection.data('pid'),
            variantId: $selection.val()
        });

        $('.cart-error-messaging').empty();
        $.spinner().start();

        $.ajax({
            url: urlAction,
            type: 'GET',
            context: this,
            dataType: 'JSON',
            success: ({ basket, pid, uuid, error, message }) => { // eslint-disable-line
                // revert selected size on any error
                if (error) {
                    $selection.val($selection.data('pid'));
                    createNotification(message, 'danger');
                    $.spinner().stop();
                } else {
                    location.reload();
                }
            },
            error: ({ responseJSON }) => {
                createNotification(responseJSON.message, 'danger');
                $selection.val($selection.data('pid'));
                $.spinner().stop();
            }
        });
    });

    $('.shippingMethods').change(function () {
        var url = $(this).attr('data-actionUrl');
        var urlParams = {
            methodID: $(this).find(':selected').attr('data-shipping-id')
        };
        // url = appendToUrl(url, urlParams);

        $('.totals').spinner().start();
        $.ajax({
            url: url,
            type: 'post',
            dataType: 'json',
            data: urlParams,
            success: function (data) {
                if (data.error) {
                    window.location.href = data.redirectUrl;
                } else {
                    $('.coupons-and-promos').empty().append(data.totals.discountsHtml);
                    updateCartTotals(data);
                    updateApproachingDiscounts(data.approachingDiscounts);
                    validateBasket(data);
                }
                $.spinner().stop();
            },
            error: function (err) {
                if (err.redirectUrl) {
                    window.location.href = err.redirectUrl;
                } else {
                    createNotification(err.responseJSON.errorMessage, 'danger');
                    $.spinner().stop();
                }
            }
        });
    });

    $('.promo-code-form').submit(function (e) {
        e.preventDefault();
        $.spinner().start();
        $('.coupon-missing-error').hide();
        $('.coupon-error-message').empty();
        if (!$('.coupon-code-field').val()) {
            $('.promo-code-form .form-control').addClass('is-invalid');
            $('.coupon-missing-error').show();
            $.spinner().stop();
            return false;
        }
        var $form = $('.promo-code-form');
        $('.promo-code-form .form-control').removeClass('is-invalid');
        $('.coupon-error-message').empty();

        $.ajax({
            url: $form.attr('action'),
            type: 'GET',
            dataType: 'json',
            data: $form.serialize(),
            success: function (data) {
                if (data.error) {
                    $('.promo-code-form .form-control').addClass('is-invalid');
                    $('.coupon-error-message').empty().append(data.errorMessage);
                } else {
                    if (data.isGiftCard) {
                        $('.coupons-and-promos').empty()
                            .append(data.totals.discountsHtml + data.giftCardHtml);
                    } else {
                        $('.coupons-and-promos').empty().append(data.totals.discountsHtml);
                    }
                    updateCartTotals(data);
                    updateApproachingDiscounts(data.approachingDiscounts);
                    validateBasket(data);
                    if (data.hasBonusProduct) {
                        location.reload();
                    }
                }
                $('.coupon-code-field').val('');
                $.spinner().stop();
            },
            error: function (err) {
                if (err.responseJSON.redirectUrl) {
                    window.location.href = err.responseJSON.redirectUrl;
                } else {
                    createNotification(err.errorMessage, 'danger');
                    $.spinner().stop();
                }
            }
        });
        return false;
    });

    $('body').on('click', '.remove-coupon', function (e) {
        e.preventDefault();

        var couponCode = $(this).data('code');
        var uuid = $(this).data('uuid');
        var $deleteConfirmBtn = $('.delete-coupon-confirmation-btn');
        var $productToRemoveSpan = $('.coupon-to-remove');

        $deleteConfirmBtn.data('uuid', uuid);
        $deleteConfirmBtn.data('code', couponCode);

        $productToRemoveSpan.empty().append(couponCode);
    });

    $('body').on('click', '.delete-coupon-confirmation-btn', function (e) {
        e.preventDefault();

        var url = $(this).data('action');
        var uuid = $(this).data('uuid');
        var couponCode = $(this).data('code');
        var urlParams = {
            code: couponCode,
            uuid: uuid
        };

        url = appendToUrl(url, urlParams);

        $('body > .modal-backdrop').remove();

        $.spinner().start();
        $.ajax({
            url: url,
            type: 'get',
            dataType: 'json',
            success: function (data) {
                $('.coupon-uuid-' + uuid).remove();
                updateCartTotals(data);
                updateApproachingDiscounts(data.approachingDiscounts);
                validateBasket(data);
                $.spinner().stop();
                location.reload();
            },
            error: function (err) {
                if (err.responseJSON.redirectUrl) {
                    window.location.href = err.responseJSON.redirectUrl;
                } else {
                    createNotification(err.responseJSON.errorMessage, 'danger');
                    $.spinner().stop();
                }
            }
        });
    });
    $('body').on('click', '.cart-page .bonus-product-button', function () {
        $.spinner().start();
        $.ajax({
            url: $(this).data('url'),
            method: 'GET',
            dataType: 'json',
            success: function (data) {
                base.methods.editBonusProducts(data);
                $.spinner().stop();
            },
            error: function () {
                $.spinner().stop();
            }
        });
    });

    $('body').on('hidden.bs.modal', '#chooseBonusProductModal', function () {
        $('#chooseBonusProductModal').remove();
        $('.modal-backdrop').remove();
        $('body').removeClass('modal-open');

        if ($('.cart-page').length) {
            $('.launched-modal .btn-outline-primary').trigger('focus');
            $('.launched-modal').removeClass('launched-modal');
        } else {
            $('.product-detail .add-to-cart').focus();
        }
    });

    $('body').on('click', '.stringing .cart .summary-container .add2cart', function (evt) {
        evt.preventDefault();
        var actionLink = $(this).data('action');
        var racketSizeSelectBox = $('.table.stringing-table .size.racket');

        var defaultSizeOption = racketSizeSelectBox.find('option')[0];
        var defaultRacketVariantId = $(defaultSizeOption).data('pid');
        actionLink = appendToUrl(actionLink, { defaultRacketVariantId: defaultRacketVariantId });
        $.ajax({
            url: actionLink,
            method: 'GET',
            complete: function (data) {
                if (data.responseJSON.error === true) {
                    $('.add-to-cart-messages').html(
                        '<div class="alert alert-danger add-to-basket-alert text-center"'
                        + ' role="alert">'
                        + data.responseJSON.message + '</div>'
                    );
                } else {
                    location.href = data.url || data.responseJSON.url;
                }
            }
        });
    });

    $('.stringing .cart .config-addon:not(.personalization)').on('click', function (evt) {
        evt.preventDefault();
        var actionLink = $(this).data('action');
        location.href = actionLink;
    });
    var productPersonalization = require('../product/personalization');
    $('.stringing .cart .config-addon.personalization').on('click', { type: 'expertRecommendation' }, productPersonalization.checkProductAvailability);
    $('.stringing .cart .delete-personalization').on('click', productPersonalization.deletePersonalization);

    // Load Cart Recos
    $(document).ready(function () {
        var cartRecommendationsElement = $('.table.table-products.recommendations');
        if (cartRecommendationsElement.length > 0) {
            var action = cartRecommendationsElement.data('url');
            $.ajax({
                url: action,
                method: 'GET',
                complete: function (data) {
                    if (data.responseText.trim().length > 0) {
                        cartRecommendationsElement.html(data.responseText);
                        cartRecommendationsElement.show();
                        loadPLIDeliveryTime('.product-delivery-time.recommendation');
                    }
                }
            });
        }
        var cartDeliveryTimeElement = $('.cart-delivery-time');
        if (cartDeliveryTimeElement.length > 0) {
            var url = cartDeliveryTimeElement.data('url');
            $.ajax({
                url: url,
                method: 'GET',
                complete: function (data) {
                    if (data.responseText.trim().length > 0) {
                        cartDeliveryTimeElement.html(data.responseText);
                        cartDeliveryTimeElement.show();
                    }
                }
            });
        }
        loadPLIDeliveryTime('.product-delivery-time.pli,.product-delivery-time.bonus');
    });
    // Handle Cart Recommendations Display (Product Links Line Items)
    // --------------------------------------------------------------
    var cartRecos = $('.table-products.recommendations');
    var cartRecosCookieName = 'hidecartrecos';
    var recoCookie = new TPCookie(cartRecosCookieName);
    var hideCartRecos = recoCookie.getValue(cartRecosCookieName);
    var cartRecosCount = $('.table-products.recommendations .table-row').length;
    var cartRecosDisplay = $('.table-products.recommendations .table-row[style*="display"]').length;

    // initially cart recos are hidden => show them, if cookie is NOT set to 'true'
    if (hideCartRecos !== 'true' && (cartRecosCount !== cartRecosDisplay)) {
        cartRecos.show();
    }

    // if closing cross is clicked, hide recos and set cookie
    $('body').on('click', '.hide-recommendations', function (evt) {
        evt.preventDefault();
        cartRecos.slideUp();
        recoCookie.setByDayToDate('true', 1);
    });

    $(window).on('shown.bs.modal', function (e) {
        e.preventDefault();
        productDetail.updateSizesLabel();
    });

    productDetail.initLocaleSizes();

    $('.checkout-btn').on('click', () => $.spinner().start());
};
