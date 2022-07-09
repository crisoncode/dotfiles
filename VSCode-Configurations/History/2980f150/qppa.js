'use strict';

var ATTRIBUTE_NAME_COLOR = 'color';
var collections = require('*/cartridge/scripts/util/collections');
var urlHelper = require('*/cartridge/scripts/helpers/urlHelpers');
var ImageModel = require('*/cartridge/models/product/productImages');
var HashMap = require('dw/util/HashMap');
var stringUtil = require('app_storefront_common/cartridge/scripts/util/stringUtil');

/**
 * Determines whether a product attribute has image swatches.  Currently, the only attribute that
 *     does is Color.
 * @param {string} dwAttributeId - Id of the attribute to check
 * @returns {boolean} flag that specifies if the current attribute should be displayed as a swatch
 */
function isSwatchable(dwAttributeId) {
    var imageableAttrs = ['color'];
    return imageableAttrs.indexOf(dwAttributeId) > -1;
}

/**
 * Getting processed size attribute value comming from SF API
 * @param {dw.catalog.ProductVariationModel} variationModel - A product's variation model
 * @param {dw.catalog.ProductVariationAttributeValue} attrValue - Selected attribute value
 * @returns {Object} processed attr value
 */
function getProcessedSizeAttribute(variationModel, attrValue) {
    const ProductMgr = require('dw/catalog/ProductMgr');
    const shippingDurationHelper = require('app_storefront_common/cartridge/scripts/checkout/shippingDuration.js');
    const localizedStrings = stringUtil.getLocalizedStrings(attrValue, ['de_DE', 'en_GB', 'en_US']);
    const colorVariationAttribute = variationModel.getProductVariationAttribute(ATTRIBUTE_NAME_COLOR);
    const currentColor = variationModel.getSelectedValue(colorVariationAttribute);
    const processedAttr = {};

    processedAttr.euSize = localizedStrings[0].de_DE;
    processedAttr.enSize = localizedStrings[1].en_GB;
    processedAttr.usSize = localizedStrings[2].en_US;

    if (currentColor) {
        const filter = new HashMap();
        filter.put('size', attrValue.value);
        filter.put('color', currentColor.value);

        const filteredVariants = variationModel.getVariants(filter);
        if (filteredVariants.size() > 0) {
            processedAttr.variantId = filteredVariants[0].ID;
            let apiProduct = ProductMgr.getProduct(processedAttr.variantId);
            processedAttr.expectedDeliveryDate = shippingDurationHelper.getShippingDurationExtended(apiProduct);
        }
    }

    return processedAttr;
}

/**
 * Retrieve all attribute values
 *
 * @param {dw.catalog.ProductVariationModel} variationModel - A product's variation model
 * @param {dw.catalog.ProductVariationAttributeValue} selectedValue - Selected attribute value
 * @param {dw.catalog.ProductVariationAttribute} attr - Attribute value'
 * @param {string} endPoint - The end point to use in the Product Controller
 * @param {string} selectedOptionsQueryParams - Selected options query params
 * @param {string} quantity - Quantity selected
 * @param {boolean} isBundleProduct - Detect if we have a bundle
 * @returns {Object[]} - List of attribute value objects for template context
 *
 */
function getAllAttrValues(
    variationModel,
    selectedValue,
    attr,
    endPoint,
    selectedOptionsQueryParams,
    quantity,
    isBundleProduct
) {
    const attrValues = variationModel.getAllValues(attr);
    let actionEndpoint = 'Product-';
    if (attr.attributeID === 'color' && !isBundleProduct) {
        actionEndpoint += 'Show';
    } else {
        actionEndpoint += endPoint;
    }

    return collections.map(attrValues, function (value) {
        let isSelected = (selectedValue && selectedValue.equals(value)) || false;
        let valueUrl = '';

        let processedAttr = {
            id: value.ID,
            description: value.description,
            displayValue: value.displayValue,
            value: value.value,
            selected: isSelected,
            selectable: variationModel.hasOrderableVariants(attr, value)
        };

        if (attr.ID === 'size') {
            let processedSizeAttr = getProcessedSizeAttribute(variationModel, value);
            processedAttr = Object.assign(processedAttr, processedSizeAttr);
        }

        if (processedAttr.selectable) {
            valueUrl = (isSelected && endPoint !== 'Show')
                ? variationModel.urlUnselectVariationValue(actionEndpoint, attr)
                : variationModel.urlSelectVariationValue(actionEndpoint, attr, value);
            processedAttr.url = urlHelper.appendQueryParams(valueUrl, [selectedOptionsQueryParams, 'quantity=' + quantity]);
            processedAttr.pdpUrl = urlHelper.appendQueryParams(variationModel.urlSelectVariationValue('Product-Show', attr, value), []);
        }

        if (isSwatchable(attr.attributeID)) {
            processedAttr.images = new ImageModel(value, { types: ['swatch'], quantity: 'all' });
        }

        return processedAttr;
    });
}

/**
 * Gets the Url needed to relax the given attribute selection, this will not return
 * anything for attributes represented as swatches.
 *
 * @param {Array} values - Attribute values
 * @param {string} attrID - id of the attribute
 * @returns {string} -the Url that will remove the selected attribute.
 */
function getAttrResetUrl(values, attrID) {
    var urlReturned;
    var value;

    for (var i = 0; i < values.length; i++) {
        value = values[i];
        if (!value.images) {
            if (value.selected) {
                urlReturned = value.url;
                break;
            }

            if (value.selectable) {
                urlReturned = value.url.replace(attrID + '=' + value.value, attrID + '=');
                break;
            }
        }
    }

    return urlReturned;
}

/**
 * @constructor
 * @classdesc Get a list of available attributes that matches provided config
 *
 * @param {dw.catalog.ProductVariationModel} variationModel - current product variation
 * @param {Object} attrConfig - attributes to select
 * @param {Array} attrConfig.attributes - an array of strings,representing the
 *                                        id's of product attributes.
 * @param {string} attrConfig.attributes - If this is a string and equal to '*' it signifies
 *                                         that all attributes should be returned.
 *                                         If the string is 'selected', then this is comming
 *                                         from something like a product line item, in that
 *                                         all the attributes have been selected.
 *
 * @param {string} attrConfig.endPoint - the endpoint to use when generating urls for
 *                                       product attributes
 * @param {string} selectedOptionsQueryParams - Selected options query params
 * @param {string} quantity - Quantity selected
 * @param {boolean} isBundleProduct - Detect if we have a bundle
 */
function VariationAttributesModel(variationModel, attrConfig, selectedOptionsQueryParams,
                                  quantity, isBundleProduct) {
    var allAttributes = variationModel.productVariationAttributes;
    var result = [];
    collections.forEach(allAttributes, function (attr) {
        var selectedValue = variationModel.getSelectedValue(attr);
        var values = getAllAttrValues(variationModel, selectedValue, attr, attrConfig.endPoint,
            selectedOptionsQueryParams, quantity, isBundleProduct);
        var resetUrl = getAttrResetUrl(values, attr.ID);

        if ((Array.isArray(attrConfig.attributes)
            && attrConfig.attributes.indexOf(attr.attributeID) > -1)
            || attrConfig.attributes === '*') {
            result.push({
                attributeId: attr.attributeID,
                displayName: attr.displayName,
                id: attr.ID,
                swatchable: isSwatchable(attr.attributeID),
                values: values,
                resetUrl: resetUrl
            });
        } else if (attrConfig.attributes === 'selected') {
            result.push({
                displayName: attr.displayName,
                displayValue: selectedValue && selectedValue.displayValue ? selectedValue.displayValue : '',
                attributeId: attr.attributeID,
                id: attr.ID
            });
        }
    });
    result.forEach(function (item) {
        this.push(item);
    }, this);
}

VariationAttributesModel.prototype = [];

module.exports = VariationAttributesModel;
