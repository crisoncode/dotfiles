'use strict';
var base = require('./base');

var updateAttributesAndDetails = function () {
    $('body').on('product:statusUpdate', function (e, data) {
        var $productContainer = $('.product-detail[data-pid="' + data.id + '"]');

        $productContainer.find('.description-and-detail .product-attributes')
            .empty()
            .html(data.attributesHtml);

        if (data.shortDescription) {
            $productContainer.find('.description-and-detail .description')
                .removeClass('hidden-xl-down');
            $productContainer.find('.description-and-detail .description .content')
                .empty()
                .html(data.shortDescription);
        } else {
            $productContainer.find('.description-and-detail .description')
                .addClass('hidden-xl-down');
        }

        if (data.longDescription) {
            $productContainer.find('.description-and-detail .details')
                .removeClass('hidden-xl-down');
            $productContainer.find('.description-and-detail .details .content')
                .empty()
                .html(data.longDescription);
        } else {
            $productContainer.find('.description-and-detail .details')
                .addClass('hidden-xl-down');
        }
    });
};

var showSpinner = function () {
    $('body').on('product:beforeAddToCart product:beforeAttributeSelect', function () {
        $.spinner().start();
    });
};

var updateAttribute = function () {
    $('body').on('product:afterAttributeSelect', function (e, response) {
        if ($('.product-detail>.bundle-items').length) {
            response.container.data('pid', response.data.product.id);
            response.container.find('.product-id').text(response.data.product.id);
        } else if ($('.product-set-detail').eq(0)) {
            response.container.data('pid', response.data.product.id);
            response.container.find('.product-id').text(response.data.product.id);
        } else {
            $('.product-id').text(response.data.product.id);
            $('.product-detail:not(".bundle-item")').data('pid', response.data.product.id);
        }
    });
};

var updateAddToCart = function () {
    $('body').on('product:updateAddToCart', function (e, response) {
        const isReadyToOrder = response.product.readyToOrder;
        const isAvailable = response.product.available;

        // update local add to cart (for sets)
        $('button.add-to-cart', response.$productContainer).attr('disabled',
           (!isReadyToOrder || !isAvailable));
        var enable = $('.product-availability').toArray().every(function (item) {
            return $(item).data('available') && $(item).data('ready-to-order');
        });
        $('button.add-to-cart-global').attr('disabled', !enable);

        // remove the "select a size area", if product is orderable and available,
        // otherwise show availability messages
        if (isReadyToOrder && isAvailable) {
            $('.button-area .disabled-area, .select-size-text').hide();
            $('.add-to-basket-alert').remove();
        } else if (isReadyToOrder && !isAvailable) {
            var msgLength = response.product.availability.messages.length;

            if (msgLength > 0) {
                // first remove all alerts, if available
                if ($('.add-to-basket-alert').length > 0) {
                    $('.add-to-basket-alert').remove();
                }
                // then append actual alert messages
                $('.add-to-cart-messages').append('<div class="alert alert-warning add-to-basket-alert"><i class="icon icon-info-circled"></i><span></span><i class="icon icon-cancel"></i></div>');
                for (var i = 0; i < msgLength; i++) {
                    $('.add-to-basket-alert span').append(response.product.availability.messages[i] + '<br />');
                }
                $(document).on('click', '.add-to-basket-alert .icon-cancel', function () {
                    $('.add-to-basket-alert').remove();
                });
            }
        }
    });
};

var updateAvailability = function () {
    $('body').on('product:updateAvailability', function (e, response) {
        $('div.availability', response.$productContainer)
            .data('ready-to-order', response.product.readyToOrder)
            .data('available', response.product.available);

        $('.availability-msg', response.$productContainer)
            .empty().html(response.message);

        if ($('.global-availability').length) {
            var allAvailable = $('.product-availability').toArray()
                .every(function (item) { return $(item).data('available'); });

            var allReady = $('.product-availability').toArray()
                .every(function (item) { return $(item).data('ready-to-order'); });

            $('.global-availability')
                .data('ready-to-order', allReady)
                .data('available', allAvailable);

            $('.global-availability .availability-msg').empty()
                .html(allReady ? response.message : response.resources.info_selectforstock);
        }
    });
};

var updateHeadlines = function () {
    var colorSwatches = $('.product-color-swatches .variation-container');

    if (colorSwatches.find('.swatch-value').length === 1 && colorSwatches.find('.swatch-value.d-none').length === 1) {
        $('.product-color-swatches').addClass('d-none');
        $('.product-color-button').addClass('d-none');
    }
};

var initProductCompare = () => {
    $(document).on('click', '.product-compare .custom-control-input', function () {
        const checkbox = $(this);
        const pid = $(this).closest('.product-compare').data('compare-pid');
        if (pid) {
            if (checkbox.is(':checked')) {
                $(document).trigger('product_compare.add', pid);
            } else {
                $(document).trigger('product_compare.remove', pid);
            }
        }
    });
};

var initProductDetailWishlist = () => {
    $(document).off('click', '.add-to-wishlist').on('click', '.add-to-wishlist', function (ev) {
        ev.preventDefault();
        const button = $(this);
        var pid = button.data('pid');
        var buttons = $('.add-to-wishlist[data-pid="' + pid + '"]');
        if (pid && button.hasClass('wishlist-selected')) {
            $(document).trigger('product_wishlist.remove', pid);
            buttons.removeClass('wishlist-selected');
        } else {
            $(document).trigger('product_wishlist.add', pid);
            buttons.addClass('wishlist-selected');
        }
    });
};

var initLocaleSizes = () => {
    $(document).on('click', '.size-select .locale', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        $('.size-select .locale').removeClass('active');
        let currentTarget = $(ev.currentTarget);
        let locale = currentTarget.data('locale');
        let dropDown = currentTarget.closest('.dropdown-menu');
        currentTarget.addClass('active');
        dropDown.find('.inner').removeClass('active');
        dropDown.find('.' + locale).addClass('active');
        dropDown.addClass('show');
    });
};

var updateSizesLabel = () => {
    // Product size dropdown display value update
    const sizeTilesSelector = $('.size-tiles .locales-labels').length
    ? '.size-select .dropdown-menu .size-tiles.active'
    : '.size-select .dropdown-menu';

    $(sizeTilesSelector).on('click', 'a', function () {
        $('.size-select .btn:first-child').text($(this).text());
        $('.size-select.btn:first-child').val($(this).text());
    });
};

var initInventoryLists = () => {
    $(document).on('click', '#storeInventoryModal .size', (ev) => {
        ev.preventDefault();
        const $currentTarget = $(ev.currentTarget);
        $('#storeInventoryList').spinner().start();
        var urlAction = $currentTarget.data('url');
        $.ajax({
            url: urlAction,
            method: 'GET',
            success: function (data) {
                // Load request content into the modal box
                console.log('hello world');
                $('#storeInventoryModal #storeInventoryList').html(data);
                $('#storeInventoryList').spinner().stop();
            },
            error: function () {
                $('#storeInventoryList').spinner().stop();
            }
        });
    });
};

module.exports = {
    availability: base.availability,
    addToCart: base.addToCart,
    updateAttributesAndDetails,
    showSpinner,
    updateAttribute,
    updateAddToCart,
    updateAvailability,
    updateHeadlines,
    initProductCompare,
    initProductDetailWishlist,
    initLocaleSizes,
    updateSizesLabel,
    initInventoryLists
};
