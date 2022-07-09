'use strict';

var collections = require('*/cartridge/scripts/util/collections');

/**
 * Prepares master ids by given product ids
 *
 * @param {Object} product - object of product
 * @return {string} - master ids
 */
function getMasterId(product) {
    var master = product.getVariationModel().getMaster();
    if (master) {
        return master.ID;
    }

    return false;
}

/**
 * Prepares variation product ids by given product ids
 *
 * @param {Object} product - object of product
 * @return {string} - variation hroup id
 */
function getAllVariationGroupIds(product) {
    var variantGroupIds = '';
    var variationGroups = product.getVariationGroups();
    if (variationGroups.length > 0) {
        collections.forEach(variationGroups, function (variationGroup) {
            if (variantGroupIds === '') {
                variantGroupIds += variationGroup.ID;
            } else {
                variantGroupIds += ',' + variationGroup.ID;
            }
        });
        return variantGroupIds;
    }
    return false;
}

/**
 * Prepares variation product ids by given product ids
 *
 * @param {Object} product - object of product
 * @return {string} - variation product id
 */
function getAllVariationProductIds(product) {
    var variantIds = '';
    var variants = product.getVariationModel().getVariants();
    if (variants.length > 0) {
        collections.forEach(variants, function (variant) {
            if (variantIds === '') {
                variantIds += variant.ID;
            } else {
                variantIds += ',' + variant.ID;
            }
        });
        return variantIds;
    }
    return false;
}

/**
 * check if the color selector is enabled for a category
 * @param {dw.catalog.Category} primaryCategory - Category API object (Primary category of the product)
 * @return {boolean} result - determine if the color selector will be enabled or not
 */
function isColorSelectorEnabled(primaryCategory) {
    let result = false;

    if (primaryCategory && primaryCategory.custom.enableColorSelectorInProducts === true) {
        result = true;
    }

    return result;
}

/**
 * Create a string of colors getted by the VG and separate them by a comma
 * @param {array} variationGroups - Contains an array of Variation Groups API object.
 * @return {string} result - colors separate by coma.
 */
function getColorsNameListSeparatedByComma(variationGroups) {
    let result = '';
    if (variationGroups && variationGroups.length > 0) {
        result = collections.map(variationGroups, function (variationGroup) {
            return variationGroup.custom.firstColor;
        });
        result = result.slice(0, 2).join(', ');
    }
    return result;
}

module.exports = {
    getMasterId: getMasterId,
    getAllVariationGroupIds: getAllVariationGroupIds,
    getAllVariationProductIds: getAllVariationProductIds,
    isColorSelectorEnabled: isColorSelectorEnabled,
    getColorsNameListSeparatedByComma: getColorsNameListSeparatedByComma
};
