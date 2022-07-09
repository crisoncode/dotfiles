'use strict';

const Site = require('dw/system/Site');

const $redesigns = {
    productTiles: {
        customPrefID: 'EnableRedesignProductTile'
    },
    filters: {
        customPrefID: 'EnableRedesignCategoryPageFilter'
    },
    categoryAds: {
        customPrefID: 'EnableRedesignCategoryAds'
    }
};

const excludedTemplates = JSON.parse(Site.getCurrent().getCustomPreferenceValue('excludedTemplatesInRedesign'));

/**
 * Determines if we load new redesign for new Product Tiles based on A/B test.
 * @param {sfra.Response} res - Response comes from SFRA parent Controller (Search-Show)
 * @returns {boolean} result - for show or not the new redesign for the PLP
 */
function isABTestEnabled(res) {
    let result = false;

    const ABTestMgr = require('dw/campaign/ABTestMgr');
    // AB test ID has not been renamed to not invalidate it's results.
    let isRedesignParticipant = ABTestMgr.isParticipant('Redesign-PLP', 'new');
    if (isRedesignParticipant && (empty(excludedTemplates) || excludedTemplates.indexOf(res.view) === (-1))) {
        result = true;
    }

    return result;
}

/**
 * Determines if we load new redesign for new Product Detail page based on A/B test.
 * @param {sfra.Response} res - Response comes from SFRA parent Controller (Product-Show)
 * @returns {boolean} result - for show or not the new redesign for the PLP
 */
function isPDPABTestEnabled(res) {
    let result = false;

    const ABTestMgr = require('dw/campaign/ABTestMgr');
    // AB test ID has not been renamed to not invalidate it's results.
    let isRedesignParticipant = ABTestMgr.isParticipant('Redesign-PDP', 'new');
    if (isRedesignParticipant && (empty(excludedTemplates) || excludedTemplates.indexOf(res.view) === (-1))) {
        result = true;
    }

    return true;
}

/**
 * Determines if a custom pref is enabled for each feature
 * @param {string} type - Type of test (Valid params: productTiles, filters, categoryAds)
 * @param {sfra.Response} res - Response comes from SFRA parent Controller (Search-Show)
 * @returns {boolean} result - for show or not the new redesign
 */
function isABTestFeatureEnabled(type, res) {
    let result = false;

    // eslint-disable-next-line no-param-reassign
    res = (typeof res !== 'undefined') ? res : false;

    let newDesignEnabled = Site.getCurrent().getCustomPreferenceValue($redesigns[type].customPrefID);
    if (newDesignEnabled && (res && (empty(excludedTemplates) || excludedTemplates.indexOf(res.view) === (-1)))) {
        result = true;
    }
    return result;
}

module.exports = {
    isABTestEnabled: isABTestEnabled,
    isABTestFeatureEnabled: isABTestFeatureEnabled,
    isPDPABTestEnabled: isPDPABTestEnabled
};
