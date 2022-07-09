'use strict';

var TaxMgr = require('dw/order/TaxMgr');
var ShippingLocation = require('dw/order/ShippingLocation');
var Resource = require('dw/web/Resource');
var arrayUtil = require('*/cartridge/scripts/util/array');

/**
* returns the taxRate of the current country and the localized taxation title (collected from the properties)
*
* @param {Product} product the product
* @param {dw.order.LineItemContainer} lineItemContainer the lineItemContainer
* @return {Object} taxRate taxation data
*/
function getTaxation(product, lineItemContainer) {
    // Find the tax rate to display based on product tax rate and user/store locale
    var taxRate = '';
    var taxJurisdictionID = null;
    var rateId = TaxMgr.defaultTaxClassID;
    var defaultShipment = null;

    if (lineItemContainer) {
        defaultShipment = lineItemContainer.defaultShipment;

        if (defaultShipment && defaultShipment.shippingAddress) {
            var location = new ShippingLocation(defaultShipment.shippingAddress);
            taxJurisdictionID = TaxMgr.getTaxJurisdictionID(location);
        }
    }

    taxJurisdictionID = (taxJurisdictionID !== null) ? taxJurisdictionID : TaxMgr.getDefaultTaxJurisdictionID();

    if (product) {
        rateId = (product.taxClassID == null) ? TaxMgr.defaultTaxClassID : product.taxClassID;
    }

    // Get the taxRate from the rateId and taxJurisdiction
    taxRate = (TaxMgr.getTaxRate(rateId, taxJurisdictionID) * 100).toFixed(1).replace(/\.0$/, '');

    return taxRate;
}

/**
 * Returns an array of attribute values.
 * @param {Product} product - The product object.
 * @param {string} attributeId - The attribute id to find.
 * @return {array} - Array of attributes values.
 */
function getAttributeValues(product, attributeId) {
    var attributes = product.variationAttributes || [];
    var matchedAttribute = arrayUtil.find(attributes, function (attribute) {
        return attribute.id === attributeId;
    }) || [];
    return empty(matchedAttribute) ? [] : matchedAttribute.values;
}

/**
 * Checks given product has nosize attribute.
 *  @param {Product} product the product
 * @return {boolean} Product has nosize or not
 */
function hasNoSizeAttribute(product) {
    return !!arrayUtil.find(getAttributeValues(product, 'size'), function (size) {
        return size.id === 'nosize';
    });
}

/**
 * Checks given product has nocolor attribute.
 *  @param {Product} product the product
 * @return {boolean} Product has nocolor or not
 */
function hasNoColorAttribute(product) {
    return !!arrayUtil.find(getAttributeValues(product, 'color'), function (color) {
        return color.id === 'nocolor';
    });
}

/**
 * Checks given product has no cross linked products attribute.
 *  @param {Product} product the product
 * @return {boolean} Product has no cross linked products attribute
 */
function hasNoCrossLinkedProducts(product) {
    return !('linkedProducts' in product.raw.custom) || empty(product.raw.custom.linkedProducts);
}

/**
 * Get the specific variation group by products ID
 *
 * NOTE:
 *
 *    If possible, use productLookup.js#toVariationGroup() instead, which leverages custom caches
 *
 * @param {Object} apiProduct - Wrapped product object
 * @returns {dw.catalog.VariationGroup} - returns the approriate variation Group or null
 */
function getVariationGroupByAPIObject(apiProduct) {
    if (apiProduct === null) {
        return null;
    }

    if (apiProduct.variationGroup) {
        return apiProduct;
    }

    if (apiProduct.master) {
        return null;
    }

    if (apiProduct.variant) {
        var variationGroups = apiProduct.masterProduct.variationGroups;
        if (variationGroups.length === 0) {
            return null;
        }
        var variantColor = apiProduct.custom.color;

        for (var i = 0; i < variationGroups.length; i++) {
            var variationGroupColor = variationGroups[i].custom.color;
            if (variationGroupColor === variantColor) {
                return variationGroups[i];
            }
        }
    }

    return null;
}

/**
 * Get the specific variation group by products ID
 *
 * @param {Object} product - Wrapped product object
 * @returns {dw.catalog.VariationGroup} - returns the approriate variation Group or null
 */
function getVariationGroup(product) {
    var ProductMgr = require('dw/catalog/ProductMgr');
    var apiProduct = ProductMgr.getProduct(product.id);

    return getVariationGroupByAPIObject(apiProduct);
}

/**
 * Checks product variant stock
 *
 * @param {Object} productVariant - Product variant to check
 * @returns {boolean} - Returns true if variant is in stock, otherwise false.
 */
function checkInStock(productVariant) {
    if (productVariant && productVariant.variant === true) {
        var inventoryRecord = productVariant.getAvailabilityModel().getInventoryRecord();
        var ProductAvailabilityModel = require('dw/catalog/ProductAvailabilityModel');

        var isInStockStatus = productVariant.getAvailabilityModel().availabilityStatus === ProductAvailabilityModel.AVAILABILITY_STATUS_IN_STOCK;
        var hasInventoryRecord = inventoryRecord && inventoryRecord.getATS().getValue() > 0;

        return (!inventoryRecord && inventoryRecord.perpetual) || (isInStockStatus && hasInventoryRecord);
    }

    return false;
}

/**
 * Returns list of avaliable sizes by product id
 *
 * NOTE:
 *
 *    If possible, use productLookup.js#getSizeValues() instead, which leverages custom caches
 *
 * @param {integer} pid - product id
 * @returns {array} - Returns list of avaliable sizes
 */
function getSizesByPID(pid) {
    var ProductMgr = require('dw/catalog/ProductMgr');
    var product = ProductMgr.getProduct(pid);
    var sizeVariationAttribute;

    for (var i = 0; i < product.variationModel.productVariationAttributes.length; i++) {
        if (product.variationModel.productVariationAttributes[i].ID === 'size') {
            sizeVariationAttribute = product.variationModel.productVariationAttributes[i];
            break;
        }
    }
    var variantsInfo = [];
    for (var index = 0; index < product.variants.length; index++) {
        var variant = product.variants[index];
        var sizeValue = variant.variationModel.getSelectedValue(sizeVariationAttribute);
        var info = {
            displayValue: sizeValue.displayValue
        };
        if (variant.getAvailabilityModel().getInventoryRecord() &&
            (variant.getAvailabilityModel().getInventoryRecord().getATS().getValue() > 0 || variant.getAvailabilityModel().getInventoryRecord().perpetual)) {
            info.variantId = variant.ID;
        } else {
            info.variantId = '';
        }
        variantsInfo.push(info);
    }

    return variantsInfo;
}

/**
 * this method check if a variant is managed by a size attribute and then returns the current size for it.
 * @param {string} pid product id
 * @return {string | null} returns a string with the size selected for the variant
 */
function getVariantSizeSelected(pid) {
    const ProductMgr = require('dw/catalog/ProductMgr');
    const product = ProductMgr.getProduct(pid);
    let size = null;
    let isSizedVariant = false;

    for (var i = 0; i < product.variationModel.productVariationAttributes.length; i++) {
        if (product.variationModel.productVariationAttributes[i].ID === 'size') {
            isSizedVariant = true;
            break;
        }
    }

    if (isSizedVariant && product && product.variant && product.custom.size) {
        size = product.custom.size;
    }

    return size;
}


/**
 * Checks if a variant already in cart
 * @param {*} basket - basket object
 * @param {*} variantId - variant id
 * @returns {boolean} - true or false
 */
function isVariantAlreadyInBasket(basket, variantId) {
    var personalizations = {};
    var productLineItems = basket.getAllProductLineItems();
    for (var i = 0; i < productLineItems.length; i++) {
        var pli = productLineItems[i];
        if (pli.product.ID === variantId) {
            if ('personalization' in pli.custom && pli.custom.personalization) {
                var persoObject = JSON.parse(pli.custom.personalization);
                personalizations[persoObject.text + '_' + variantId] = {
                    uuid: pli.UUID,
                    personalization: pli.custom.personalization
                };
            }
        }
    }
    return personalizations;
}

/**
 *  adds personalized product to the cart
 * @param {*} currentBasket - basket
 * @param {*} variant - variannt id
 * @param {*} productToAdd - id of product to add
 * @param {*} quantity - quantity
 * @param {*} personalizationId - personalizedProduct
 * @param {*} personalizationText - personalizationText
 * @param {*} personalization - personalization
 *
 * @returns {*} - result
 */
function addProductToCart(currentBasket, variant, productToAdd, quantity, personalizationId, personalizationText) {
    var ProductMgr = require('dw/catalog/ProductMgr');
    var cartHelpers = require('*/cartridge/scripts/cart/cartHelpers');
    var productHelpers = require('*/cartridge/scripts/helpers/productHelpers');
    var defaultShipment = currentBasket.defaultShipment;
    var productLineItems = currentBasket.productLineItems;
    var product = ProductMgr.getProduct(productToAdd);

    var result = {
        error: false,
        message: Resource.msg('text.alert.addedtobasket', 'product', null)
    };

    var totalQtyRequested = quantity + cartHelpers.getQtyAlreadyInCart(productToAdd, productLineItems);
    var perpetual = product.availabilityModel.inventoryRecord ? product.availabilityModel.inventoryRecord.perpetual : false;
    var canBeAdded = (perpetual || (product.availabilityModel.inventoryRecord && totalQtyRequested <= product.availabilityModel.inventoryRecord.ATS.value));

    if (!canBeAdded) {
        result.error = true;
        result.message = Resource.msgf('error.alert.selected.quantity.cannot.be.added.for', 'stringing', null, product.name);
        return result;
    }

    var productInCart = cartHelpers.getExistingProductLineItemsInCart(
        product, productToAdd, productLineItems, [], [])[0];

    try {
        var productQuantityInCart = 0;
        var optModel = productHelpers.getCurrentOptionModel(product.optionModel, []);
        var availableToSell = product.availabilityModel.inventoryRecord.ATS.value;
        var productLineItem;
        var quantityToSet;

        if (productInCart) {
            productQuantityInCart = productInCart.quantity.value;
            quantityToSet = quantity ? quantity + productQuantityInCart : productQuantityInCart + 1;
        } else {
            quantityToSet = quantity || 1;
        }

        if (availableToSell >= quantityToSet || perpetual) {
            productLineItem = currentBasket.createProductLineItem(product, optModel, defaultShipment);
            productLineItem.setQuantityValue(quantity);
            // productLineItem.custom.personalizationId = personalizationId;
            var personalizationObject = {
                bundleId: personalizationId,
                variantId: productToAdd,
                text: personalizationText
            };
            productLineItem.custom.personalization = JSON.stringify(personalizationObject);
            result.uuid = productLineItem.UUID;
        } else {
            throw new Error(
                availableToSell === productQuantityInCart
                    ? Resource.msg('error.alert.max.quantity.in.cart', 'product', null)
                    : Resource.msg('error.alert.selected.quantity.cannot.be.added', 'product', null)
            );
        }
    } catch (err) {
        result.error = true;
        result.message = err.message;
    }

    return result;
}

/**
 * Check if a product is personalizable.
 * returns true if the personalization feature for the current site is enabled and
 * the product custom attribute isPerosnalizable is true and if there are personalization products linked
 * with this product
 * @param {Object} product - the current product
 * @returns {boolean} isPersonalizable
 */
function isProductPersonalizable(product) {
    var isPersonalizable = false;
    var Site = require('dw/system/Site');

    if (Site.current.getCustomPreferenceValue('EnablePersonalizationService') === true
        && product.isPersonalizable
        && product.linkedPersonalizationServices
        && product.linkedPersonalizationServices.length > 0) {
        isPersonalizable = true;
    }
    return isPersonalizable;
}

/**
 * update quantity
 * @param {*} productLineItem - productLineItem
 * @param {*} quantity - quantity
 * @param {*} basketProductLineItems - basketProductLineItems
 * @return {*} status
 */
function updateCartQuantity(productLineItem, quantity) {
    var result = {
        error: false
    };

    var cartHelpers = require('*/cartridge/scripts/cart/cartHelpers');
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();

    var isPerpetual = productLineItem.product.availabilityModel.inventoryRecord.perpetual || false;

    // Retrieve the total quantity of this product from the cart
    var totalCartQuantity = cartHelpers.getQtyAlreadyInCart(productLineItem.product.ID, currentBasket.allProductLineItems);

    // Retrieve the stock level of this product
    var availableToSell = productLineItem.product.availabilityModel.inventoryRecord.ATS.value;

    // Calculate the quantity value updated by the customer
    var quantityDiff = quantity - productLineItem.quantity;

    var canBeUpdated = availableToSell >= (totalCartQuantity + quantityDiff);

    if (isPerpetual || canBeUpdated) {
        productLineItem.setQuantityValue(quantity);
    } else {
        result.error = true;
        result.message = availableToSell === quantity
            ? Resource.msg('error.alert.max.quantity.in.cart', 'product', null)
            : Resource.msg('error.alert.selected.quantity.cannot.be.added', 'product', null);
    }

    return result;
}

/**
 * Return type of the current product
 * @param  {dw.catalog.ProductVariationModel} product - Current product
 * @return {string} type of the current product
 */
function getProductType(product) {
    var result;
    if (product.master) {
        result = 'master';
    } else if (product.variant) {
        result = 'variant';
    } else if (product.variationGroup) {
        result = 'variationGroup';
    } else if (product.productSet) {
        result = 'set';
    } else if (product.bundle) {
        result = 'bundle';
    } else if (product.optionProduct) {
        result = 'optionProduct';
    } else {
        result = 'standard';
    }
    return result;
}

/**
 * Retrieve the primary category Object
 * @param {*} apiProduct - Nativ product
 * @return {*} primary category
 */
function retrievePrimaryCategory(apiProduct) {
    var primarycategory = apiProduct.getPrimaryCategory();
    var productType = getProductType(apiProduct);

    // the productType "standard" represents simple products: class dw.catalog.Product
    // see getProductType() in scripts/factories/product.js
    if (!primarycategory && productType !== 'master' && productType !== 'standard') {
        primarycategory = apiProduct.getMasterProduct().getPrimaryCategory();

        // overwrite primarycategory, if variationGroups found
        if (apiProduct.getMasterProduct().variationGroups.length > 0) {
            primarycategory = apiProduct.getMasterProduct().variationGroups[0].getPrimaryCategory();
        }
    }
    return primarycategory;
}

/**
 * Calculates if a product video should be shown or not
 * @param {*} product - api Product
 * @returns {boolean} true or false
 */
function hasVideo(product) {
    var Site = require('dw/system/Site');
    var currentLocale = request.locale; // eslint-disable-line
    var videoPreference = Site.getCurrent().getCustomPreferenceValue('EnableProductVideo');

    var isEnabledForLocale = false;

    if (videoPreference) {
        try {
            isEnabledForLocale = JSON.parse(videoPreference)[currentLocale] || false;
        } catch (ignore) {
            isEnabledForLocale = false;
        }
    }
    var result = ('video' in product.custom && product.custom.video && product.custom.video !== '');

    if (isEnabledForLocale === false) {
        result = false;
    }
    return result;
}

/**
 * Get the brandcategory for a product
 *
 * @param {Object} apiProduct - object of product
 * @return {string} - brand category id
 */
function getBrandCategory(apiProduct) {
    var CatalogMgr = require('dw/catalog/CatalogMgr');
    var BRAND_CATEGORY_ID = require('*/cartridge/config/categories.json').brands;

    var brandMainCategory = CatalogMgr.getCategory(BRAND_CATEGORY_ID);
    var allBrands = brandMainCategory.onlineSubCategories;
    const Collections = require('*/cartridge/scripts/util/collections');
    var brandCategory = Collections.find(allBrands, function (brandCat) {
        return brandCat.displayName === apiProduct.brandName;
    });
    if (brandCategory) {
        brandCategory = brandCategory.ID;
    }
    return brandCategory;
}

/**
 * @param {string} siteID current site id
 * @return {Object} object with data for paint labels in front.
 */
function buildShoesSizesLocalizedLabels(siteID) {
    let result = {
        useLocale: 'euSize',
        activeIndex: 0,
        locales: {
            euSize: {
                property: 'label.shoes_size_eu',
                propertyParam: 'EU',
                dataLocale: 'eu-locale'
            },
            enSize: {
                property: 'label.shoes_size_en',
                propertyParam: 'UK',
                dataLocale: 'en-locale'
            },
            usSize: {
                property: 'label.shoes_size_us',
                propertyParam: 'US',
                dataLocale: 'us-locale'
            }
        }
    };

    if (request.locale === 'en_GB' || siteID === 'TPO-COM' || siteID === 'JPO-COM' || siteID === 'ITF-COM') {
        result.useLocale = 'enSize';
        result.activeIndex = 1;
    }

    if (request.locale === 'en_US') {
        result.useLocale = 'usSize';
        result.activeIndex = 2;
    }

    return result;
}

module.exports = {
    getTaxation: getTaxation,
    hasNoSizeAttribute: hasNoSizeAttribute,
    hasNoColorAttribute: hasNoColorAttribute,
    hasNoCrossLinkedProducts: hasNoCrossLinkedProducts,
    getVariationGroup: getVariationGroup,
    getVariationGroupByAPIObject: getVariationGroupByAPIObject,
    getSizesByPID: getSizesByPID,
    isVariantAlreadyInBasket: isVariantAlreadyInBasket,
    addProductToCart: addProductToCart,
    updateCartQuantity: updateCartQuantity,
    checkInStock: checkInStock,
    isProductPersonalizable: isProductPersonalizable,
    getProductType: getProductType,
    retrievePrimaryCategory: retrievePrimaryCategory,
    hasVideo: hasVideo,
    buildShoesSizesLocalizedLabels: buildShoesSizesLocalizedLabels,
    getBrandCategory: getBrandCategory,
    getVariantSizeSelected: getVariantSizeSelected
};
