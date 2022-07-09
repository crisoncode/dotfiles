'use strict';

var ProductMgr = require('dw/catalog/ProductMgr');
var PromotionMgr = require('dw/campaign/PromotionMgr');

/**
 * Normalize product and return Product variation model
 * @param  {dw.catalog.Product} product - Product instance returned from the API
 * @param  {Object} productVariables - variables passed in the query string to
 *                                     target product variation group
 * @return {dw.catalog.ProductVarationModel} Normalized variation model
 */
function getVariationModel(product, productVariables) {
    var variationModel = product.variationModel;
    var collections = require('*/cartridge/scripts/util/collections');

    if (!variationModel.master && !variationModel.selectedVariant) {
        variationModel = null;
    } else if (productVariables) {
        var variationAttrs = variationModel.productVariationAttributes;
        Object.keys(productVariables).forEach(function (attr) {
            if (attr && productVariables[attr].value) {
                var dwAttr = collections.find(variationAttrs,
                    function (item) { return item.ID === attr; });
                var dwAttrValue = collections.find(variationModel.getAllValues(dwAttr),
                    function (item) { return item.value === productVariables[attr].value; });
                if (dwAttr && dwAttrValue) {
                    variationModel.setSelectedAttributeValue(dwAttr.ID, dwAttrValue.ID);
                }
            }
        });
    }
    return variationModel;
}

/**
 * Get information for model creation
 * @param {dw.catalog.Product} apiProduct - Product from the API
 * @param {Object} params - Parameters passed by querystring
 *
 * @returns {Object} - Config object
 */
function getConfig(apiProduct, params) {
    var getProductType = require('*/cartridge/scripts/helpers/productHelper').getProductType;
    var productHelper = require('*/cartridge/scripts/helpers/productHelpers');
    var variations = getVariationModel(apiProduct, params.variables);
    if (variations) {
        apiProduct = variations.selectedVariant || apiProduct; // eslint-disable-line
    }

    var promotions = empty(apiProduct) ? null : PromotionMgr.activeCustomerPromotions.getProductPromotions(apiProduct);
    var optionsModel = empty(apiProduct) ? null : productHelper.getCurrentOptionModel(apiProduct.optionModel, params.options);
    var options = {
        variationModel: variations,
        options: params.options,
        optionModel: optionsModel,
        promotions: promotions,
        quantity: params.quantity || 1,
        variables: params.variables,
        apiProduct: apiProduct,
        productType: apiProduct ? getProductType(apiProduct) : '',
        isBundleProduct: (params.isBundleProduct),
        isLargeProductTile: (params.largeProductTile === 'true')
    };

    return options;
}

/**
 * Retrieve product's options and default selected values from product line item
 *
 * @param {dw.util.Collection.<dw.order.ProductLineItem>} optionProductLineItems - Option product
 *     line items
 * @param {string} productId - Line item product ID
 * @return {string []} - Product line item options
 */
function getLineItemOptions(optionProductLineItems, productId) {
    var collections = require('*/cartridge/scripts/util/collections');
    return collections.map(optionProductLineItems, function (item) {
        return {
            productId: productId,
            optionId: item.optionID,
            selectedValueId: item.optionValueID
        };
    });
}

/**
 * Retrieve product's options and default values
 *
 * @param {dw.catalog.ProductOptionModel} optionModel - A product's option model
 * @param {dw.util.Collection.<dw.catalog.ProductOption>} options - A product's configured options
 * @return {string []} - Product line item options
 */
function getDefaultOptions(optionModel, options) {
    var collections = require('*/cartridge/scripts/util/collections');
    return collections.map(options, function (option) {
        var selectedValue = optionModel.getSelectedOptionValue(option);
        return option.displayName + ': ' + selectedValue.displayValue;
    });
}

/**
 * Retrieve product's options and default selected values from product line item
 *
 * @param {dw.util.Collection.<dw.order.ProductLineItem>} optionProductLineItems - Option product
 *     line items
 * @return {string[]} - Product line item option display values
 */
function getLineItemOptionNames(optionProductLineItems) {
    var collections = require('*/cartridge/scripts/util/collections');
    return collections.map(optionProductLineItems, function (item) {
        return item.productName;
    });
}

module.exports = {
    get: function (params, localeId) {
        var productId = params.pid;
        var apiProduct = ProductMgr.getProduct(productId);
        var getProductType = require('*/cartridge/scripts/helpers/productHelper').getProductType;
        var productHelper = require('*/cartridge/scripts/helpers/productHelpers');

        if (apiProduct === null) {
            return null;
        }

        var productType = getProductType(apiProduct);
        var product = Object.create(null);
        var options = null;
        var promotions;

        switch (params.pview) {
            case 'tile':
                var productTile = require('*/cartridge/models/product/productTile');
                options = getConfig(apiProduct, params);
                product = productTile(product, apiProduct, getProductType(apiProduct), localeId, options);
                break;
            case 'bonusProductLineItem':
                promotions = PromotionMgr.activeCustomerPromotions.getProductPromotions(apiProduct);
                options = {
                    promotions: promotions,
                    quantity: params.quantity,
                    variables: params.variables,
                    lineItem: params.lineItem,
                    productType: getProductType(apiProduct)
                };

                switch (productType) {
                    case 'bundle':
                        // product = bundleProductLineItem(product, apiProduct, options, this);
                        break;
                    default:
                        var variationsBundle = getVariationModel(apiProduct, params.variables);
                        if (variationsBundle) {
                            apiProduct = variationsBundle.getSelectedVariant() || apiProduct; // eslint-disable-line
                        }

                        var optionModelBundle = apiProduct.optionModel;
                        var optionLineItemsBundle = params.lineItem.optionProductLineItems;
                        var currentOptionModelBundle = productHelper.getCurrentOptionModel(
                            optionModelBundle,
                            getLineItemOptions(optionLineItemsBundle, productId)
                        );
                        var lineItemOptionsBundle = optionLineItemsBundle.length
                            ? getLineItemOptionNames(optionLineItemsBundle)
                            : getDefaultOptions(optionModelBundle, optionModelBundle.options);


                        options.variationModel = variationsBundle;
                        options.lineItemOptions = lineItemOptionsBundle;
                        options.currentOptionModel = currentOptionModelBundle;

                        if (params.containerView === 'order') {
                            var bonusOrderLineItem = require('*/cartridge/models/productLineItem/bonusOrderLineItem');
                            product = bonusOrderLineItem(product, apiProduct, options);
                        } else {
                            var bonusProductLineItem = require('*/cartridge/models/productLineItem/bonusProductLineItem');
                            product = bonusProductLineItem(product, apiProduct, options);
                        }

                        break;
                }

                break;
            case 'productLineItem':
                promotions = PromotionMgr.activeCustomerPromotions.getProductPromotions(apiProduct);
                options = {
                    promotions: promotions,
                    quantity: params.quantity,
                    vgquantity: params.vgquantity,
                    variables: params.variables,
                    lineItem: params.lineItem,
                    productType: getProductType(apiProduct)
                };

                switch (productType) {
                    case 'bundle':
                        if (params.containerView === 'order') {
                            var bundleOrderLineItem = require('*/cartridge/models/productLineItem/bundleOrderLineItem');
                            product = bundleOrderLineItem(product, apiProduct, options, this);
                        } else {
                            var bundleProductLineItem = require('*/cartridge/models/productLineItem/bundleLineItem');
                            product = bundleProductLineItem(product, apiProduct, options, this);
                        }
                        break;
                    default:
                        var variationsPLI = getVariationModel(apiProduct, params.variables);
                        if (variationsPLI) {
                            apiProduct = variationsPLI.getSelectedVariant() || apiProduct; // eslint-disable-line
                        }

                        var optionModelPLI = apiProduct.optionModel;
                        var optionLineItemsPLI = params.lineItem.optionProductLineItems;
                        var currentOptionModelPLI = productHelper.getCurrentOptionModel(
                            optionModelPLI,
                            getLineItemOptions(optionLineItemsPLI, productId)
                        );
                        var lineItemOptionsPLI = optionLineItemsPLI.length
                            ? getLineItemOptionNames(optionLineItemsPLI)
                            : getDefaultOptions(optionModelPLI, optionModelPLI.options);


                        options.variationModel = variationsPLI;
                        options.lineItemOptions = lineItemOptionsPLI;
                        options.currentOptionModel = currentOptionModelPLI;

                        if (params.containerView === 'order') {
                            var orderLineItem = require('*/cartridge/models/productLineItem/orderLineItem');
                            product = orderLineItem(product, apiProduct, options);
                        } else {
                            var productLineItem = require('*/cartridge/models/productLineItem/productLineItem');
                            product = productLineItem(product, apiProduct, options);
                        }

                        break;
                }

                break;
            case 'bonus':
                options = getConfig(apiProduct, params);

                switch (productType) {
                    case 'set':
                        break;
                    case 'bundle':
                        break;
                    default:
                        var bonusProduct = require('*/cartridge/models/product/bonusProduct');
                        product = bonusProduct(product, options.apiProduct, options, params.duuid);
                        break;
                }

                break;
            case 'minimal':
                var minimalProduct = require('*/cartridge/models/product/minimalProduct');
                options = getConfig(apiProduct, params);
                product = minimalProduct(product, options.apiProduct, options);
                break;
            case 'teamwear':
                var teamwearProduct = require('*/cartridge/models/product/teamwearProduct');
                options = getConfig(apiProduct, params);
                product = teamwearProduct(product, options.apiProduct, options);
                break;
            default: // PDP
                options = getConfig(apiProduct, params);
                switch (productType) {
                    case 'set':
                        var productSet = require('*/cartridge/models/product/productSet');
                        product = productSet(product, options.apiProduct, options, this);
                        break;
                    case 'bundle':
                        var productBundle = require('*/cartridge/models/product/productBundle');
                        product = productBundle(product, options.apiProduct, options, this);
                        break;
                    default:
                        var fullProduct = require('*/cartridge/models/product/fullProduct');
                        product = fullProduct(product, options.apiProduct, options);
                        break;
                }
        }

        return product;
    }
};
