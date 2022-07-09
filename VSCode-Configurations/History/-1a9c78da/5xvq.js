'use strict';

var server = require('server');
var cache = require('*/cartridge/scripts/middleware/cache');
var serviceAvailability = require('*/cartridge/scripts/middleware/validateConfigurationServices.js');
var productCoreController = require('app_storefront_base/cartridge/controllers/Product');
var categoryHelper = require('app_storefront_common/cartridge/scripts/helpers/categoryHelper');
var stringingHelpers = require('app_storefront_common/cartridge/scripts/helpers/stringingHelper.js');
var productHelper = require('app_storefront_common/cartridge/scripts/helpers/productHelper.js');
var priceHelper = require('*/cartridge/scripts/helpers/pricing');
var badge = require('*/cartridge/scripts/helpers/badge');
var utils = require('*/cartridge/scripts/utils');
var arrayUtil = require('*/cartridge/scripts/util/array');
var URLUtils = require('dw/web/URLUtils');
var ProductMgr = require('dw/catalog/ProductMgr');
var CatalogMgr = require('dw/catalog/CatalogMgr');
var seoFactory = require('../scripts/seo/seoFactory');
var seoConst = require('../scripts/seo/constants');
var recommendationBanner = require('../scripts/product/recommendationBanner');
var googleTagManager = require('../scripts/middleware/googleTagManager');
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
var CATEGORIES = require('*/cartridge/config/categories.json');
var ProductFactory = require('*/cartridge/scripts/factories/product');
var Site = require('dw/system/Site');
var Resource = require('dw/web/Resource');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

server.extend(productCoreController);

/**
 * Adds robots index follow tags to products
 * @param {Object} req - Request object
 * @param {Object} reqPageMetaData - request pageMetaData object
 * @param {Object} res - Response object from base request
 */
function appendMetaData(req, reqPageMetaData, res) {
    res.render(res.view, {
        robots: seoConst.META_ROBOTS_INDEX_FOLLOW
    });

    // page title defined at product has precedence over page titles set before
    var viewData = res.getViewData();
    var apiProduct = viewData.product.raw;
    var context = { product: apiProduct, fullProduct: viewData.product };

    var pageTitle = seoFactory.create('META_TITLE', context, req, res);
    var pageDescription = seoFactory.create('META_DESCRIPTION', context, req, res);
    var pageKeywords = seoFactory.create('META_KEYWORDS', context, req, res);

    var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
    pageMetaHelper.setPageMetaTags(req.pageMetaData, viewData.product);
    req.pageMetaData.setTitle(pageTitle);
    req.pageMetaData.setDescription(pageDescription);
    req.pageMetaData.setKeywords(pageKeywords);
}

var sendQuestion = function (firstname, lastname, email, message, productInfo) {
    var isSuccess = false;
    var Mail = require('dw/net/Mail');
    var Template = require('dw/util/Template');
    var HashMap = require('dw/util/HashMap');
    var sitePrefs = Site.getCurrent().getPreferences();

    var sendTo = sitePrefs.getCustom().askAboutProductDestinationEmail;
    var context = new HashMap();
    context.put('firstName', firstname);
    context.put('lastName', lastname);
    context.put('email', email);
    context.put('message', message);
    context.put('productId', productInfo ? productInfo.id : '');
    context.put('productName', productInfo ? productInfo.name : '');

    var template = new Template('product/components/askAboutProductTemplate');
    template.setLocale(request.locale.toString()); // eslint-disable-line

    var content = template.render(context).text;

    var mailObj = new Mail();
    mailObj.addTo(sendTo);
    mailObj.setSubject(Resource.msg('ask.email.subject', 'product', null));
    mailObj.setFrom(email);
    mailObj.setContent(content, 'text/html', 'UTF-8');
    mailObj.send();
    isSuccess = true;

    return isSuccess;
};

var getProductInfo = function (productId) {
    var productInfo = null;
    if (productId) {
        var product = ProductMgr.getProduct(productId);
        if (product) {
            productInfo = {
                id: product.ID,
                name: product.name
            };
        }
    }
    return productInfo;
};
const getDepositPrice = function (product) {
    const enableOld = Site.getCurrent().getCustomPreferenceValue('testRacketEnableOld');
    const enableDeposit = Site.getCurrent().getCustomPreferenceValue('enableDepositTestRacket');
    if (!product.isTestRacket || enableOld || !enableDeposit) {
        return false;
    }
    const currencyCode = session.currency.currencyCode;
    const StringUtils = require('dw/util/StringUtils');
    const Money = require('dw/value/Money');
    return StringUtils.formatMoney(new Money(product.testRacketFakeProducts.depositCostsFakeProduct.price,
        currencyCode));
};

let getRawProductSearch = function (apiProduct, profiRootCategory) {
    let ArrayList = require('dw/util/ArrayList');
    let ProductSearchModel = require('dw/catalog/ProductSearchModel');
    let searchModel = new ProductSearchModel();
    searchModel.setProductIDs(new ArrayList(apiProduct.ID));
    searchModel.setRecursiveCategorySearch(true);
    searchModel.search();
    return searchModel.refinements.getNextLevelCategoryRefinementValues(profiRootCategory);
};


/**
 * Creates an object with information for displaying profi links
 * @param {Object} product - JS wrapped apiProduct
 * @returns {Object} profiObject - contains profi image and category link
 */
function attachProfiInformation(product) {
    var apiProduct = product.raw;
    var profiObject = {};
    var profiResult = [];
    var usedBy = apiProduct.custom.usedBy;
    if (!usedBy || usedBy.length === 0) {
        return profiResult;
    }
    var profiRootCategory = CatalogMgr.getCategory(CATEGORIES.profis);
    if (!profiRootCategory || !profiRootCategory.online) {
        return profiResult;
    }

    var catRefinements = getRawProductSearch(apiProduct, profiRootCategory);

    if (catRefinements && catRefinements.length > 0) {
        var collections = require('*/cartridge/scripts/util/collections');
        collections.forEach(catRefinements, function (refinementValue) {
            var profiCategory = CatalogMgr.getCategory(refinementValue.value);
            var catDisplayNameTrimmed = profiCategory.displayName.replace(/[^0-9a-zA-Z]+/g, '');
            profiObject = {};
            profiObject.img = catDisplayNameTrimmed + '.png';
            profiObject.alt = profiCategory.displayName;
            profiObject.categoryUrl = URLUtils.url('Search-Show', 'cgid', profiCategory.ID);
            profiObject.categoryID = profiCategory.ID;
            profiResult.push(profiObject);
        });
    }

    return profiResult;
}

/**
 * Creates the breadcrumbs object
 * @param {dw.catalog.Category} categoryIn - category
 * @param {string} product - product
 * @param {Array} breadcrumbs - array of breadcrumbs object
 * @returns {Array} an array of breadcrumb objects
 */
function getAllBreadcrumbs(categoryIn, product, breadcrumbs) {
    var category;
    if (product) {
        category = product.primaryCategory;
    } else if (categoryIn) {
        category = categoryIn;
    }

    if (category) {
        breadcrumbs.push({
            htmlValue: category.displayName,
            url: URLUtils.url('Search-Show', 'cgid', category.ID)
        });

        if (category.parent && category.parent.ID !== 'root') {
            return getAllBreadcrumbs(category.parent, null, breadcrumbs);
        }
    }

    return breadcrumbs;
}

/**
 * Creates store inventory object
 * @param {Object} variants - all variants
 * @param {string} variantId - the explicit variant ID, if available
 * @returns {Object} store inventories
 * @returns {boolean} hasStoreInventories
 */
function getStoreInventories(variants, variantId) {
    var ProductInventoryMgr = require('dw/catalog/ProductInventoryMgr');
    var storesList = Site.current.getCustomPreferenceValue('Stores') ? JSON.parse(Site.current.getCustomPreferenceValue('Stores')) : [];
    var stores = [];
    var hasStoreInventories = false;

    storesList.forEach(function (store) {
        var inventoryList = ProductInventoryMgr.getInventoryList(store.inventoryList);
        var inventories = [];
        var storeInfos = {};

        if (variantId) {
            // if the explicit variantId is passed, just return the inventory for this variant
            // -----------------------------------
            var inv = (inventoryList && inventoryList.getRecord(variantId)) ? inventoryList.getRecord(variantId).allocation.value : 0;
            inventories.push(inv);
            // showStore always set to true: if variantId is passed, it is the mobile view and for the mobile view all stores should be shown
            storeInfos = {
                showStore: true,
                inventories: inventories,
                title: store.title
            };
        } else if (variants) {
            // else pass all store inventories for all variants
            // -----------------------------------
            var hasInv = false;
            variants.forEach(function (variant) {
                var invv = (inventoryList && inventoryList.getRecord(variant.variantId)) ? inventoryList.getRecord(variant.variantId).allocation.value : 0;
                if (invv !== 0) {
                    hasInv = true; // indicator, if THIS store has store inventory at all
                    hasStoreInventories = true; // indicator, if ANY store has store inventory at all
                }
                inventories.push(invv);
            });

            storeInfos = {
                showStore: hasInv,
                inventories: inventories,
                title: store.title
            };
        }
        stores.push(storeInfos);
    });

    return {
        stores: stores,
        hasStoreInventories: hasStoreInventories
    };
}

server.get('StringingRacketOptions', serviceAvailability.isStringingServiceEnabled, function (req, res, next) {
    var ProductLink = require('dw/catalog/ProductLink');
    var qs = req.querystring;
    var variationGroupId = stringingHelpers.getVariationGroupId(qs.pid);
    var selectedRacketSize = qs.selectedRacketSize;
    var patternsUrl = URLUtils.url('StringingRacket-PatternsService', 'rid', variationGroupId).toString();
    req.session.privacyCache.set('currentRacket', variationGroupId);

    var viewData = res.getViewData();

    var racketProduct = ProductFactory.get({ pid: variationGroupId });

    if (racketProduct.linkedProducts && racketProduct.linkedProducts.length > 0) {
        var linkInfo = stringingHelpers.retrieveProductLink(racketProduct.linkedProducts, ProductLink.LINKTYPE_OTHER);
        if (linkInfo && linkInfo.expertRecommendation) {
            viewData.expertRecommendation = linkInfo.expertRecommendation;
            viewData.costs = linkInfo.costs;
        } else {
            linkInfo = stringingHelpers.retrieveProductLink(racketProduct.linkedProducts, ProductLink.LINKTYPE_ACCESSORY);
            if (linkInfo && linkInfo.expertRecommendation) {
                viewData.expertRecommendation = linkInfo.expertRecommendation;
                viewData.costs = linkInfo.costs;
            }
        }
    }

    // If an explicit racket size is submitted, then try to retrieve the appropriate
    // size and color parameters in order to search the racket variant
    if (selectedRacketSize) {
        var sizeOptions = stringingHelpers.readAttributeValueObject('size', racketProduct, selectedRacketSize);
        var colorOptions = stringingHelpers.readSelectedAttributeObject('color', racketProduct);
        var parameters = {
            pid: racketProduct.id,
            variables: {
                size: sizeOptions,
                color: colorOptions
            }
        };
        var racketVariant = ProductFactory.get(parameters);
        if (racketVariant && racketVariant.productType === 'variant' && racketVariant.available) {
            viewData.racketVariantId = racketVariant.id;
        }
    } else {
        viewData.loadSizesUrl = URLUtils.url('StringingRacket-LoadSizes', 'rid', racketProduct.id).toString();
    }

    viewData.patternsUrl = patternsUrl;
    viewData.racketId = qs.pid;

    const Redesigns = require('*/cartridge/scripts/redesigns');
    if (Redesigns.isABTestEnabled(res) || Redesigns.isABTestFeatureEnabled('productTiles', res)) {
        viewData.isProductTileRedesignEnabled = true;
    }
    res.setViewData(viewData);

    res.render('/product/stringingracket/productStringingRacketOptions');
    next();
});

server.get(
    'ChectAvailability',
    serviceAvailability.isPersonalizationServiceEnabled,
    function (req, res, next) {
        var cartHelpers = require('*/cartridge/scripts/cart/cartHelpers');
        var BasketMgr = require('dw/order/BasketMgr');
        var currentBasket = BasketMgr.getCurrentOrNewBasket();
        var qs = req.querystring;
        var variantId = qs.pid;
        var requestedQuantity = parseInt(qs.quantity, 10);
        var product = ProductMgr.getProduct(variantId);

        var basketQuantity = cartHelpers.getQtyAlreadyInCart(variantId, currentBasket.getAllProductLineItems());
        var perpetual = product.availabilityModel.inventoryRecord ? product.availabilityModel.inventoryRecord.perpetual : false;
        var totalQuantity = 0;
        if (product.availabilityModel.inventoryRecord) {
            totalQuantity = product.availabilityModel.inventoryRecord.ATS.value;
        }
        if (perpetual || totalQuantity >= (basketQuantity + requestedQuantity)) {
            res.json({
                error: false
            });
        } else {
            var message = Resource.msgf(
                'error.alert.selected.quantity.cannot.be.added.for',
                'product',
                null,
                product.name
            );
            res.json({
                error: true,
                message: message
            });
        }
        return next();
    });

server.get(
    'PersonalizeProductAddToCart',
    serviceAvailability.isPersonalizationServiceEnabled,
    function (req, res, next) {
        var qs = req.querystring;
        var variantId = qs.pid;
        var personalizationProductId = qs.ppid;
        var quantity = qs.quantity;
        quantity = parseInt(quantity, 10);
        var personalizationText = qs.text;
        var result = {
            error: false
        };

        var BasketMgr = require('dw/order/BasketMgr');
        var currentBasket = BasketMgr.getCurrentOrNewBasket();

        if (currentBasket) {
            var prodLineItems = currentBasket.getAllProductLineItems();
            var Transaction = require('dw/system/Transaction');

            var variantAvailabilityInCart = productHelper.isVariantAlreadyInBasket(currentBasket, variantId);
            var key = personalizationText + '_' + variantId;
            if (!variantAvailabilityInCart[key]) {
                var persoId = 'perso_' + variantId + '_' + (new Date()).getTime();
                Transaction.wrap(function () {
                    result = productHelper.addProductToCart(currentBasket, variantId, variantId, quantity, persoId, personalizationText);
                    if (!result.error) {
                        result = productHelper.addProductToCart(currentBasket, variantId, personalizationProductId, quantity, persoId, personalizationText);
                        if (result.error) {
                            throw new Error();
                        }
                    }
                });
            } else {
                var pliUuid = variantAvailabilityInCart[key].uuid;
                var persoObj = JSON.parse(variantAvailabilityInCart[key].personalization);
                var variantPli;
                var personalizationPli;
                for (var i = 0; i < prodLineItems.length; i++) {
                    if (prodLineItems[i].UUID === pliUuid) {
                        variantPli = prodLineItems[i];
                        quantity += prodLineItems[i].quantity.value;
                    } else if ('personalization' in prodLineItems[i].custom && prodLineItems[i].custom.personalization) {
                        var obj = JSON.parse(prodLineItems[i].custom.personalization);
                        if (obj.bundleId === persoObj.bundleId && obj.variantId !== persoObj.variantId) {
                            personalizationPli = prodLineItems[i];
                        }
                    }
                }

                if (variantPli && personalizationPli) {
                    Transaction.wrap(function () {
                        result = productHelper.updateCartQuantity(variantPli, quantity);
                        if (!result.error) {
                            result = productHelper.updateCartQuantity(personalizationPli, quantity);
                            if (result.error) {
                                throw new Error();
                            }
                        }
                    });
                }
            }
        }
        res.json(result);
        next();
    });

server.get('UpdatePersonalizationQuantity',
    serviceAvailability.isPersonalizationServiceEnabled,
    function (req, res, next) {
        var qs = req.querystring;
        var uuids = qs.uuids.split(';');
        var result;
        var BasketMgr = require('dw/order/BasketMgr');
        var currentBasket = BasketMgr.getCurrentOrNewBasket();
        var Transaction = require('dw/system/Transaction');
        var quantity = parseInt(qs.quantity, 10);
        var productLineItemsToUpdate = [];

        for (var i = 0; i < currentBasket.getAllProductLineItems().length; i++) {
            if (uuids.indexOf(currentBasket.getAllProductLineItems()[i].UUID) >= 0) {
                productLineItemsToUpdate.push(currentBasket.getAllProductLineItems()[i]);
            }
        }
        if (productLineItemsToUpdate.length === 2) {
            Transaction.wrap(function () {
                result = productHelper.updateCartQuantity(productLineItemsToUpdate[0], quantity);
                if (!result.error) {
                    result = productHelper.updateCartQuantity(productLineItemsToUpdate[1], quantity);
                }
            });
        }

        res.json(result);
        next();
    });

// Personalize products
server.get(
    'PersonalizeProduct',
    serviceAvailability.isPersonalizationServiceEnabled,
    function (req, res, next) {
        var qs = req.querystring;
        const pid = qs.pid;
        const quantity = qs.quantity;
        const product = ProductFactory.get({ pid: pid });
        let personalizationVariants = [];
        let selectedSize = qs.selectedSize;
        let stringing = Boolean(qs.str);
        let textColor;
        let labelColor;
        let labelText;
        let personalizationMethodMsg;
        let actionUrls = {};
        let refererPage = qs.origin || 'productDetail';
        if (refererPage === 'productDetail') {
            actionUrls.redirectTo = URLUtils.url('Cart-Show').toString();
            actionUrls.handlerAction = URLUtils.url('Product-PersonalizeProductAddToCart').toString();
        } else if (refererPage === 'expertRecommendation') {
            var url = req.httpHeaders.referer;
            if (!url.match('keepconfig')) {
                url += '&keepconfig=true';
            }
            actionUrls.redirectTo = url;
            actionUrls.handlerAction = URLUtils.url('StringingRacket-AddPersonalization').toString();
        } else {
            actionUrls.redirectTo = null;
            actionUrls.handlerAction = URLUtils.url('StringingRacket-AddPersonalization');
        }

        // get product linked personalization data
        let variants = 'linkedPersonalizationServices' in product
            ? product.linkedPersonalizationServices
            : [];

        if (!empty(variants)) {
            for (let i = 0; i < variants.length; i++) {
                // For first MVP  just take default values without select boxes
                if (variants[i].targetProduct.custom.personalizationColor === 'auto'
                    || variants[i].targetProduct.custom.personalizationPosition === 'auto') {
                    let minimalProduct = ProductFactory.get({ pid: variants[i].targetProduct.ID, pview: 'minimal' });
                    personalizationVariants.push(minimalProduct);
                    break;
                }
            }

            // create dynamic headline
            let headlinePropertyKey = 'text.personalization';
            if (product.tradeGroup === 'rackets'
                || product.tradeGroup === 'shoes'
                || product.tradeGroup === 'bags'
                || product.tradeGroup === 'accessories') {
                headlinePropertyKey += '.' + product.tradeGroup; // set correct headline message, if tradeGroup matches
            }
            let sizeTypeLabel = Resource.msg(product.sizeTypeLabel, 'product', null);
            let headlineMsg = Resource.msgf(headlinePropertyKey, 'product', null, sizeTypeLabel, selectedSize);

            // create dynamic text
            if (personalizationVariants[0].personalizations.method === 'laser') {
                labelColor = Resource.msg('label.personalization.color', 'product', null);
                textColor = Resource.msg('text.personalization.color.auto', 'product', null);
                labelText = Resource.msg('label.personalization.textForLaserEngraving', 'product', null);
                personalizationMethodMsg = Resource.msg('label.personalization.laserengraving', 'product', null);
            } else {
                labelColor = Resource.msg('label.personalization.color.yarn', 'product', null);
                textColor = Resource.msg('text.personalization.color.auto.yarn', 'product', null);
                labelText = Resource.msg('label.personalization.textForEmbroidery', 'product', null);
                personalizationMethodMsg = Resource.msg('label.personalization.embroidery', 'product', null);
            }

            res.setViewData({
                pid: pid,
                quantity: quantity,
                headlineMsg: headlineMsg,
                refererPage: refererPage,
                personalizationMethodMsg: personalizationMethodMsg,
                personalizationVariants: personalizationVariants,
                redirectTargetUrl: actionUrls.redirectTo,
                stringing: stringing,
                form: {
                    action: actionUrls.handlerAction,
                    labelColor: labelColor,
                    textColor: textColor,
                    labelText: labelText
                }
            });

            res.render('/product/personalizeProductOptions');
        }
        next();
    }
);

/**
 * Generates a map of string resources for the template
 *
 * @returns {ProductDetailPageResourceMap} - String resource map
 */
function getResources() {
    return {
        info_selectforstock: Resource.msg('info.selectforstock', 'product',
            'Select Styles for Availability')
    };
}

/**
 * Renders the Product Details Page
 * @param {Object} querystring - query string parameters
 * @param {Object} res - response object
 */
function showProductPage(querystring, res) {
    const ArrayList = require('dw/util/ArrayList');
    var params = querystring;
    var product = ProductFactory.get(params);

    if (!product) {
        res.redirect(URLUtils.url('Home-ErrorNotFound'));
        return;
    }

    if (!product.available) {
        var dateNow = new Date();
        // check the root cause
        if (product.onlineFrom) {
            if (product.onlineFrom > dateNow) {
                res.redirect(URLUtils.url('Home-ErrorNotFound'));
                return;
            }
        }
        if (product.onlineTo) {
            if (product.onlineTo < dateNow) {
                res.redirect(URLUtils.url('Home-ErrorNotFound'));
                return;
            }
        }
    }

    let template = 'product/productDetails';
    const Redesigns = require('*/cartridge/scripts/redesigns');

    if (Redesigns.isABTestEnabled(res) || Redesigns.isABTestFeatureEnabled('productTiles', res)) {
        let viewData = res.getViewData();
        viewData.isProductTileRedesignEnabled = true;
        res.setViewData(viewData);
    }

    const pdpRedesignEnabled = Redesigns.isPDPABTestEnabled(res);
    const shoeSizeLocales = new ArrayList();
    let shoeSizeLabels = null;


    if (pdpRedesignEnabled) {
        template = 'product/productDetailsRedesign';

        product.sizeSelected = productHelper.getVariantSizeSelected(product.id);
        shoeSizeLabels = productHelper.buildShoesSizesLocalizedLabels(Site.getCurrent().ID);

        shoeSizeLocales.add('euSize');
        shoeSizeLocales.add('enSize');
        shoeSizeLocales.add('usSize');
    } else {
        product.sizeSelected = null;
    }

    if (product.productType === 'bundle') {
        template = 'product/bundleDetails';
    } else if (product.productType === 'set') {
        template = 'product/setDetails';
    }

    var ShippingMgr = require('dw/order/ShippingMgr');
    var BasketMgr = require('dw/order/BasketMgr');

    var defaultShippingMethod = ShippingMgr.getDefaultShippingMethod();
    var apiProduct = ProductMgr.getProduct(product.id);
    var ProductShippingModel = ShippingMgr.getProductShippingModel(apiProduct);
    let resulting = ProductShippingModel.getShippingCost(defaultShippingMethod);


    // var currencySymbol = Currency.getCurrency(test.currencyCode).getSymbol();
    // var currentBasket = BasketMgr.getCurrentOrNewBasket();

    res.render(template, {
        CurrentPageMetaData: {
            title: product.productName
        },
        product: product,
        shoesSizeLocales: shoeSizeLocales,
        shoeSizeLabels: shoeSizeLabels,
        addToCartUrl: URLUtils.url('Cart-AddProduct'),
        isTROldFeatureEnabled: Site.getCurrent().getCustomPreferenceValue('testRacketEnableOld'),
        isTestRacketEnabled: Site.getCurrent().getCustomPreferenceValue('enableTestRackets'),
        resources: getResources()
    });
}

server.replace('Show', consentTracking.consent, function (req, res, next) {
    showProductPage(req.querystring, res);
    next();
});

server.append(
    'Show',
    cache.applyPromotionSensitiveCache,
    googleTagManager.createDataLayer,
    function (req, res, next) {
        appendMetaData(req, req.pageMetaData, res);

        // badges and deal-of-day (which is handled independently)
        var viewData = res.getViewData();
        var product = viewData.product;
        var shippingDurationHelper = require('app_storefront_common/cartridge/scripts/checkout/shippingDuration.js');
        var pricingHelpers = require('app_storefront_common/cartridge/scripts/helpers/pricing.js');

        // Store Inventory
        // ------------------------
        var isStoreInventoryEnabled = Site.current.getCustomPreferenceValue('EnableStoreInventoryList');
        var hasStoreInventories = false;
        var storeInventories = null;
        var stores = null;
        var variants = null;

        if (isStoreInventoryEnabled) {
            var variationAttribute = product.variationAttributes;
            var sizeAttr = arrayUtil.find(variationAttribute, function (attribute) {
                return attribute.id === 'size';
            });
            if (sizeAttr) {
                variants = sizeAttr.values;
            }

            // update store inventory variables only, if isStoreInventoryEnabled is set to true
            storeInventories = getStoreInventories(variants, null);
            stores = storeInventories.stores;
            hasStoreInventories = storeInventories.hasStoreInventories;
        }
        // ------------------------

        var bazaarvoiceActivation = Site.current.getCustomPreferenceValue('TP_Bazaarvoice_Activation');

        const stringingServiceEnabled = Site.current.getCustomPreferenceValue('EnableStringingService');

        if (stringingServiceEnabled && product.tradeGroup === 'rackets' && stringingHelpers.isTennisRacket(product)) {
            var url = URLUtils.url('Product-StringingRacketOptions').toString();
            url += '?' + req.querystring;
            viewData.stringingURL = url.toString();
            res.setViewData(viewData);
        }

        // check if a product is personalizable
        var isPersonalizable = productHelper.isProductPersonalizable(product);

        // do not display uvp and sales when percentage < 2
        if (viewData.product) {
            viewData.product.price.showSales = pricingHelpers.getValueDisplayPercentage(viewData.product.price);
        }

        viewData.crossProductsEnabled = Site.current.getCustomPreferenceValue('EnablePDPLinkedProducts');

        // show compare button on PDP?
        var compare = (product.primaryCategory && 'productCompare' in product.primaryCategory.custom && product.primaryCategory.custom.productCompare) || false;

        // fit analitics
        var isApparelProduct = product.tradeGroup === 'apparel';
        var fitAnalyticsEnabled = Site.getCurrent().getCustomPreferenceValue('fitAnalyticsEnabled') && isApparelProduct;

        // Breadcrumbs
        var breadcrumbs = getAllBreadcrumbs(null, product, []).reverse();
        breadcrumbs.push({
            htmlValue: product.productName
        });

        // linked product for recommendation banner (slot configuration)
        var linkedProduct = recommendationBanner.createRecommendationContent(product);

        // model size info
        var showModelInfo = Site.current.getCustomPreferenceValue('EnableModelInfo');

        // Third-Party Variables
        let shoeSizeMeShoeId = '';
        let criteoObj = {};

        if (product) {
            const rawCurrentCustomer = req.currentCustomer.raw;

            shoeSizeMeShoeId = require('*/cartridge/scripts/helpers/shoeSizeMeHelper.js').getShoeId(product);
            criteoObj = require('*/cartridge/scripts/helpers/criteoHelper.js').getCriteoProductObject(rawCurrentCustomer, product);
        }

        res.setViewData({
            pageType: 'PRODUCT',
            linkedProduct: linkedProduct,
            canonicalUrl: seoFactory.create('CANONICAL_URL', { product: product }, req, res),
            badge: badge.getBadge(product, false),
            promotion: (product.badges && product.badges.dealOfDay) ? badge.getBadge(product, true) : false,
            getShippingDurationByVariantId: shippingDurationHelper.getShippingDurationByVariantIdExtended,
            compare: compare,
            profiInformation: attachProfiInformation(product),
            fitAnalyticsEnabled: fitAnalyticsEnabled,
            breadcrumbs: breadcrumbs,
            enableBazaarvoice: bazaarvoiceActivation,
            isProductPersonalizable: isPersonalizable,
            showFromPrice: false,
            showStoreInventory: isStoreInventoryEnabled,
            hasStoreInventories: hasStoreInventories,
            stores: stores,
            rentingCosts: getDepositPrice(product),
            variants: variants,
            mainCategory: categoryHelper.getMainCategory(product.primaryCategory),
            showPromoCallout: true,
            showModelInfo: showModelInfo,
            hasDefaultTournamentRefinement: Site.current.getCustomPreferenceValue('activeDefaultTournamentRefinement'),
            shoeSizeMeShoeId: shoeSizeMeShoeId,
            criteoObj: criteoObj,
            stringingServiceEnabled: stringingServiceEnabled
        });
        next();
    },
    pageMetaData.computedPageMetaData
);

server.append('Variation', cache.applyShortPromotionSensitiveCache, function (req, res, next) {
    const renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');

    const viewData = res.getViewData();
    const product = viewData.product;
    if (product) {
        if (product.isTestRacket && !Site.getCurrent().getCustomPreferenceValue('testRacketEnableOld')) {
            product.price = product.testRacketPrice;
        }

        if (product.price) {
            product.price.showSales = priceHelper.getValueDisplayPercentage(product.price);
        }

        // append HTML for prices-box and tiered-prices-table
        var priceContext = priceHelper.getHtmlContext(product.price);
        var testRacketContext = product.isTestRacket;
        var pricePercentageContext = product.price.percentage ? priceHelper.getHtmlContext(product.price.percentage) : null;

        var contexts = [];
        contexts.push({ name: 'price', context: priceContext });
        contexts.push({ name: 'isTestRacket', context: testRacketContext });
        contexts.push({ name: 'pricePercentage', context: pricePercentageContext });
        contexts.push({ name: 'rentingCosts', context: getDepositPrice(product) });
        contexts.push({ name: 'showTieredPriceInfo', context: product.showTieredPriceInfo });

        if (product.price.unit) {
            contexts.push({ name: 'unitPrice', context: priceHelper.getHtmlContext(product.price.unit) });
        }
        product.price.html = priceHelper.renderHtmlExtended(contexts);

        if (product.tieredPrices) {
            var tieredPriceContext = priceHelper.getHtmlContext(product.tieredPrices);
            contexts.push({ name: 'tieredPrices', context: tieredPriceContext });
            product.tieredPrices.html = {
                info: priceHelper.renderHtmlExtended(contexts),
                table: priceHelper.renderHtml(tieredPriceContext, 'product/components/pricing/ajaxTiered')
            };
        }

        // append HTML for expected delivery date
        var deliveryContext = { product: { expectedDeliveryDate: product.expectedDeliveryDate } };
        product.deliveryHtml = renderTemplateHelper.getRenderedHtml(deliveryContext, 'product/components/deliveryPre');
        product.deliveryRedesignHtml = renderTemplateHelper.getRenderedHtml(deliveryContext, 'product/productDetailRedesignComponents/stockPre');

        const shippingStandardContext = {
            product: product
        };
        product.shippingRedesignHtml = renderTemplateHelper.getRenderedHtml(shippingStandardContext, 'product/productDetailRedesignComponents/standardShippingPre');

        // append HTML for shipping costs message incl. taxes
        var shippingCostsContext = { freeShipping: product.freeShipping, taxRate: product.taxRate, isNetPriceCustomer: customer.isMemberOfCustomerGroup('NetPriceCustomers') || customer.isMemberOfCustomerGroup('BusinessCustomers') };
        product.shippingCostsHtml = renderTemplateHelper.getRenderedHtml(shippingCostsContext, 'product/components/shippingCosts');

        // append HTML for attribute lists UVP price
        product.price.htmlUvp = priceHelper.renderHtml(priceContext, 'product/components/pricing/ajaxUvp');

        // append HTML for attribute lists unit price
        if (product.price.unit) {
            product.price.htmlUnit = priceHelper.renderHtml(priceHelper.getHtmlContext(product.price.unit), 'product/components/pricing/ajaxUnit');
        }

        // get badge to be displayed
        product.badge = badge.getBadge(product, false);
        product.badge.html = renderTemplateHelper.getRenderedHtml({
            badge: {
                type: product.badge.type,
                reduction: product.badge.reduction
            }
        }, 'product/components/productBadge');

        const criteoObj = require('*/cartridge/scripts/helpers/criteoHelper.js').getCriteoProductObject(req.currentCustomer.raw, product);
        viewData.criteoObj = criteoObj;

        res.setViewData(viewData);
    } else {
        res.setStatusCode(500);
        res.json({
            error: true,
            productError: true
        });
    }

    next();
});

server.get('InventoryList', function (req, res, next) {
    var variantId = req.querystring.variantId;
    var stores = getStoreInventories(null, variantId).stores;

    res.render('product/components/storeInventoryTable', {
        stores: stores
    });
    next();
});

server.append('ShowInCategory', cache.applyPromotionSensitiveCache, function (req, res, next) {
    appendMetaData(req, req.pageMetaData, res);
    next();
});

server.get('AskForm', csrfProtection.generateToken, function (req, res, next) {
    var form = server.forms.getForm('questions');
    var qs = req.querystring;
    var fields = {
        pid: qs.pid
    };
    if (session.custom.askmsg) { // eslint-disable-line
        fields = JSON.parse(session.custom.askmsg); // eslint-disable-line
        fields.pid = qs.pid;
        session.custom.askmsg = null; // eslint-disable-line
    } else {
        form.clear();
    }

    res.render('product/components/asktaboutproduct', {
        askForm: form,
        fields: fields
    });
    next();
});

server.post('Ask', csrfProtection.validateRequest, function (req, res, next) {
    var form = server.forms.getForm('questions');
    var firstName = form.firstname.value;
    var lastName = form.lastname.value;
    var productId = form.pid.value;
    var msg = form.message.value;
    var email = form.email.value;
    var botProtection = form.botprotection.value;
    var messages = {};
    var isEmailValid = utils.validateEmail(email);
    var isError = false;
    session.custom.askmsg = null; // eslint-disable-line

    if (!firstName) {
        messages[form.firstname.htmlName] = { class: ' is-invalid', msg: Resource.msg('ask.form.error.missing', 'product', null) };
        isError = true;
    }
    if (!lastName) {
        messages[form.lastname.htmlName] = { class: ' is-invalid', msg: Resource.msg('ask.form.error.missing', 'product', null) };
        isError = true;
    }
    if (!isEmailValid) {
        messages[form.email.htmlName] = { class: ' is-invalid', msg: Resource.msg('ask.form.error.missing', 'product', null) };
        isError = true;
    }
    if (!msg) {
        messages[form.message.htmlName] = { class: ' is-invalid', msg: Resource.msg('ask.form.error.missing', 'product', null) };
        isError = true;
    }
    if (msg && msg.length < 20) {
        messages[form.message.htmlName] = { class: ' is-invalid', msg: Resource.msg('ask.form.error.short.message', 'product', null) };
        isError = true;
    }
    if (!isError && botProtection === null) {
        var productInfo = getProductInfo(productId);
        var isSuccess = sendQuestion(firstName, lastName, email, msg, productInfo);
        if (!isSuccess) {
            messages.generalerror = Resource.msg('ask.form.error.general', 'product', null);
            isError = true;
        }
    }
    if (isError) {
        session.custom.askmsg = JSON.stringify(messages); // eslint-disable-line
    } else {
        session.custom.askmsg = null; // eslint-disable-line
    }
    res.redirect(require('dw/web/URLUtils').https('Product-AskForm', 'pid', productId));
    next();
});

server.get('GetShippingCosts', function (req, res, next) {
    const qs = req.querystring;
    const taxRate = qs.taxRate;
    const freeShipping = qs.freeShipping === 'true' || false;

    let template = 'product/components/shippingCosts';

    // Set applicable Pricebooks
    priceHelper.setApplicablePricebooks();

    const Redesigns = require('*/cartridge/scripts/redesigns');
    const pdpRedesignEnabled = Redesigns.isPDPABTestEnabled(res);

    if (pdpRedesignEnabled) {
        template = 'product/productDetailRedesignComponents/shippingCosts';
    }

    res.render(template, {
        taxRate: taxRate,
        freeShipping: freeShipping,
        isNetPriceCustomer: customer.isMemberOfCustomerGroup('NetPriceCustomers') || customer.isMemberOfCustomerGroup('BusinessCustomers')
    });
    return next();
});

module.exports = server.exports();
