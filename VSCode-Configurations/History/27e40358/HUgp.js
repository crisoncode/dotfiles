import BonusProductSlider from '../product/_bonusProductSlider';
import AddToCart from './addToCart';

/**
 * Adds the listener for bonus product choice inside the modal
 * that opens when we click on add to cart
 */
function selectBonusProduct() {
    $(document).on('click', '.select-bonus-product', function () {
        $(this).removeClass('btn-outline-tertiary').addClass('btn-tertiary');
        var $choiceOfBonusProduct = $(this).parents('.choice-of-bonus-product');
        var pid = $(this).attr('data-pid');
        var maxPids = $('.choose-bonus-product-dialog').data('total-qty');
        var submittedQty = 1;
        var totalQty = 0;
        $.each($('#chooseBonusProductModal .selected-bonus-products .selected-pid'), function () {
            totalQty += $(this).data('qty');
        });
        totalQty += submittedQty;

        var optionID = $(this).parents('.choice-of-bonus-product').find('.product-option').data('option-id');
        var valueId = $(this).parents('.choice-of-bonus-product').find('.options-select option:selected').data('valueId');

        var sizeElm = $(this).parents('.choice-of-bonus-product').find('.size-dropdown .select-size select option:selected');
        var selectedAttrID;
        var selectedAttrVal;

        if (sizeElm.length > 0) {
            selectedAttrID = 'size';
            selectedAttrVal = sizeElm.data('attr-value');
        }

        if (totalQty <= maxPids) {
            var selectedBonusProductHtml = ''
            + '<div class="selected-pid row" '
            + 'data-pid="' + pid + '"'
            + 'data-qty="' + submittedQty + '"'
            + 'data-optionID="' + (optionID || '') + '"'
            + 'data-option-selected-value="' + (valueId || '') + '"'
            + 'data-selected-attrID="' + (selectedAttrID || '') + '"'
            + 'data-selected-attrVal="' + (selectedAttrVal || '') + '">'
            + '<div class="col-8 col-sm-9 bonus-product-name" >'
            + $choiceOfBonusProduct.find('.product-name').html()
            + '</div>'
            + '<div class="col-4 col-sm-3 text-right"><i class="icon icon-cancel"></i></div>'
            + '</div>';

            $('#chooseBonusProductModal .selected-bonus-products').append(selectedBonusProductHtml);
            $('.pre-cart-products').html(totalQty);
            $('.selected-bonus-products .bonus-summary').removeClass('alert-danger');
        } else {
            $('.selected-bonus-products .bonus-summary').addClass('alert-danger');
        }
    });
}

/**
 * Adds the listener for bonus product choice inside the modal
 * that opens when we click on add to cart
 */
function removeBonusProduct() {
    $(document).on('click', '.selected-pid', function () {
        $(this).remove();
        var $choiceOfBonusProduct = $('.choice-of-bonus-product').parent();
        var $selected = $('#chooseBonusProductModal .selected-bonus-products .selected-pid');
        var removedPid = $(this).data('pid');
        var $selectedProduct = $choiceOfBonusProduct.find($('*[data-pid=' + removedPid + ']'));
        var count = 0;
        if ($selected.length) {
            $selected.each(function () {
                count += parseInt($(this).data('qty'), 10);
            });
        }

        $selectedProduct.find('.select-bonus-product').addClass('btn-outline-tertiary').removeClass('btn-tertiary');
        $('.pre-cart-products').html(count);
        $('.selected-bonus-products .bonus-summary').removeClass('alert-danger');
    });
}

/**
 * Enabling bonus products
 */
function enableBonusProductSelection() {
    $('body').on('bonusproduct:updateSelectButton', function (e, response) {
        $('button.select-bonus-product', response.$productContainer).attr('disabled',
            (!response.product.readyToOrder || !response.product.available));
        var pid = response.product.id;
        $('button.select-bonus-product').data('pid', pid);
    });
}

/**
 * Adds the listener for bonus product show more button
 */
function showMoreBonusProducts() {
    $(document).on('click', '.show-more-bonus-products', function () {
        var url = $(this).data('url');
        $('.modal-content').spinner().start();
        $.ajax({
            url: url,
            method: 'GET',
            success: function (html) {
                const $html = $('<div>').append($.parseHTML(html));
                const body = $html.find('.choice-of-bonus-product');
                const footer = $html.find('.modal-footer').children();
                const parsedHtml = { body: body, footer: footer };

                $('.modal-body').append(parsedHtml.body);
                $('.show-more-bonus-products:first').remove();

                new BonusProductSlider();  // eslint-disable-line
                $(document).trigger('selectpicker.init');

                $('.modal-content').spinner().stop();
            },
            error: function () {
                $('.modal-content').spinner().stop();
            }
        });
    });
}

/**
 * Add bonus products to the cart
 */
function addBonusProductsToCart() {
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
            var selection = null;
            if (qtyOption > 0) {
                if ($(this).data('optionid') && $(this).data('option-selected-value')) {
                    option = {};
                    option.optionId = $(this).data('optionid');
                    option.productId = $(this).data('pid');
                    option.selectedValueId = $(this).data('option-selected-value');
                }
                if ($(this).data('selected-attrid') && $(this).data('selected-attrval')) {
                    selection = {};
                    selection.attrId = $(this).data('selected-attrid');
                    selection.attrVal = $(this).data('selected-attrval');
                }
                pidsObject.bonusProducts.push({
                    pid: $(this).data('pid'),
                    qty: qtyOption,
                    options: [option],
                    selection: [selection]
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
                if (data.error) {
                    $('.error-choice-of-bonus-products')
                    .html(data.errorMessage);
                    $.spinner().stop();
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
                        } else {
                            $.spinner().stop();
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

/**
 * builds the component
 */
function build() {
    selectBonusProduct();
    removeBonusProduct();
    enableBonusProductSelection();
    showMoreBonusProducts();
    addBonusProductsToCart();
}


module.exports = {
    build: build
};
