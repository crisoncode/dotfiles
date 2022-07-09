'use strict';

/**
 *
 * @param {string} giftCardCode - giftcard code to mask
 * @returns {string} masked giftcard code
 */
function getMaskedCode(giftCardCode) {
    return giftCardCode.slice(0, -4).replace(/./g, '#') + giftCardCode.slice(-4);
}

/**
 *
 * @param {Object|dw.order.PaymentInstrument} giftCardPaymentInstrument - Payment instrument
 * @param {dw.order.lineItemCtnr} lineItemCtnr - apiLineItemCntr
 * @returns {dw.order.Money|null} amount
 */
function getGiftCardAmountToRedeem(giftCardPaymentInstrument, lineItemCtnr) {
    var BasketMgr = require('dw/order/BasketMgr');
    var currentLineItemCtnr = lineItemCtnr || BasketMgr.getCurrentBasket();
    if (!currentLineItemCtnr) {
        return null;
    }

    if (giftCardPaymentInstrument.paymentTransaction.amount.value > currentLineItemCtnr.getTotalGrossPrice().value) {
        return currentLineItemCtnr.getTotalGrossPrice();
    }

    return giftCardPaymentInstrument.paymentTransaction.amount;
}

/**
 * Check if the Product is a Gift Card.
 * @param {Object|dw.catalog.Product} product - Product
 * @returns {boolean} Is Gift Card Product or not
 */
function isGiftCardProduct(product) {
    const Site = require('dw/system/Site');

    const giftCardPurchaseAloneEnabled = Site.getCurrent().getCustomPreferenceValue('giftCardPurchaseAloneEnabled');
    const giftCardCategoryId = Site.getCurrent().getCustomPreferenceValue('giftCardCategoryId');

    if (giftCardPurchaseAloneEnabled && giftCardCategoryId && giftCardCategoryId !== '') {
        const categories = product.categories.toArray();
        const filteredCategories = categories.filter(category => category.ID === giftCardCategoryId);

        return filteredCategories.length > 0;
    }

    return false;
}

/**
 * Check if a Gift Card Message should be shown on the PDP.
 * @param {Object} result - Result
 * @param {Object|dw.catalog.Product} product - Product
 * @param {Object} cartModel - Cart Model
 * @returns {boolean} Show Gift Card Message or not
 */
function showGiftCardMessageOnPdp(result, product, cartModel) {
    let showGiftCardMsg = false;

    if (result && !result.error && product && cartModel && cartModel.items && cartModel.items.length > 0) {
        cartModel.items.forEach(function (item) {
            if (item.isGiftCardProduct && item.id === product.ID) {
                showGiftCardMsg = true;
            }
        });
    }

    return showGiftCardMsg;
}

module.exports = {
    GIFT_CARD_PAYMENT_METHOD_ID: 'GIFTCERT',
    getMaskedCode: getMaskedCode,
    getGiftCardAmountToRedeem: getGiftCardAmountToRedeem,
    isGiftCardProduct: isGiftCardProduct,
    showGiftCardMessageOnPdp: showGiftCardMessageOnPdp
};
