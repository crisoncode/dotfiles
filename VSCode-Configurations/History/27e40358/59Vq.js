
/**
 * Adds the listener for bonus product choice inside the modal
 * that opens when we click on add to cart
 */
function selectBonusProduct() {
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
}

/**
 * Adds the listener for bonus product choice inside the modal
 * that opens when we click on add to cart
 */
function removeBonusProduct() {
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
                var $html = $('<div>').append($.parseHTML(html));

                var body = $html.find('.choice-of-bonus-product');
                var footer = $html.find('.modal-footer').children();

                var parsedHtml = { body: body, footer: footer };

                $('.modal-body').append(parsedHtml.body);
                $('.show-more-bonus-products:first').remove();
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


function build() {
    selectBonusProduct();
    removeBonusProduct();
    enableBonusProductSelection();
    showMoreBonusProducts();
    addBonusProductsToCart();
}


module.exports = {
    build: build
}
