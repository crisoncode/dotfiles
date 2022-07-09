'use strict';

var HashMap = require('dw/util/HashMap');
var ArrayList = require('dw/util/ArrayList');
var Template = require('dw/util/Template');
var Site = require('dw/system/Site');
var collections = require('*/cartridge/scripts/util/collections');

/**
 * Return root price book for a given price book
 * @param {dw.catalog.PriceBook} priceBook - Provided price book
 * @returns {dw.catalog.PriceBook} root price book
 */
function getRootPriceBook(priceBook) {
    var rootPriceBook = priceBook;
    while (rootPriceBook.parentPriceBook) {
        rootPriceBook = rootPriceBook.parentPriceBook;
    }
    return rootPriceBook;
}

/**
 * Creates a HashMap input object for dw.util.Template.render(HashMap)
 * @param {Object} keyMap - Key-value pairs object
 * @return {dw.util.HashMap} - HashMap from key-value pairs
 */
function getHtmlContext(keyMap) {
    var context = new HashMap();
    Object.keys(keyMap).forEach(function (key) {
        context.put(key, keyMap[key]);
    });
    return context;
}

/**
 * Get a product's promotional price
 *
 * @param {dw.catalog.Product} product - Product under evaluation
 * @param {dw.util.Collection.<dw.campaign.Promotion>} promotions - Promotions that apply to this
 *     product
 * @param {dw.catalog.ProductOptionModel} currentOptionModel - The product's option model
 * @return {dw.value.Money} - Promotional price
 */
function getPromotionPrice(product, promotions, currentOptionModel) {
    var price = null;

    if (!empty(promotions)) {
        var PROMOTION_CLASS_PRODUCT = require('dw/campaign/Promotion').PROMOTION_CLASS_PRODUCT;
        for (var i = 0; i < promotions.length; i++) {
            if (promotions[i].promotionClass && promotions[i].promotionClass.equals(PROMOTION_CLASS_PRODUCT)) {
                if (!promotions[i].basedOnCoupons) {
                    var promoPrice = currentOptionModel
                    ? promotions[i].getPromotionalPrice(product, currentOptionModel)
                    : promotions[i].getPromotionalPrice(product, product.optionModel);
                    if (price === null || (price.value > promoPrice.value && promoPrice.available)) {
                        price = promoPrice;
                    }
                }
            }
        }
    }
    return price;
}

/**
 * Render Template HTML
 *
 * @param {dw.util.HashMap} context - Context object that will fill template placeholders
 * @param {string} [templatePath] - Optional template path to override default
 * @return {string} - Rendered HTML
 */
function renderHtml(context, templatePath) {
    var html;
    var path = templatePath || 'product/components/pricing/ajaxMain.isml';
    var tmpl = new Template(path);
    var result = new HashMap();

    result.put('price', context);
    html = tmpl.render(result);

    return html.text;
}

/**
 * Render price HTML for multiple contexts
 *
 * @param {Array} contexts - set with context objects that will fill template placeholders
 * @param {string} [templatePath] - Optional template path to override default
 * @return {string} - Rendered HTML
 */
function renderHtmlExtended(contexts, templatePath) {
    var html;
    var path = templatePath || 'product/components/pricing/ajaxMain.isml';
    var tmpl = new Template(path);
    var result = new HashMap();

    contexts.forEach(function (ctx) {
        result.put(ctx.name, ctx.context);
    });
    html = tmpl.render(result);

    return html.text;
}

/**
 * Gets the value for hide/ show the percentage
 *
 * @param {Array} price - price object
 * @return {string} - percentage value
 */
function getValueDisplayPercentage(price) {
    if (price && price.percentage && price.percentage.value > 2) {
        return true;
    }
    return false;
}

/**
 * switch pricebook
 *
 * @param {*} setNetPrice - NET or GROSS
 * @param {*} country - net price country
 * @return {string} - reload value
 */
function switchPricebook(setNetPrice, country) {
    // init helper variables
    var reload = false;
    var isNett = false;
    var regExp = null;
    var newSuffix = null;
    var pricebookID;
    var newPriceBook;
    var pricebook;
    var alreadyExists;
    var pricebooksToExclude = [];
    var applicablePriceBooks = new ArrayList();
    const PriceBookMgr = require('dw/catalog/PriceBookMgr');

    // read applicable pricebooks from session
    var currentApplicablePriceBooks = PriceBookMgr.getApplicablePriceBooks();

    // read site pricebooks from config file
    var sitePricebooks = require('*/cartridge/config/pricebooksConfig.json')[Site.getCurrent().ID];
    if (country && sitePricebooks[country]) {
        sitePricebooks = sitePricebooks[country];
    } else {
        sitePricebooks = sitePricebooks.default;
    }

    if (!sitePricebooks) {
        return false;
    }

    if (setNetPrice === true) {
        regExp = new RegExp('-prices$');
        newSuffix = '-NETTprices';
    } else if (setNetPrice === false) {
        regExp = new RegExp('-NETTprices$');
        newSuffix = '-prices';
    }

    /**
     * if session pricebooks are empty, then fill the collection
     * with the configured pricebooks
    */
    if (currentApplicablePriceBooks.length === 0) {
        for (var j = 0; j < sitePricebooks.guest.length; j++) {
            pricebook = PriceBookMgr.getPriceBook(sitePricebooks.guest[j]);
            currentApplicablePriceBooks.add(pricebook);
        }
    }
    if (customer.isMemberOfCustomerGroup('GoldCustomers')) {
        pricebook = PriceBookMgr.getPriceBook(sitePricebooks.gold[0]);
        alreadyExists = collections.find(currentApplicablePriceBooks, function (item) {
            return item.ID === pricebook.ID;
        });
        if (!alreadyExists) {
            currentApplicablePriceBooks.add(pricebook);
        }
        reload = true;
    } else {
        // Remove pricebook from applicable pricebooks
        pricebooksToExclude.push(PriceBookMgr.getPriceBook(sitePricebooks.gold[0]));
    }
    if (customer.isMemberOfCustomerGroup('SilverCustomers')) {
        pricebook = PriceBookMgr.getPriceBook(sitePricebooks.silber[0]);
        alreadyExists = collections.find(currentApplicablePriceBooks, function (item) {
            return item.ID === pricebook.ID;
        });
        if (!alreadyExists) {
            currentApplicablePriceBooks.add(pricebook);
        }
        reload = true;
    } else {
        // Remove pricebook from applicable pricebooks
        pricebooksToExclude.push(PriceBookMgr.getPriceBook(sitePricebooks.silber[0]));
    }

    for (var i = 0; i < currentApplicablePriceBooks.length; i++) {
        pricebook = currentApplicablePriceBooks[i];
        if (i === 0 && !isNett && pricebook.ID.indexOf('-NETTprices') > 0) {
            isNett = true;
        }
        pricebookID = pricebook.ID.replace(regExp, newSuffix);
        newPriceBook = PriceBookMgr.getPriceBook(pricebookID);
        if (newPriceBook) {
            applicablePriceBooks.add(newPriceBook);
        } else {
            applicablePriceBooks.add(pricebook);
        }

        if ((setNetPrice === true && !isNett) || (setNetPrice === false && isNett)) {
            reload = true;
        }
    }
    if (reload) {
        for (var k = 0; k < pricebooksToExclude.length; k++) {
            var pricebookIndex = applicablePriceBooks.indexOf(pricebooksToExclude[k]);
            if (pricebookIndex >= 0) {
                applicablePriceBooks.removeAt(pricebookIndex);
            }
        }
        PriceBookMgr.setApplicablePriceBooks(applicablePriceBooks.toArray());
    }
    if (customer.isMemberOfCustomerGroup('TennisPointEmployee')) {
        pricebook = PriceBookMgr.getPriceBook(employeePricebookID);
        alreadyExists = collections.find(currentApplicablePriceBooks, function (item) {
            return item.ID === pricebook.ID;
        });
        if (!alreadyExists) {
            currentApplicablePriceBooks.add(pricebook);
        }
        reload = true;
    }
    return reload;
}

/**
 * switch pricebook
 *
 * @param {*} basket - current basket
 * @return {boolean} -
 */
function switchPricebookForBasket(basket) {
    var countries = require('*/cartridge/config/shiptoCountries.json');
    var result = true;
    if (customer.isMemberOfCustomerGroup('BusinessCustomers') || ) {
        session.custom.netPrices = true;
        switchPricebook(true);
    } else if (basket.defaultShipment && basket.defaultShipment.shippingAddress && basket.defaultShipment.shippingAddress.countryCode.value) {
        if (Site.getCurrent().ID.indexOf('-CH') > 0) {
            session.custom.netPrices = false;
            switchPricebook(false);
        } else if (basket.defaultShipment.shippingAddress.countryCode.value === 'CH') {
            session.custom.netPrices = true;
            switchPricebook(true);
        } else {
            var countryCode = basket.defaultShipment.shippingAddress.countryCode.value;
            if (countries[countryCode] && countries[countryCode].isEU === false) {
                session.custom.netPrices = true;
                switchPricebook(true);
            } else {
                session.custom.netPrices = false;
                switchPricebook(false);
            }
        }
    } else if (Site.getCurrent().ID === 'JPO-COM' || Site.getCurrent().ID === 'TPO-COM' || Site.getCurrent().ID === 'ITF-COM') {
        var shippingAddress = basket.shipments[0].shippingAddress;
        if (shippingAddress) {
            var shippingCountry = shippingAddress.countryCode;
            var code = shippingCountry.value;
            if (countries[code] && countries[code].isEU === false) {
                session.custom.netPrices = true;
                session.custom.shipTo = code + '_false';
                switchPricebook(true);
            } else {
                session.custom.netPrices = false;
                session.custom.shipTo = code + '_true';
                switchPricebook(false);
            }
        }
    } else {
        result = false;
    }
    return result;
}

/**
 * Set a session attribute to trigger promotion based net-prices via a dynamic customer-group using
 * a membership rule 'Include Customers with session.custom.netPrices is true'
 * @param {dw.order.basket} basket - DW Basket
 * @return {boolean} - reload
 */
function setApplicablePricebooks() {
    var currentBasket = require('dw/order/BasketMgr').getCurrentBasket();
    var reload = false;
    var result = false;
    if (currentBasket) {
        // Set applicable Pricebooks
        result = switchPricebookForBasket(currentBasket);
    }
    if (!result) {
        session.privacy.promoCache = null;

        if (customer.isMemberOfCustomerGroup('BusinessCustomers')) {
            reload = switchPricebook(true);
        } else if (session.custom.shipTo) {
            // Check if the user choosed a non eu shipTo Country
            var isEU = true;
            try {
                isEU = session.custom.shipTo.split('_')[1];
                if (isEU === 'false') {
                    session.custom.netPrices = true;
                    reload = switchPricebook(true);
                } else {
                    session.custom.netPrices = false;
                    reload = switchPricebook(false);
                }
            } catch (e) {
                session.custom.netPrices = false;
                reload = switchPricebook(false);
            }
        } else if (Site.getCurrent().ID.indexOf('-CH') < 0 && customer.profile
            && customer.profile.getAddressBook()
            && customer.profile.getAddressBook().getPreferredAddress()
            && customer.profile.getAddressBook().getPreferredAddress().getCountryCode()) {
            // eslint-disable-next-line newline-per-chained-call
            var countryCode = customer.profile.getAddressBook().getPreferredAddress().getCountryCode().getValue().toString();
            var shipToCountries = require('*/cartridge/config/shiptoCountries.json');
            var isNetPrice;
            if (shipToCountries[countryCode] && shipToCountries[countryCode].isEU === false) {
                isNetPrice = true;
                session.custom.netPrices = true;
                reload = switchPricebook(true);
            } else {
                isNetPrice = false;
                session.custom.netPrices = false;
                reload = switchPricebook(false);
            }
            if ('shipTo' in session.custom) {
                session.custom.shipTo = countryCode + '_' + isNetPrice;
            }
        } else {
            session.custom.netPrices = false;
            reload = switchPricebook(false);
        }
    }

    return reload;
}

module.exports = {
    getHtmlContext: getHtmlContext,
    getRootPriceBook: getRootPriceBook,
    renderHtml: renderHtml,
    renderHtmlExtended: renderHtmlExtended,
    getPromotionPrice: getPromotionPrice,
    getValueDisplayPercentage: getValueDisplayPercentage,
    setApplicablePricebooks: setApplicablePricebooks,
    switchPricebook: switchPricebook,
    switchPricebookForBasket: switchPricebookForBasket
};
