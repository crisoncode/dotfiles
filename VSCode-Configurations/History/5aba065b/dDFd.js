'use strict';

import BonusProductSlider from './_bonusProductSlider';

/**
 * Retrieves the relevant pid value
 * @param {jquery} $el - DOM container for a given add to cart button
 * @return {string} - value to be used when adding product to cart
 */
function getPidValue($el) {
    var pid;

    if ($('#quickViewModal').hasClass('show') && !$('.product-set').length) {
        pid = $($el).closest('.modal-content').find('.product-quickview').data('pid');
    } else if ($('.product-set-detail').length || $('.product-set').length) {
        pid = $($el).closest('.product-detail').find('.product-id').text();
    } else {
        pid = $('.product-detail:not(".bundle-item")').data('pid');
    }

    return pid;
}

/**
 * Retrieve contextual quantity selector
 * @param {jquery} $el - DOM container for the relevant quantity
 * @return {jquery} - quantity selector DOM container
 */
function getQuantitySelector($el) {
    return $el && $('.set-items').length
        ? $($el).closest('.product-detail').find('.quantity-select')
        : $('.quantity-select');
}

/**
 * Retrieves the value associated with the Quantity pull-down menu
 * @param {jquery} $el - DOM container for the relevant quantity
 * @return {string} - value found in the quantity input
 */
function getQuantitySelected($el) {
    return getQuantitySelector($el).val();
}

/**
 * Process the attribute values for an attribute that has image swatches
 *
 * @param {Object} attr - Attribute
 * @param {string} attr.id - Attribute ID
 * @param {Object[]} attr.values - Array of attribute value objects
 * @param {string} attr.values.value - Attribute coded value
 * @param {string} attr.values.url - URL to de/select an attribute value of the product
 * @param {boolean} attr.values.isSelectable - Flag as to whether an attribute value can be
 *     selected.  If there is no variant that corresponds to a specific combination of attribute
 *     values, an attribute may be disabled in the Product Detail Page
 * @param {jQuery} $productContainer - DOM container for a given product
 */
function processSwatchValues(attr, $productContainer) {
    attr.values.forEach(function (attrValue) {
        var $attrValue = $productContainer.find('[data-attr="' + attr.id + '"] [data-attr-value="' +
            attrValue.value + '"]');
        var $swatchAnchor = $attrValue.parent();

        if (attrValue.selected) {
            $attrValue.addClass('selected');
        } else {
            $attrValue.removeClass('selected');
        }

        if (attrValue.url) {
            $swatchAnchor.attr('href', attrValue.url);
        } else {
            $swatchAnchor.removeAttr('href');
        }

        // Disable if not selectable
        $attrValue.removeClass('selectable unselectable');

        $attrValue.addClass(attrValue.selectable ? 'selectable' : 'unselectable');
    });
}

/**
 * Process the attribute values for an attribute that has image swatches
 *
 * @param {Object} attr - Attribute
 * @param {string} attr.id - Attribute ID
 * @param {Object[]} attr.values - Array of attribute value objects
 * @param {string} attr.values.value - Attribute coded value
 * @param {string} attr.values.url - URL to de/select an attribute value of the product
 * @param {boolean} attr.values.isSelectable - Flag as to whether an attribute value can be
 *     selected.  If there is no variant that corresponds to a specific combination of attribute
 *     values, an attribute may be disabled in the Product Detail Page
 * @param {jQuery} $productContainer - DOM container for a given product
 * @param {string} selectedLocale - locale used by attribute selection
 */
function processTileValues(attr, $productContainer, selectedLocale) {
    attr.values.forEach(function (attrValue) {
        // identify all 'size' elements
        var $attrValue = $productContainer.find('[data-attr-value="' + attrValue.value + '"]');

        // in some case, we has localized sizes
        if ($productContainer.find('.attribute .active')) {
            $attrValue = $productContainer.find('.attribute .active [data-attr-value="' + attrValue.value + '"]');
        }

        if ($attrValue.length > 0) {
            // find all size value elements which should be selected (on pdp right side AND sticky bar)
            // by finding class siblings
            var $allSelectedValues = $('.' + $attrValue[0].classList[1]);

            // update all size value elements
            for (var i = 0; i < $allSelectedValues.length; i++) {
                var $elm = $($allSelectedValues[i]);

                // handle the 'selected' class for all size views and update dropdown
                if (attrValue.selected) {
                    $elm.addClass('selected');
                    if ($elm.hasClass('dropdown-item')) {
                        var attrDisplayValue = attrValue.value;
                        if (selectedLocale) {
                            var attrDisplayValueProperty = selectedLocale.replace(/-locale/g, 'Size');
                            if (attrValue[attrDisplayValueProperty]) {
                                attrDisplayValue = attrValue[attrDisplayValueProperty];
                            }
                        }
                        $elm.closest('.size-select').children('.dropdown-toggle').text(attrDisplayValue);
                    }
                } else {
                    $elm.removeClass('selected');
                }

                // update the size url
                if (attrValue.url) {
                    $elm.attr('href', attrValue.url);
                } else {
                    $elm.removeAttr('href');
                }

                //  disable, if not selectable
                $elm.removeClass('selectable unselectable');
                $elm.addClass(attrValue.selectable ? 'selectable' : 'unselectable');
            }
        }
    });
}

/**
 * Process attribute values associated with an attribute that does not have image swatches
 *
 * @param {Object} attr - Attribute
 * @param {string} attr.id - Attribute ID
 * @param {Object[]} attr.values - Array of attribute value objects
 * @param {string} attr.values.value - Attribute coded value
 * @param {string} attr.values.url - URL to de/select an attribute value of the product
 * @param {boolean} attr.values.isSelectable - Flag as to whether an attribute value can be
 *     selected.  If there is no variant that corresponds to a specific combination of attribute
 *     values, an attribute may be disabled in the Product Detail Page
 * @param {jQuery} $productContainer - DOM container for a given product
 */
function processNonSwatchValues(attr, $productContainer) {
    var $attr = '[data-attr="' + attr.id + '"]';
    var $defaultOption = $productContainer.find($attr + ' .select-' + attr.id + ' option:first');
    $defaultOption.attr('value', attr.resetUrl);

    attr.values.forEach(function (attrValue) {
        var $attrValue = $productContainer
            .find($attr + ' [data-attr-value="' + attrValue.value + '"]');
        $attrValue.attr('value', attrValue.url)
            .removeAttr('disabled');

        if (!attrValue.selectable) {
            $attrValue.attr('disabled', true);
        }
    });
}

/**
 * Routes the handling of attribute processing depending on whether the attribute has image
 *     swatches or not
 *
 * @param {Object} attrs - Attribute
 * @param {string} attr.id - Attribute ID
 * @param {jQuery} $productContainer - DOM element for a given product
 * @param {string} selectedLocale - locale used by attribute selection
 */
function updateAttrs(attrs, $productContainer, selectedLocale) {
    var attrsWithSwatches = ['color'];  // Currently, the only attribute type that has image swatches is Color.
    var attrsWithTiles = ['size']; // Currently, the only attribute type that has tiles is Size.

    attrs.forEach(function (attr) {
        if (attrsWithSwatches.indexOf(attr.id) > -1) {
            processSwatchValues(attr, $productContainer);
        } else if (attrsWithTiles.indexOf(attr.id) > -1) {
            processTileValues(attr, $productContainer, selectedLocale);
        } else {
            processNonSwatchValues(attr, $productContainer);
        }
    });
}

/**
 * Updates the availability status in the Product Detail Page
 *
 * @param {Object} response - Ajax response object after an
 *                            attribute value has been [de]selected
 * @param {jQuery} $productContainer - DOM element for a given product
 */
function updateAvailability(response, $productContainer) {
    var availabilityValue = '';
    var availabilityMessages = response.product.availability.messages;
    if (!response.product.readyToOrder) {
        availabilityValue = '<div>' + response.resources.info_selectforstock + '</div>';
    } else {
        availabilityMessages.forEach(function (message) {
            availabilityValue += '<div>' + message + '</div>';
        });
    }

    $($productContainer).trigger('product:updateAvailability', {
        product: response.product,
        $productContainer: $productContainer,
        message: availabilityValue,
        resources: response.resources
    });

    if (response.product && response.product.badges && response.product.badges.preOrder) {
        $('.product-delivery').addClass('pre-order-decorated');
    } else {
        $('.product-delivery').removeClass('pre-order-decorated');
    }
}

/**
 * Generates html for promotions section
 *
 * @param {array} promotions - list of promotions
 * @return {string} - Compiled HTML
 */
function getPromotionsHtml(promotions) {
    if (!promotions) {
        return '';
    }

    var html = '';

    promotions.forEach(function (promotion) {
        html += '<div class="callout" title="' + promotion.details + '">' + promotion.calloutMsg +
            '</div>';
    });

    return html;
}

/**
 * @typedef UpdatedOptionValue
 * @type Object
 * @property {string} id - Option value ID for look up
 * @property {string} url - Updated option value selection URL
 */

/**
 * @typedef OptionSelectionResponse
 * @type Object
 * @property {string} priceHtml - Updated price HTML code
 * @property {Object} options - Updated Options
 * @property {string} options.id - Option ID
 * @property {UpdatedOptionValue[]} options.values - Option values
 */

/**
 * Updates DOM using post-option selection Ajax response
 *
 * @param {OptionSelectionResponse} options - Ajax response options from selecting a product option
 * @param {jQuery} $productContainer - DOM element for current product
 */
function updateOptions(options, $productContainer) {
    options.forEach(function (option) {
        var $optionEl = $productContainer.find('.product-option[data-option-id*="' + option.id
            + '"]');
        option.values.forEach(function (value) {
            var valueEl = $optionEl.find('option[data-value-id*="' + value.id + '"]');
            valueEl.val(value.url);
        });
    });
}

/**
 * Parses JSON from Ajax call made whenever an attribute value is [de]selected
 * @param {Object} response - response from Ajax call
 * @param {Object} response.product - Product object
 * @param {string} response.product.id - Product ID
 * @param {Object[]} response.product.variationAttributes - Product attributes
 * @param {Object[]} response.product.images - Product images
 * @param {boolean} response.product.hasRequiredAttrsSelected - Flag as to whether all required
 *     attributes have been selected.  Used partially to
 *     determine whether the Add to Cart button can be enabled
 * @param {jQuery} $productContainer - DOM element for a given product.
 * @param {string} selectedLocale - locale used by attribute selection
 */
function handleVariantResponse(response, $productContainer, selectedLocale) {
    var isChoiceOfBonusProducts =
        $productContainer.parents('.choose-bonus-product-dialog').length > 0;
    var isVaraint = true;
    return false;

    if (response.product.variationAttributes) {
        updateAttrs(response.product.variationAttributes, $productContainer, selectedLocale);
        isVaraint = response.product.productType === 'variant';
        if (isChoiceOfBonusProducts && isVaraint) {
            $productContainer.parent('.bonus-product-item')
                .data('pid', response.product.id);

            $productContainer.parent('.bonus-product-item')
                .data('ready-to-order', response.product.readyToOrder);
        }
    }

    // Update primary images
    var primaryImageUrls = response.product.images;
    primaryImageUrls.large.forEach(function (imageUrl, idx) {
        $productContainer.find('.primary-images').find('img').eq(idx)
            .attr('src', imageUrl.url);
    });

    // Update pricing, unit-price & tiered-price info
    if (!isChoiceOfBonusProducts) {
        var $priceSelector = $('.prices .price', $productContainer).length
            ? $('.prices .price', $productContainer)
            : $('.prices .price');
        if (response.product.tieredPrices) {
            $priceSelector.replaceWith(response.product.tieredPrices.html.info);
        } else {
            $priceSelector.replaceWith(response.product.price.html);
        }

        var $priceSelectorUnit = $('.prices-unit-list-item', $productContainer).length
            ? $('.prices-unit-list-item', $productContainer)
            : $('.prices-unit-list-item');
        $priceSelectorUnit.replaceWith(response.product.price.htmlUnit);

        var $priceSelectorUvp = $('.prices-uvp .price', $productContainer).length
            ? $('.prices-uvp .price', $productContainer)
            : $('.prices-uvp .price');
        $priceSelectorUvp.replaceWith(response.product.price.htmlUvp);
    }

    // Update tiered price table
    if (!isChoiceOfBonusProducts) {
        var $tieredPricesTable = $('.tiered-prices-table-container', $productContainer);
        if ($tieredPricesTable.length > 0) {
            if (response.product.tieredPrices) {
                $tieredPricesTable.html(response.product.tieredPrices.html.table);
            } else {
                $tieredPricesTable.empty();
            }
        }
    }

    // Update delivery box
    $productContainer.find('.product-delivery').replaceWith(response.product.deliveryHtml);

    // Update shipping costs box
    $productContainer.find('.product-shipping-costs').replaceWith(response.product.shippingCostsHtml);

    // Update promotions
    $('.promotions').empty().html(getPromotionsHtml(response.product.promotions));

    updateAvailability(response, $productContainer);

    if (isChoiceOfBonusProducts) {
        var $selectButton = $productContainer.find('.select-bonus-product');
        $selectButton.trigger('bonusproduct:updateSelectButton', {
            product: response.product, $productContainer: $productContainer
        });
    } else {
        // Enable "Add to Cart" button if all required attributes have been selected
        $('button.add-to-cart, button.add-to-cart-global').trigger('product:updateAddToCart', {
            product: response.product, $productContainer: $productContainer
        }).trigger('product:statusUpdate', response.product);
    }

    // Update custom attributes
    $productContainer.find('.product-attributes').replaceWith(response.product.attributesHtml);
}

/**
 * @typespec UpdatedQuantity
 * @type Object
 * @property {boolean} selected - Whether the quantity has been selected
 * @property {string} value - The number of products to purchase
 * @property {string} url - Compiled URL that specifies variation attributes, product ID, options,
 *     etc.
 */

/**
 * Updates the quantity DOM elements post Ajax call
 * @param {UpdatedQuantity[]} quantities -
 * @param {jQuery} $productContainer - DOM container for a given product
 */
function updateQuantities(quantities, $productContainer) {
    if (!($productContainer.parent('.bonus-product-item').length > 0)) {
        var selected = quantities[0].value;
        var url = quantities[0].url;
        getQuantitySelector($productContainer).val(parseFloat(selected)).data('url', url);
    }
}

/**
 * Updates the badges DOM elements
 * @param {Object} badge - badge info (type and html)
 * @param {jQuery} $productContainer - DOM container for a given product
 */
function updateBadges(badge, $productContainer) {
    if (badge.html) {
        $productContainer.find('.product-detail-badge').html(badge.html);
    }
}

/**
 * updates the product view when a product attribute is selected or deselected or when
 *         changing quantity
 * @param {string} selectedValueUrl - the Url for the selected variation value
 * @param {jQuery} $productContainer - DOM element for current product
 * @param {Object} selectedValue - the selected value for toggling the "selected" class
 * @param {function} callback - anonymous callback to make to mobile add to cart trigger waiting
 */
function attributeSelect(selectedValueUrl, $productContainer, selectedValue, callback) {
    if (selectedValueUrl) {
        $('body').trigger('product:beforeAttributeSelect',
            { url: selectedValueUrl, container: $productContainer });

        var selectedLocale;
        if (selectedValue) {
            var tileElm = selectedValue.parent();
            if (tileElm.length > 0 && tileElm.is('[class*="-locale"]')) {
                var classValue = tileElm.attr('class');
                selectedLocale = classValue.replace(/.*(\w{2}-locale).*/, '$1');
            }
        }

        $.ajax({
            url: selectedValueUrl,
            method: 'GET',
            success: function (data) {
                handleVariantResponse(data, $productContainer, selectedLocale);
                updateOptions(data.product.options, $productContainer);
                updateQuantities(data.product.quantities, $productContainer);
                updateBadges(data.product.badge, $productContainer);
                $('body').trigger('product:afterAttributeSelect',
                    { data: data, container: $productContainer });

                if (window.shoeSizeMeAddToCart) {
                    $('body').trigger('shoeSizeMe:addToCart');
                }

                if (data.criteoObj) {
                    const myEvent = new CustomEvent('criteo:afterVariationSelect', {
                        detail: data.criteoObj,
                        bubbles: true,
                        cancelable: true,
                        composed: false
                    });
                    document.dispatchEvent(myEvent);
                }

                $.spinner().stop();
            },
            error: function (data) {
                $.spinner().stop();
                if (data.responseJSON.productError) {
                    $('.size-select .btn-outline-secondary').html('--');
                }
            }
        }).done(function () {
            if (callback) {
                callback();
            }
        });
    }
}

/**
 * Retrieves url to use when adding a product to the cart
 *
 * @return {string} - The provided URL to use when adding a product to the cart
 */
function getAddToCartUrl() {
    return $('.add-to-cart-url').val();
}

/**
 * Parses the html for a modal window
 * @param {string} html - representing the body and footer of the modal window
 *
 * @return {Object} - Object with properties body and footer.
 */
function parseHtml(html) {
    var $html = $('<div>').append($.parseHTML(html));

    var body = $html.find('.choice-of-bonus-product');
    var footer = $html.find('.modal-footer').children();

    return { body: body, footer: footer };
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
 * Updates the Mini-Cart quantity value after the customer has pressed the "Add to Cart" button
 * @param {string} response - ajax response from clicking the add to cart button
 */
function handlePostCartAdd(response) {
    $('.minicart').trigger('count:update', response);

    // show add to cart toast
    if (response.newBonusDiscountLineItem
        && Object.keys(response.newBonusDiscountLineItem).length !== 0) {
        chooseBonusProducts(response.newBonusDiscountLineItem);
    } else {
        if (response.error && response.quantityMaxAvailable) {
            $('.quantity-select').val('1');
        } else if (!response.error) {
            // scroll to top of the page
            $(window).scrollTop(0);
            // force reload and show the minicart
            if (!response.modal) {
                $('.minicart-link').trigger('mouseover', true);
            }
        }
        $('.minicart').trigger('message:update', response);
    }

    if (response.showGiftCardMessageOnPdp) {
        const giftCardModal = $('#giftCardModal');
        if (giftCardModal && giftCardModal.length > 0) {
            giftCardModal.modal('show');
        }
    }
}


/**
 * Retrieves the bundle product item ID's for the Controller to replace bundle master product
 * items with their selected variants
 *
 * @return {string[]} - List of selected bundle product item ID's
 */
function getChildProducts() {
    var childProducts = [];
    $('.bundle-item').each(function () {
        childProducts.push({
            pid: $(this).find('.product-id').text(),
            quantity: parseInt($(this).find('label.quantity').data('quantity'), 10)
        });
    });

    return childProducts.length ? JSON.stringify(childProducts) : [];
}

/**
 * Retrieve product options
 *
 * @param {jQuery} $productContainer - DOM element for current product
 * @return {string} - Product options and their selected values
 */
function getOptions($productContainer) {
    var options = $productContainer
        .find('.product-option')
        .map(function () {
            var $elOption = $(this).find('.options-select');
            var urlValue = $elOption.val();
            var selectedValueId = $elOption.find('option[value="' + urlValue + '"]')
                .data('value-id');
            return {
                optionId: $(this).data('option-id'),
                selectedValueId: selectedValueId
            };
        }).toArray();

    return JSON.stringify(options);
}

/**
 * Retrieve product container
 *
 * @param {this} $this - this
 * @return {jQuery} $productContainer - DOM element for current product
 */
function getProductContainer($this) {
    var $productContainer = $this.closest('.set-item');
    if (!$productContainer.length) {
        $productContainer = $this.closest('.product-detail');
    }
    return $productContainer;
}

/**
 *
 * @param {string} addToCartUrl - Add to cart server side
 * @param {Object} form - form with add2cart Data
 * @param {Object} cb - Callback for processing
 */
function ajaxAddToCart(addToCartUrl, form, cb) {
    $.spinner().start();
    $.ajax({
        url: addToCartUrl,
        method: 'POST',
        data: form,
        success: function (data) {
            $.spinner().stop();
            cb(data);
        }
    });
}

module.exports = {
    attributeSelect: attributeSelect,
    methods: {
        editBonusProducts: function (data) {
            chooseBonusProducts(data);
        }
    },
    colorAttribute: function () {
        $(document).on('click', '[data-attr="color"] a', function (e) {
            e.preventDefault();

            if ($(this).attr('disabled')) {
                return;
            }

            attributeSelect(e.currentTarget.href, getProductContainer($(this)));
        });
    },

    selectAttribute: function () {
        // for select dropdowns (also for size dropdowns with more than 5 options)
        $(document).on('change', 'select[class*="select-"], .options-select', function (e) {
            e.preventDefault();
            e.stopPropagation();
            attributeSelect(e.currentTarget.value, getProductContainer($(this)));
        });

        // for size tiles (visible at 5 or less options)
        $(document).on('click', '.size-tiles .size:not(.sold-out)', function (e) {
            e.preventDefault();
            e.stopPropagation();

            if ($(e.currentTarget).hasClass('selected') === false) {
                attributeSelect(e.currentTarget.href, getProductContainer($(this)), $(this));
                $('.size-select, .dropdown-menu').removeClass('show');
            }
        });

        // for mobile size rows, which trigger add-to-cart click
        $(document).on('click', '.size-rows .size:not(.sold-out)', function (e) {
            e.preventDefault();
            e.stopPropagation();

            // after attributeSelect and handleVariantResponse trigger add to cart click
            $('#sticky-add-to-cart-options .close').trigger('click');

            attributeSelect(e.currentTarget.href, getProductContainer($(this)), null, function () {
                $('#add-to-cart-btn').trigger('click');
            });
        });
    },

    availability: function () {
        $(document).on('change', '.quantity-select', function (e) {
            e.preventDefault();
            if ($('.bundle-items', getProductContainer($(this))).length === 0) {
                attributeSelect($(e.currentTarget).data('url'),
                    getProductContainer($(this)));
            }
        });
    },

    addToCart: function () {
        $(document).on('click', '.button-area .disabled-area', function () {
            $('.select-size-text').show();
        });

        $(document).on('click', 'button.add-to-cart, button.add-to-cart-global', function () {
            var addToCartUrl;
            var pid;
            var pidsObj;
            var setPids;
            var button = $(this);

            // if product is a stringable tennis-racket, we show the stringing-modal-dialog at most once instead of adding the product into the cart
            if (button.hasClass('stringing-add-to-cart')) {
                button.removeClass('stringing-add-to-cart');
                button.trigger('show.stringing-modal');
                return;
            }

            $('body').trigger('product:beforeAddToCart', this);
            if ($(this).parents('#sticky-add-to-cart-options').length) {
                // if this ID is available (mobile slide up), trigger click on closing slide up
                $('#sticky-add-to-cart-options .close').trigger('click');
            }

            if ($('.set-items').length && button.hasClass('add-to-cart-global')) {
                setPids = [];

                $('.product-detail').each(function () {
                    if (!button.hasClass('product-set-detail')) {
                        setPids.push({
                            pid: button.find('.product-id').text(),
                            qty: button.find('.quantity-select').val(),
                            options: getOptions(button)
                        });
                    }
                });
                pidsObj = JSON.stringify(setPids);
            }

            pid = getPidValue(button);

            var $productContainer = button.closest('.product-detail');
            if (!$productContainer.length) {
                $productContainer = button.closest('.quick-view-dialog').find('.product-detail');
            }

            addToCartUrl = getAddToCartUrl();

            var form = {
                pid: pid,
                pidsObj: pidsObj,
                childProducts: getChildProducts(),
                quantity: getQuantitySelected(button)
            };

            if (!$('.bundle-item').length) {
                form.options = getOptions($productContainer);
            }

            button.trigger('updateAddToCartFormData', form);
            if (addToCartUrl) {
                ajaxAddToCart(addToCartUrl, form, (data) => {
                    if (!data.modal) {
                        window.GTMTracking.trackAddToCart(form.pid, form.quantity, data.cartProducts);
                    }
                    handlePostCartAdd(data);
                    button.trigger('product:afterAddToCart', data);
                });
            }
        });
    },

    addToCartFromCartPage: function () {
        // Add to cart button disabled area
        $(document).on('click', '.button-area .disabled-area', function () {
            $('.select-size-text').show();
        });

        // Add to cart from shopping cart
        $(document).on('click', '.add-to-cart-cartpage', function (evt) {
            if ($('#genericModalBox').is(':visible')) {
                $('#genericModalBox').fadeTo('fast', 0.33);
            }
            var addToCartUrl;
            var pid;
            $('body').trigger('product:beforeAddToCart', this);
            pid = $(evt.currentTarget).attr('data-pid');
            addToCartUrl = getAddToCartUrl();
            var form = {
                pid: pid,
                pidsObj: {},
                quantity: 1
            };

            if (addToCartUrl) {
                ajaxAddToCart(addToCartUrl, form, (data) => {
                    handlePostCartAdd(data);
                    window.GTMTracking.trackAddToCart(form.pid, form.quantity, null);
                    $('body').trigger('product:afterAddToCart', data);
                    if (data.error) {
                        $('#genericModalBox').fadeTo('fast', 1);
                    } else {
                        $('#genericModalBox').fadeTo('fast', 0);
                        $('#genericModalBox').modal('hide');
                        window.location.reload();
                    }
                });
            }
        });
    },

    sizesBoxSelection: function () {
        // Size selection modal box check for previous size selection
        $(window).on('shown.bs.modal', function (evt) {
            evt.preventDefault();
            if ($('.modal .size-container .size-tiles a.size:not(.sold-out)').hasClass('selected')) {
                // Enable "Add to Cart" button
                const $sizesBoxBtn = $('button.sizes-box-btn');
                $sizesBoxBtn.attr('disabled', false);
                $sizesBoxBtn.attr('data-pid', $(this).data('variant-id'));
            }
        });

        // Size selection in a modal box
        // e.g. shopping cart (product recommendatation line items) or personalization mobile
        $(document).on('click', '.modal .size-container .size-tiles .size:not(.disabled)', function (evt) {
            evt.preventDefault();
            $('.size-container .size-tiles a.size').removeClass('selected');
            $(this).addClass('selected');

            // Enable "Add to Cart" button
            const $sizesBoxBtn = $('button.sizes-box-btn');
            $sizesBoxBtn.attr('disabled', false);
            $sizesBoxBtn.attr('data-pid', $(this).data('variant-id'));
        });
    },

    selectBonusProduct: function () {
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
    },
    removeBonusProduct: function () {
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

                    new BonusProductSlider();  // eslint-disable-line
                    $(document).trigger('selectpicker.init');

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
};
