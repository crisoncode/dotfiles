'use strict';

const quantity = require('./quantity');
const stringingService = require('../product/stringingracket/stringingService');
import BonusProductSlider from '../product/_bonusProductSlider';

const configurations = {
    productDetail: '.js-product-detail-container',
    giftCardModal: '#giftCardModal',
    addToCart: {
        button: '.js-add-to-cart',
        disabled: '.js-add-to-cart[disabled] + .disabled-area',
        url: '.js-add-to-cart-url',
        sizeMsg: '.select-size-text'
    },
    genericModalBox: '#genericModalBox'
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
    // show add to cart toast
    if (!data.newBonusDiscountLineItem) {
        return;
    }

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
            var $html = $('<div>').append($.parseHTML(html));
            var body = $html.find('.choice-of-bonus-product');
            var footer = $html.find('.modal-footer').children();
            var parsedHtml = { body: body, footer: footer };

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
                chooseBonusProducts(data.newBonusDiscountLineItem);

                $.spinner().stop();
            }
        });
    }
}

/**
 * Shows stringing modal for redesign PDP
 * @param {jquery} addToCartBtn - DOM element for the Add to cart button
 */
function showStringingModalRedesign(addToCartBtn) {
    const url = addToCartBtn.data('href');
    const title = addToCartBtn.data('title');
    const genericModalBox = $(configurations.genericModalBox);
    const racketSelectedSize = $('.size-container .size-tiles .size-racket.selected');

    stringingService.handleStringingModal(url, title, genericModalBox, racketSelectedSize);
}

/**
 * Initializes Add to cart actions for both disabled and enabled buttons
 */
function initAddToCart() {
    $(document).on('click', configurations.addToCart.disabled, function () {
        showAddToCartSizeMsg(true);
    });

    $(document).on('click', configurations.addToCart.button, function () {
        // Shows stringing modal dialog, on the first attempt to add to cart, if product is a stringable tennis-racket
        if ($(this).hasClass('stringing-add-to-cart')) {
            showStringingModalRedesign($(this));
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
}

module.exports = {
    build: build,
    updatePid: updatePid,
    enableAddToCartBtn: enableAddToCartBtn,
    showAddToCartSizeMsg: showAddToCartSizeMsg,
    selectBonusProduct: function () {
        $(document).on('click', '.select-bonus-product', function () {
            var $choiceOfBonusProduct = $(this).parents('.choice-of-bonus-product');
            var pid = $(this).data('pid');
            var maxPids = $('.choose-bonus-product-dialog').data('total-qty');
            var submittedQty = parseInt($(this).parents('.choice-of-bonus-product').find('.bonus-quantity-select').val(), 10);
            var totalQty = 0;
            $.each($('#chooseBonusProductModal .selected-bonus-products .selected-pid'), function () {
                totalQty += $(this).data('qty');
            });
            totalQty += submittedQty;
            var optionID = $(this).parents('.choice-of-bonus-product').find('.product-option').data('option-id');
            var valueId = $(this).parents('.choice-of-bonus-product').find('.options-select option:selected').data('valueId');
            if (totalQty <= maxPids) {
                var selectedBonusProductHtml = ''
                + '<div class="selected-pid row" '
                + 'data-pid="' + pid + '"'
                + 'data-qty="' + submittedQty + '"'
                + 'data-optionID="' + (optionID || '') + '"'
                + 'data-option-selected-value="' + (valueId || '') + '"'
                + '>'
                + '<div class="col-sm-11 col-9 bonus-product-name" >'
                + $choiceOfBonusProduct.find('.product-name').html()
                + '</div>'
                + '<div class="col-1"><i class="fa fa-times" aria-hidden="true"></i></div>'
                + '</div>'
                ;
                $('#chooseBonusProductModal .selected-bonus-products').append(selectedBonusProductHtml);
                $('.pre-cart-products').html(totalQty);
                $('.selected-bonus-products .bonus-summary').removeClass('alert-danger');
            } else {
                $('.selected-bonus-products .bonus-summary').addClass('alert-danger');
            }
        });
    },
    removeBonusProduct: function () {
        $(document).on('click', '.selected-pid', function () {
            $(this).remove();
            var $selected = $('#chooseBonusProductModal .selected-bonus-products .selected-pid');
            var count = 0;
            if ($selected.length) {
                $selected.each(function () {
                    count += parseInt($(this).data('qty'), 10);
                });
            }

            $('.pre-cart-products').html(count);
            $('.selected-bonus-products .bonus-summary').removeClass('alert-danger');
        });
    },
    enableBonusProductSelection: function () {
        $('body').on('bonusproduct:updateSelectButton', function (e, response) {
            $('button.select-bonus-product', response.$productContainer).attr('disabled',
                (!response.product.readyToOrder || !response.product.available));
            var pid = response.product.id;
            $('button.select-bonus-product').data('pid', pid);
        });
    },
    showMoreBonusProducts: function () {
        $(document).on('click', '.show-more-bonus-products', function () {
            var url = $(this).data('url');
            $('.modal-content').spinner().start();
            $.ajax({
                url: url,
                method: 'GET',
                success: function (html) {
                    var parsedHtml = parseHtml(html);
                    $('.modal-body').append(parsedHtml.body);
                    $('.show-more-bonus-products:first').remove();
                    $('.modal-content').spinner().stop();
                },
                error: function () {
                    $('.modal-content').spinner().stop();
                }
            });
        });
    },
    addBonusProductsToCart: function () {
        $(document).on('click', '.add-bonus-products', function () {
            var $readyToOrderBonusProducts = $('.choose-bonus-product-dialog .selected-pid');
            var queryString = '?pids=';
            var url = $('.choose-bonus-product-dialog').data('addtocarturl');
            var pidsObject = {
                bonusProducts: []
            };

            $.each($readyToOrderBonusProducts, function () {
                var qtyOption =
                    parseInt($(this)
                        .data('qty'), 10);

                var option = null;
                if (qtyOption > 0) {
                    if ($(this).data('optionid') && $(this).data('option-selected-value')) {
                        option = {};
                        option.optionId = $(this).data('optionid');
                        option.productId = $(this).data('pid');
                        option.selectedValueId = $(this).data('option-selected-value');
                    }
                    pidsObject.bonusProducts.push({
                        pid: $(this).data('pid'),
                        qty: qtyOption,
                        options: [option]
                    });
                    pidsObject.totalQty = parseInt($('.pre-cart-products').html(), 10);
                }
            });
            queryString += JSON.stringify(pidsObject);
            queryString = queryString + '&uuid=' + $('.choose-bonus-product-dialog').data('uuid');
            queryString = queryString + '&pliuuid=' + $('.choose-bonus-product-dialog').data('pliuuid');
            $.spinner().start();
            $.ajax({
                url: url + queryString,
                method: 'POST',
                success: function (data) {
                    $.spinner().stop();
                    if (data.error) {
                        $('.error-choice-of-bonus-products')
                        .html(data.errorMessage);
                    } else {
                        $('.configure-bonus-product-attributes').html(data);
                        $('.bonus-products-step2').removeClass('hidden-xl-down');
                        $('#chooseBonusProductModal').modal('hide');

                        if ($('.add-to-cart-messages').length === 0) {
                            $('body').append(
                            '<div class="add-to-cart-messages"></div>'
                         );
                        }
                        $('.minicart-quantity').html(data.totalQty);
                        $('.add-to-cart-messages').append(
                            '<div class="alert alert-success add-to-basket-alert text-center"'
                            + ' role="alert">'
                            + data.msgSuccess + '</div>'
                        );
                        setTimeout(function () {
                            $('.add-to-basket-alert').remove();
                            if ($('.cart-page').length) {
                                location.reload();
                            }
                        }, 3000);
                    }
                },
                error: function () {
                    $.spinner().stop();
                }
            });
        });
    }
};
