'use strict';

var server = require('server');
var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');
var Locale = require('dw/util/Locale');
var StringUtils = require('dw/util/StringUtils');
var CatalogMgr = require('dw/catalog/CatalogMgr');
var ProductSearchModel = require('dw/catalog/ProductSearchModel');
var Site = require('dw/system/Site');
var cache = require('*/cartridge/scripts/middleware/cache');
var NavigationHelper = require('*/cartridge/scripts/helpers/navigationHelper.js');
var seoFactory = require('../scripts/seo/seoFactory');
var categoryBanner = require('../scripts/categoryBanner');
var categoryHelper = require('*/cartridge/scripts/helpers/categoryHelper.js');
var arrayUtil = require('*/cartridge/scripts/util/array');
var googleTagManager = require('../scripts/middleware/googleTagManager');
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
var CATEGORIES = require('*/cartridge/config/categories.json');
var priceHelper = require('*/cartridge/scripts/helpers/pricing');
var collections = require('*/cartridge/scripts/util/collections');
var stringingHelpers = require('app_storefront_common/cartridge/scripts/helpers/stringingHelper');
const Redesigns = require('*/cartridge/scripts/redesigns');
var hasCustomRenderingTemplate = false;

server.extend(module.superModule);

/**
 * @param {Object} category - The category object
 * @param {Object} selectedRefinements - Object of selected filters
 * @return {boolean} check value
 */
function shouldDisplayCollectionName(category, selectedRefinements) {
    return category && 'displayCollectionName' in category.custom && category.custom.displayCollectionName
        && 'brand' in selectedRefinements && selectedRefinements.brand.length > 0;
}

/**
 * group Refinenemts
 * @param {*} refinements - refienements
 * @returns {*} object
 */
function groupTournaments(refinements) {
    if (refinements) {
        var SortedMap = require('dw/util/SortedMap');
        var ArrayList = require('dw/util/ArrayList');
        var tournaments = new SortedMap(function (a, b) {
            if (a === b) return 0;
            return a < b ? 1 : -1;
        });

        for (var index = 0; index < refinements.length; index++) {
            var refinement = refinements[index];
            if (refinement.attributeId === 'tournament') {
                var refinementValues = refinement.values;
                for (var i = 0; i < refinementValues.length; i++) {
                    var refValue = refinementValues[i];
                    var tournamentYearMatch = refValue.displayValue.match('20\\d{2}');
                    if (tournamentYearMatch && tournamentYearMatch[0]) {
                        var year = tournamentYearMatch[0];

                        var tournamentValues = tournaments.get(year);
                        if (!tournamentValues) {
                            tournamentValues = new ArrayList();
                        }
                        tournamentValues.add(refValue);
                        tournaments.put(year, tournamentValues);
                    }
                }
            }
        }
        return tournaments;
    }
    return null;
}

/**
 * getSelectedTournamentYears
 * @param {*} tournaments - tournaments
 * @returns {*} selectedTournaments
 */
function getSelectedTournamentYears(tournaments) {
    var selectedTournaments = [];
    if (tournaments) {
        var keyIterator = tournaments.keySet().iterator();
        while (keyIterator.hasNext()) {
            var key = keyIterator.next();
            var tournamentsInYear = tournaments.get(key);
            for (var i = 0; i < tournamentsInYear.length; i++) {
                if (tournamentsInYear.get(i).selected) {
                    selectedTournaments.push(key);
                    break;
                }
            }
        }
    }
    return selectedTournaments;
}

/**
 * @param {Object} category - The category object
 * @return {boolean} check value
 */
function shoulddisplayProductType(category) {
    if (!category.parent) {
        return false;
    }
    return CATEGORIES.profis === category.parent.ID;
}

/**
 * Set search configuration values
 *
 * @param {dw.catalog.ProductSearchModel} apiProductSearch - API search instance
 * @param {Object} params - Provided HTTP query parameters
 * @return {void}
 */
function setupSearch(apiProductSearch, params) {
    var search = require('*/cartridge/scripts/search/search');
    var preferences = params.preferences || {};
    var privacySession = request.getSession().privacy;
    var sortingRule;

    var selectedCategory = CatalogMgr.getCategory(params.cgid);
    selectedCategory = selectedCategory && selectedCategory.online ? selectedCategory : null;

    /**
     * As soon as a brand has been selected in the tennis racket category, products are sorted and grouped according to
     * the productLine attribute. We check if the sorting has to be set.
     */
    if (shouldDisplayCollectionName(selectedCategory, preferences)) {
        sortingRule = CatalogMgr.getSortingRule('product-collection-ascending');
        privacySession.displayCollectionName = true;
    } else {
        privacySession.displayCollectionName = false;
        sortingRule = params.srule ? CatalogMgr.getSortingRule(params.srule) : null;
    }

    search.setProductProperties(apiProductSearch, params, selectedCategory, sortingRule);

    if (params.preferences) {
        search.addRefinementValues(apiProductSearch, params.preferences);
    }
}

/**
 * Retrieve a category's template filepath if available
 *
 * @param {dw.catalog.ProductSearchModel} apiProductSearch - API search instance
 * @return {string} - Category's template filepath
 */
function getCategoryTemplate(apiProductSearch) {
    return apiProductSearch.category ? apiProductSearch.category.template : '';
}

/**
 * Returns array of breadcrumbs of current search page.
 * @param {Object} productSearch - product search model
 * @param {Object} category - category object
 * @return {array} array of breadcrumbs
 */
function generateBreadcrumbs(productSearch, category) {
    var breadcrumbs = [];

    if (productSearch.isCategorySearch) {
        while (category && !category.isRoot()) {
            if (category.ID === CATEGORIES.aktion) {
                category = category.getParent(); // eslint-disable-line
                continue; // eslint-disable-line
            }

            breadcrumbs.unshift({
                id: category.ID,
                htmlValue: category.getDisplayName(),
                url: URLUtils.url('Search-Show', 'cgid', category.ID).toString()
            });
            category = category.getParent(); // eslint-disable-line
        }
    } else {
        breadcrumbs.unshift({
            htmlValue: Resource.msg('label.header.banner', 'search', null),
            url: productSearch.baseUrl.toString()
        });
    }

    // add home breadcrumb at the beginning
    breadcrumbs.unshift({
        htmlValue: Resource.msg('global.storename', 'common', null),
        url: URLUtils.home().toString()
    });

    return breadcrumbs;
}

/**
 * Returns the adjusted product search needed for the brands page navigation tree (adidas).
 * @param {boolean} isCategoryOfBrands check for brand category
 * @param {ProductSearchModel} productSearch the current product search object
 * @param {Object} filters object of active refinements
 * @return {ProductSearchModel} product search for top level category
 */
function getOriginalProductSearch(isCategoryOfBrands, productSearch, filters) {
    if (!isCategoryOfBrands) {
        return productSearch;
    }
    // for brand categories: re-execute the search for root with brand refinement set
    var apiProductSearch = new ProductSearchModel();
    apiProductSearch.setCategoryID('root');
    apiProductSearch.setRecursiveCategorySearch(true);

    if (typeof filters === 'object' && Object.keys(filters).length > 0) {
        // set search refinements
        Object.keys(filters).forEach(function (key) {
            if (key === 'pmin') {
                apiProductSearch.setPriceMin(parseInt(filters[key], 10));
            } else if (key === 'pmax') {
                apiProductSearch.setPriceMax(parseInt(filters[key], 10));
            } else {
                apiProductSearch.setRefinementValues(key, filters[key]);
            }
        });
    }
    apiProductSearch.search();
    return apiProductSearch;
}

/**
 * Returns the search with current parameters, but with the top level category
 * of the category path (below root).
 * @param {ProductSearchModel} productSearch the current product search object
 * @param {Object} categoryPath category path
 * @param {Object} filters object of active refinements
 * @param {boolean} isCategoryOfBrands check for brand category
 * @return {ProductSearchModel} product search for top level category
 */
function getRefinedRootCategorySearch(productSearch, categoryPath, filters, isCategoryOfBrands) {
    if (productSearch.categoryID === categoryPath[0].ID) {
        return productSearch;
    }

    var apiProductSearch = new ProductSearchModel();
    apiProductSearch.setCategoryID(isCategoryOfBrands ? 'root' : categoryPath[0].ID);
    apiProductSearch.setRecursiveCategorySearch(true);

    if (typeof filters === 'object' && Object.keys(filters).length > 0) {
        // set search refinements
        Object.keys(filters).forEach(function (key) {
            if (key === 'pmin') {
                apiProductSearch.setPriceMin(parseInt(filters[key], 10));
            } else if (key === 'pmax') {
                apiProductSearch.setPriceMax(parseInt(filters[key], 10));
            } else {
                apiProductSearch.setRefinementValues(key, filters[key]);
            }
        });
    }
    apiProductSearch.search();
    return apiProductSearch;
}

/**
 * Returns the search without any refinements with the top level category
 * of the category path (below root).
 * @param {ProductSearchModel} productSearch the current product search object
 * @param {ProductSearchModel} refinedProductSearch the refined product search object
 * @param {Object} categoryPath category path
 * @param {Object} filters object of active refinements
 * @param {boolean} isCategoryOfBrands check for brand category
 * @return {ProductSearchModel} product search for top level category
 */
function getUnrefinedRootCategorySearch(productSearch, refinedProductSearch, categoryPath, filters, isCategoryOfBrands) {
    if (productSearch.categoryID === categoryPath[0].ID && Object.keys(filters).length === 0) {
        return productSearch;
    } else if (Object.keys(filters).length === 0) {
        return refinedProductSearch;
    }

    var apiProductSearch = new ProductSearchModel();
    apiProductSearch.setCategoryID(isCategoryOfBrands ? 'root' : categoryPath[0].ID);
    apiProductSearch.setRecursiveCategorySearch(true);
    apiProductSearch.search();
    return apiProductSearch;
}

/**
 * Returns an the category navigation tree.
 * @param {boolean} isCategoryOfBrands check for brand category
 * @param {Object} category the category object
 * @param {ProductSearch} productSearch the product search object
 * @param {Object} httpParams object of http get params
 * @param {string} categoryDisplayName display value of the original category
 * @return {array} array of top navigation items
 */
function getNavigationTree(isCategoryOfBrands, category, productSearch, httpParams, categoryDisplayName) {
    var navigationTree = {};
    var categoryPath;
    var preferences = httpParams.preferences || {};
    var selectedFilters = {};

    if ('pmin' in httpParams) {
        selectedFilters.pmin = httpParams.pmin;
    }
    if ('pmax' in httpParams) {
        selectedFilters.pmax = httpParams.pmax;
    }

    Object.keys(preferences).forEach(function (key) {
        selectedFilters[key] = preferences[key];
    });

    if (isCategoryOfBrands) {
        selectedFilters.brand = categoryDisplayName;
    }

    var originalProductSearch = getOriginalProductSearch(isCategoryOfBrands, productSearch, selectedFilters);

    categoryPath = NavigationHelper.getMainCategoriePath(category);
    // three cases need to be handled to show correct left navigation coming from the navigation tree:
    // 1) no orderable products in category, without any active refinements - don't show at all
    //    -> category refinements of unrefinedProductSearch
    // 2) no orderable products in category for current active refinements - show as grey/disabled
    //    -> category refinements of refinedProductSearch
    // 3) orderable products for current active refinements - show as selectable category
    //    -> everything else
    var refinedProductSearch = getRefinedRootCategorySearch(originalProductSearch, categoryPath, selectedFilters, isCategoryOfBrands);
    var unrefinedProductSearch = getUnrefinedRootCategorySearch(originalProductSearch, refinedProductSearch, categoryPath, selectedFilters, isCategoryOfBrands);
    navigationTree = NavigationHelper.generateNavigationTree(
        categoryPath[0],
        categoryPath,
        originalProductSearch,
        refinedProductSearch,
        unrefinedProductSearch,
        refinedProductSearch.refinements.getNextLevelCategoryRefinementValues(category),
        unrefinedProductSearch.refinements.getNextLevelCategoryRefinementValues(category)
    );

    return navigationTree;
}

/**
 * Appends search relevant parameters from the querystring to the given url.
 * @param {dw.web.URL} url given url
 * @param {Object} qs querystring
 * @param {string} replacePrefName preference to be updated if given
 * @param {string} replacePrefValue preference value to be updated if given
 */
function appendSearchParams(url, qs, replacePrefName, replacePrefValue) {
    var whitelistedParams = { q: true, cgid: true, pmin: true, pmax: true, srule: true };
    var replaced = false;
    var i = 1;
    Object.keys(qs).forEach(function (element) {
        if (whitelistedParams[element]) {
            url.append(element, qs[element]);
        }
        if (element === 'preferences') {
            Object.keys(qs[element]).forEach(function (preference) {
                url.append('prefn' + i, preference);
                url.append('prefv' + i, (preference === replacePrefName ? replacePrefValue : qs[element][preference]));
                i++;
                replaced = replaced || preference === replacePrefName;
            });
        }
    });
    if (replacePrefName && !replaced) {
        url.append('prefn' + i, replacePrefName);
        url.append('prefv' + i, replacePrefValue);
    }
}

/**
 * Prepares product line refinements.
 * @param {Object} productSearch Product search object
 * @param {Object} qs query string object
 * @return {array} prepared product line refinements
 */
function prepareProductLineRefinement(productSearch, qs) {
    var productLineRefinement = arrayUtil.find(
        productSearch.refinements,
        function (refinement) {
            return refinement.attributeId === 'productLine';
        }
    );

    /**
     * We recalculate the refinement urls so that only one product line can be selected.
     */
    if (productLineRefinement && 'values' in productLineRefinement) {
        productLineRefinement.values.forEach(function (value) {
            if (value.selected === false) {
                var baseurl = URLUtils.url('Search-Show');
                appendSearchParams(baseurl, qs, 'productLine', value.displayValue);
                value.url = baseurl.relative().toString(); // eslint-disable-line
            }
        });
    }

    return productLineRefinement;
}

/**
 * Execute a search for the given category and returns a map with the next level category
 * refinements ids.
 * @param {dw.catalog.Category} category - category API object
 * @return {Object} map of category ids
 */
function getCategoryRefinementIDs(category) {
    var apiProductSearch = new ProductSearchModel();
    apiProductSearch.setCategoryID(category.ID);
    apiProductSearch.setRecursiveCategorySearch(true);
    apiProductSearch.search();
    var catRefinements = apiProductSearch.refinements.getNextLevelCategoryRefinementValues(category);
    var categoryRefinementIDs = {};
    if (catRefinements && catRefinements.length > 0) {
        collections.forEach(catRefinements, function (refinementValue) {
            categoryRefinementIDs[refinementValue.value] = true;
        });
    }
    return categoryRefinementIDs;
}


/**
 * Return refinements list ordered (first values selected)
 * @param {list} refinements queryString of the search
 * @return {list} refinements ordered
*/
function orderRefinementValues(refinements) {
    for (let i = 0; i < refinements.length; i++) {
        refinements[i].values.sort(function (a, b) {
            if (a.selected && !b.selected) {
                return -1;
            }
            if (b.selected && !a.selected) {
                return 1;
            }
            return 0;
        });
    }
    return refinements;
}

/**
 * Return the most expensive price in a search
 * @param {string} queryString queryString of the search
 * @return {float} prepared product line refinements
 */
function getMaxPriceOnProductSearch(queryString) {
    let maxPrice = 0;
    let queryStringProcessed = queryString;

    if (queryStringProcessed.pmax) {
        delete queryStringProcessed.pmax;
    }

    let apiProductSearch = new ProductSearchModel();
    let priceHightToLowSR = CatalogMgr.getSortingRule('price-high-to-low');
    apiProductSearch.setSortingRule(priceHightToLowSR);

    setupSearch(apiProductSearch, queryStringProcessed);
    apiProductSearch.search();
    let expensiveProductOnSearch = apiProductSearch.productSearchHits.next();
    if (expensiveProductOnSearch && expensiveProductOnSearch.maxPrice) {
        maxPrice = expensiveProductOnSearch.maxPrice.value;
    }
    return maxPrice;
}

/**
 * Return the most expensive price in a search
 * @param {string} queryString queryString of the search
 * @return {float} prepared product line refinements
 */
function getMinPriceOnProductSearch(queryString) {
    let minPrice = 0;
    const queryStringProcessed = queryString;

    if (queryStringProcessed.pmin) {
        delete queryStringProcessed.pmin;
    }

    const apiProductSearch = new ProductSearchModel();
    const priceLowToHighSR = CatalogMgr.getSortingRule('price-low-to-high');
    apiProductSearch.setSortingRule(priceLowToHighSR);

    setupSearch(apiProductSearch, queryStringProcessed);
    apiProductSearch.search();
    let expensiveProductOnSearch = apiProductSearch.productSearchHits.next();
    if (expensiveProductOnSearch && expensiveProductOnSearch.minPrice) {
        minPrice = expensiveProductOnSearch.minPrice.value;
    }
    return minPrice;
}

/**
 * Renders the brands category
 * @param {Request} req The request object
 * @param {Response} res The response object
 * @param {Object} next The next object
 * @return {Object} The render result
 */
function renderBrandsCategory(req, res, next) {
    var URLRedirectMgr = require('dw/web/URLRedirectMgr');
    var URLRULES = require('*/cartridge/config/urlRules.json');
    var ProductSearchUtils = require('../scripts/product/productSearchUtils');
    var stringUtil = require('../scripts/util/stringUtil');
    var currentLocale = Locale.getLocale(req.locale.id);
    var language = currentLocale.language;
    var brandsCategory = CatalogMgr.getCategory(CATEGORIES.brands);
    var rootCategory = CatalogMgr.getSiteCatalog().getRoot();
    var allBrands = brandsCategory.subCategories;
    var grouppedBrands = {};
    var sortedBrandLabels = [];
    var qs = req.querystring;
    var currentCategoryId = qs.cgid;
    var filterBrandsByCategoryID = qs.filterBrandsByCategoryID || false;
    var breadcrumbs;
    var sidebarMainCategories = [];
    var categoryRefinementIDs = getCategoryRefinementIDs(brandsCategory);

    /**
     * Extract the url slug from current path.
     * Example: tennisbekleidung = /marken/tennisbekleidung
     */
    var urlRuleMap = URLRULES.categories[language];
    var urlSlug = URLRedirectMgr.redirectOrigin.split('/').pop();
    if (urlRuleMap && urlSlug in urlRuleMap) {
        currentCategoryId = urlRuleMap[urlSlug];
    }

    // Get available brands by category id
    var brandRefinementValues = [];
    if (filterBrandsByCategoryID) {
        var productSearchUtils = new ProductSearchUtils({});
        var brandRefinements = productSearchUtils.getRefinementsByCategory(
            CatalogMgr.getCategory(filterBrandsByCategoryID),
            ['brand']
        );
        if (!empty(brandRefinements.brand)) {
            brandRefinements.brand.values.forEach(function (value) {
                brandRefinementValues.push(value.displayValue);
            });
        }
    }

    for (var index = 0; index < allBrands.length; index++) {
        var catg = allBrands[index];
        var name = catg.displayName;
        var label = name.charAt(0).toUpperCase();

        if (brandRefinementValues.length > 0 && brandRefinementValues.indexOf(name) < 0) {
            continue; // eslint-disable-line
        }

        if (!catg.hasOnlineProducts() || !catg.online || categoryRefinementIDs[catg.ID] !== true) {
            continue;  // eslint-disable-line
        }

        if (sortedBrandLabels.indexOf(label) < 0) {
            sortedBrandLabels.push(label);
        }
        if (!grouppedBrands[label]) {
            grouppedBrands[label] = [];
        }
        grouppedBrands[label].push({
            id: catg.ID,
            name: name,
            image: catg.thumbnail ? catg.thumbnail.url : '',
            imageKey: stringUtil.slugifyString(name, '-'),
            url: !filterBrandsByCategoryID ?
                URLUtils.url('Search-Show', 'cgid', catg.ID) :
                URLUtils.url('Search-Show', 'cgid', filterBrandsByCategoryID, 'prefn1', 'brand', 'prefv1', name)
        });
    }
    sortedBrandLabels.sort();
    Object.keys(grouppedBrands).forEach(function (key) {
        var ctgArray = grouppedBrands[key];
        grouppedBrands[key] = ctgArray.sort(function (obj1, obj2) {
            if (obj1.name.toLowerCase() === obj2.name.toLowerCase()) {
                return 0;
            }
            return obj1.name.toLowerCase() < obj2.name.toLowerCase() ? -1 : 1;
        });
    });

    // Generate maincategories object for sidebar
    var mainCategories = rootCategory.subCategories;
    var mainCategoryRefinementIDs = getCategoryRefinementIDs(rootCategory);
    for (var i = 0; i < mainCategories.length; i++) {
        if ([CATEGORIES.brands, CATEGORIES.profis, CATEGORIES.aktion, CATEGORIES.tennisreisen].indexOf(mainCategories[i].ID) === -1
            && mainCategories[i].online
            && mainCategories[i].custom && mainCategories[i].custom.showInMenu
            && categoryHelper.showInMenuForSite(mainCategories[i])
            && mainCategoryRefinementIDs[mainCategories[i].ID] === true
        ) {
            sidebarMainCategories.push(mainCategories[i]);
        }
    }

    // Generate breadcrumb
    if (filterBrandsByCategoryID) {
        var displayName;
        for (var j = 0; j < sidebarMainCategories.length; j++) {
            if (sidebarMainCategories[j].ID === filterBrandsByCategoryID) {
                displayName = sidebarMainCategories[j].displayName;
            }
        }
        breadcrumbs = [
            {
                htmlValue: Resource.msg('global.home', 'common', null),
                url: URLUtils.home().toString()
            }, {
                htmlValue: Resource.msg('navigation.refinement.brand', 'navigation', null),
                url: URLUtils.url('Search-Show', 'cgid', CATEGORIES.brands)
            }, {
                htmlValue: Resource.msg(displayName, 'navigation', null)
            }
        ];
    } else {
        breadcrumbs = [
            {
                htmlValue: Resource.msg('global.home', 'common', null),
                url: URLUtils.home().toString()
            }, {
                htmlValue: Resource.msg('navigation.refinement.brand', 'navigation', null)
            }
        ];
    }


    res.render('search/brands/brands', {
        breadcrumbs: breadcrumbs,
        CurrentPageMetaData: {
            title: seoFactory.create('META_TITLE', { category: brandsCategory }, req, res),
            pageDescription: seoFactory.create('META_DESCRIPTION', { category: brandsCategory }, req, res),
            pageKeywords: seoFactory.create('META_KEYWORDS', { category: brandsCategory }, req, res)
        },
        brands: grouppedBrands,
        brandLabels: sortedBrandLabels,
        rootCategory: rootCategory,
        CATEGORIES: CATEGORIES,
        currentCategoryId: currentCategoryId,
        sidebarMainCategories: sidebarMainCategories,
        filterBrandsByCategoryID: filterBrandsByCategoryID,
        resolveBrandUrl: URLUtils.https('Search-Show', 'cgid', currentCategoryId)
    });
    return next();
}


/**
 * Renders the profis category
 * @param {ProductSearch} apiProductSearch The request object
 * @param {Request} req The request object
 * @param {Response} res The response object
 * @param {Object} next The next object
 * @return {Object} The render result
 */
function renderProfisCategory(apiProductSearch, req, res, next) {
    res.cachePeriod = 24; // eslint-disable-line no-param-reassign
    res.cachePeriodUnit = 'hours'; // eslint-disable-line no-param-reassign

    var ProfiSearch = require('*/cartridge/models/search/profiSearch');
    var category = apiProductSearch.category;
    var subCategories = category.subCategories;
    var profiSearch = new ProfiSearch(subCategories);

    // sort profis via values from site preference for category
    var sortedProfisList = (category.custom.sortProfis && category.custom.sortProfis !== 'false') ? JSON.parse(category.custom.sortProfis) : false;
    if (sortedProfisList) {
        profiSearch.profis = categoryHelper.mapOrder(profiSearch.profis, sortedProfisList, 'id');
    }

    var profiCategory = CatalogMgr.getCategory(CATEGORIES.profis);

    /**
     * Build breadcrumbs
     */
    var breadcrumbs = [];
    breadcrumbs.push({
        htmlValue: Resource.msg('global.home', 'common', null),
        url: URLUtils.home().toString()
    });

    breadcrumbs.push({
        htmlValue: Resource.msg('navigation.refinement.profis', 'navigation', null)
    });

    res.render('search/profis/profis', {
        breadcrumbs: breadcrumbs,
        CurrentPageMetaData: {
            title: seoFactory.create('META_TITLE', { category: profiCategory }, req, res),
            pageDescription: seoFactory.create('META_DESCRIPTION', { category: profiCategory }, req, res),
            pageKeywords: seoFactory.create('META_KEYWORDS', { category: profiCategory }, req, res)
        },
        profiSearch: profiSearch,
        category: category,
        hasDefaultTournamentRefinement: Site.current.getCustomPreferenceValue('activeDefaultTournamentRefinement')
    });

    return next();
}

/**
 * Renders the profis category
 * @param {ProductSearch} apiProductSearch The request object
 * @param {Request} req The request object
 * @param {Response} res The response object
 * @param {Object} next The next object
 * @return {Object} The render result
 */
function renderTournamentBallActionCategory(apiProductSearch, req, res, next) {
    res.cachePeriod = 0; // eslint-disable-line no-param-reassign
    res.cachePeriodUnit = 'hours'; // eslint-disable-line no-param-reassign

    var ContentMgr = require('dw/content/ContentMgr');
    var TournamentActionSearch = require('*/cartridge/models/search/tournamentActionSearch');
    var tournamentActionHelper = require('app_storefront_common/cartridge/scripts/helpers/tournamentActionHelper.js');
    var category = apiProductSearch.category;
    var tournamentActionSearch = new TournamentActionSearch(category);
    var contentFragments = [];

    contentFragments.push(ContentMgr.getContent(tournamentActionHelper.BONUS_TABLE_CONTENT));
    contentFragments.push(ContentMgr.getContent(tournamentActionHelper.BONUS_DESCRIPTION));
    contentFragments.push(ContentMgr.getContent(tournamentActionHelper.BONUS_SUPPORT));
    contentFragments.push(ContentMgr.getContent(tournamentActionHelper.BONUS_HEADLINE));

    /**
     * Build breadcrumbs
     */
    var breadcrumbs = [];
    breadcrumbs.push({
        htmlValue: Resource.msg('global.home', 'common', null),
        url: URLUtils.home().toString()
    });

    breadcrumbs.push({
        htmlValue: Resource.msg('navigation.refinement.tournament', 'navigation', null)
    });

    res.render('search/action/tournament', {
        breadcrumbs: breadcrumbs,
        CurrentPageMetaData: {
            title: seoFactory.create('META_TITLE', { category: category }, req, res),
            pageDescription: seoFactory.create('META_DESCRIPTION', { category: category }, req, res),
            pageKeywords: seoFactory.create('META_KEYWORDS', { category: category }, req, res)
        },
        products: tournamentActionSearch,
        contentFragments: contentFragments,
        bonusPriceTable: tournamentActionHelper.getBonusPriceTable(),
        categoryID: category.ID,
        currencyCode: req.locale.currency.currencyCode,
        locale: req.locale.id
    });

    return next();
}

/**
 * Renders the teamwear category
 * @param {ProductSearch} apiProductSearch The request object
 * @param {Request} req The request object
 * @param {Response} res The response object
 * @param {Object} next The next object
 * @return {Object} The render result
 */
function renderTeamwearCategory(apiProductSearch, req, res, next) {
    var MinimalProductSearch = require('*/cartridge/models/search/minimalProductSearch');
    var ProductFactory = require('*/cartridge/scripts/factories/product');

    var productSearch = new MinimalProductSearch(apiProductSearch, req.querystring, 'teamwear');
    var category = apiProductSearch.category;
    var contentFragments = [];

    var ContentMgr = require('dw/content/ContentMgr');
    contentFragments.push(ContentMgr.getContent('teamwear-header-' + category.ID));
    contentFragments.push(ContentMgr.getContent('teamwear-info-' + category.ID));
    contentFragments.push(ContentMgr.getContent('teamwear-sponsoring-info-' + category.ID));
    contentFragments.push(ContentMgr.getContent('teamwear-pagesize-info-' + category.ID));
    contentFragments.push(ContentMgr.getContent('teamwear-outfit-title'));
    contentFragments.push(ContentMgr.getContent('teamwear-outfit-discount'));

    /**
     * Build breadcrumbs
     */
    var breadcrumbs = [];
    breadcrumbs.push({
        htmlValue: Resource.msg('global.home', 'common', null),
        url: URLUtils.home().toString()
    });

    breadcrumbs.push({
        htmlValue: Resource.msg('teamwear.breadcrumbs.title', 'teamwear', null)
    });

    /**
     * Sponsored product
     */
    var sponsoredProduct = ProductFactory.get({
        pview: 'teamwear',
        pid: Site.getCurrent().getCustomPreferenceValue('sponsoredProductID')
    });

    // security grab
    if (!sponsoredProduct) {
        res.redirect(URLUtils.home());
        return next();
    }

    /**
     * Print product
     */
    var printProduct = ProductFactory.get({
        pview: 'teamwear',
        pid: Site.getCurrent().getCustomPreferenceValue('printProductID')
    });

    // security grab
    if (!printProduct) {
        res.redirect(URLUtils.home());
        return next();
    }

    /**
     * Stock Message
     */
    var minStockNumber = Site.current.getCustomPreferenceValue('minStockNumber');
    var maxStockNumber = Site.current.getCustomPreferenceValue('maxStockNumber');

    /**
     * Category config data
     */
    var hasBrandFilter = (category.custom && 'teamwearShowBrandFilter' in category.custom) ? category.custom.teamwearShowBrandFilter : false;

    //
    // remove refinement URLs from productSearch data.
    //
    // There are two motivations for doing so:
    //   (1) These URLs are enbedded as static JS data structure into the HTML page and hence crawled by Google Search Bot. This MUST be avoided.
    //   (2) These URLs are not used by the teamwear application at all.
    productSearch.refinements.map(function (refinement) {
        refinement.values = refinement.values.map(function (value) { // eslint-disable-line no-param-reassign
            if (value.url) {
                delete value.url; // eslint-disable-line no-param-reassign
            }
            if (value.subCategories) {
                value.subCategories = value.subCategories.map(function (subCategory) { // eslint-disable-line no-param-reassign
                    if (subCategory.url) {
                        delete subCategory.url; // eslint-disable-line no-param-reassign
                    }
                    if (subCategory.subCategories) {
                        subCategory.subCategories = subCategory.subCategories.map(function (subSubCategory) { // eslint-disable-line no-param-reassign
                            if (subSubCategory.url) {
                                delete subSubCategory.url; // eslint-disable-line no-param-reassign
                            }
                            return subSubCategory;
                        });
                    }
                    return subCategory;
                });
            }
            return value;
        });
        return refinement;
    });

    res.render('search/action/teamwear', {
        breadcrumbs: breadcrumbs,
        CurrentPageMetaData: {
            title: seoFactory.create('META_TITLE', { category: category }, req, res),
            pageDescription: seoFactory.create('META_DESCRIPTION', { category: category }, req, res),
            pageKeywords: seoFactory.create('META_KEYWORDS', { category: category }, req, res)
        },
        productSearch: productSearch,
        sponsoredProduct: sponsoredProduct,
        printProduct: printProduct,
        category: category,
        currencyCode: req.locale.currency.currencyCode,
        locale: req.locale.id,
        minStockNumber: minStockNumber,
        maxStockNumber: maxStockNumber,
        contentFragments: contentFragments,
        categoryID: category.ID,
        hasBrandFilter: hasBrandFilter
    });

    return next();
}

/**
 * Get the seo asset for the current top level category (Tennisschuhe) or the default fallback.
 * @param {string} categoryId - the category id
 * @returns {string} the rendered content asset or null
 */
function getCategoriesSeoContent(categoryId) {
    if (!categoryId) {
        return null;
    }

    var category = CatalogMgr.getCategory(categoryId);
    var contentAssetHelper = require('*/cartridge/scripts/helpers/contentAssetHelper');
    var categoryPath = NavigationHelper.getMainCategoriePath(category);
    var topCategoryAsset = contentAssetHelper.getContentAsset('categories-seo-' + categoryPath[0].ID);
    if (topCategoryAsset) {
        return topCategoryAsset;
    }
    var rootCategoryAsset = contentAssetHelper.getContentAsset('categories-seo-root');
    if (rootCategoryAsset) {
        return rootCategoryAsset;
    }
    return null;
}

server.get('CategoriesSeoContent', server.middleware.include, cache.applyDefaultCache, function (req, res, next) {
    var categoriesSeoContent = getCategoriesSeoContent(req.querystring.cgid);
    res.render('/search/components/categoriesSeoContent', { categoriesSeoContent: categoriesSeoContent });
    next();
});

server.append('UpdateGrid', function (req, res, next) {
    var viewData = res.getViewData();

    // set product-tile type (large vs. small)
    if (viewData.productSearch.isCategorySearch) {
        var category = CatalogMgr.getCategory(viewData.productSearch.category.id);
        var productCompare = ('productCompare' in category.custom && category.custom.productCompare) || false;
        res.setViewData({
            productCompare: productCompare,
            largeProductTile: ('largeProductTiles' in category.custom && category.custom.largeProductTiles) || false
        });
    }
    if (empty(viewData.productCompare)) {
        viewData.productCompare = false;
    }
    next();
});

server.get('UpdateTeamWearGrid', function (req, res, next) {
    var apiProductSearch = new ProductSearchModel();
    var qs = req.querystring;
    setupSearch(apiProductSearch, qs);
    apiProductSearch.search();

    var MinimalProductSearch = require('*/cartridge/models/search/minimalProductSearch');
    var productSearch = new MinimalProductSearch(apiProductSearch, qs, 'teamwear');
    var products = [];

    Object.keys(productSearch.products).forEach(function (key) {
        products.push(productSearch.products[key]);
    });

    res.json({
        products: JSON.stringify(products),
        showMoreAction: productSearch.showMoreUrl.toString(),
        showLoadMoreButton: productSearch.showLoadMoreButton
    });

    next();
}, cache.applyVeryShortPromotionPersonalizedSensitiveCache);

server.append('Refinebar', function (req, res, next) {
    res.setViewData({
        encodeBase64: StringUtils.encodeBase64
    });
    const qs = req.querystring;
    if (qs.redesign === 'true' && ((Redesigns.isABTestEnabled(res) && Site.getCurrent().getCustomPreferenceValue('enableFiltersOnABTest')) || Redesigns.isABTestFeatureEnabled('filters', res))) {
        var viewData = res.getViewData();
        let closedRefIds = JSON.parse(Site.getCurrent().getCustomPreferenceValue('closedRefinements'));
        if (res.viewData.productSearch.isCategorySearch && res.viewData.productSearch.productSearch.category.custom.closedRefinements) {
            closedRefIds = JSON.parse(res.viewData.productSearch.productSearch.category.custom.closedRefinements);
        }
        viewData.priceRefURL = res.viewData.productSearch.productSearch.urlRefinePrice('Search-Show', 0, 0).relative().toString();
        viewData.closedRefIds = closedRefIds;
        viewData.maxPrice = getMaxPriceOnProductSearch(qs);
        viewData.minPrice = getMinPriceOnProductSearch(qs);
        viewData.sortedRefinments = orderRefinementValues(viewData.productSearch.refinements);
        viewData.productLineRefinement = prepareProductLineRefinement(viewData.productSearch, qs);
        res.render('search/searchRefineBarRedesign');
    }
    next();
});

/**
 * Get the suggested phrases as objects with the term und url.
 * @param {dw.catalog.ProductSearchModel} apiProductSearch - the category id
 * @returns {Object} array of suggestions
 */
function getSuggestedPhrases(apiProductSearch) {
    if (empty(apiProductSearch.searchPhrase) || empty(apiProductSearch.searchPhraseSuggestions)) {
        return null;
    }

    var url = apiProductSearch.url('Search-Show');
    var suggestedPhrases = collections.map(apiProductSearch.searchPhraseSuggestions.suggestedPhrases, function (item) {
        return {
            term: item.phrase,
            url: url.remove('q').append('q', item.phrase).toString()
        };
    });

    return suggestedPhrases;
}

server.replace('Show', function (req, res, next) {
    var ProductSearch = require('*/cartridge/models/search/productSearch');
    var reportingUrlsHelper = require('*/cartridge/scripts/reportingUrls');
    var qs = req.querystring;
    var queywords = qs.q ? qs.q : null;
    var hiddenPriceRefinement = false;

    var categoryTemplate = '';
    var productSearch;
    var isStaticLandingPage;
    var isAjax = Object.hasOwnProperty.call(req.httpHeaders, 'x-requested-with')
        && req.httpHeaders['x-requested-with'] === 'XMLHttpRequest';
    var resultsTemplate = isAjax ? 'search/searchResultsNoDecorator' : 'search/searchResults';
    var apiProductSearch = new ProductSearchModel();
    var maxSlots = 4;
    var reportingURLs;
    var searchRedirect = qs.q
        ? apiProductSearch.getSearchRedirect(qs.q)
        : null;
    let isStringingSearch = false;

    // Set applicable Pricebooks
    priceHelper.setApplicablePricebooks();

    // Render brands page
    if (qs.cgid === CATEGORIES.brands) {
        return renderBrandsCategory(req, res, next);
    }

    if (searchRedirect) {
        res.redirect(searchRedirect.getLocation());
        return next();
    }

    setupSearch(apiProductSearch, qs);
    // add stringing sorting rule
    if (apiProductSearch.isCategorySearch && req.querystring.stringingsearch === 'true') {
        let sortingRuleStringing = CatalogMgr.getSortingRule('stinging-service');
        isStringingSearch = true;
        if (!empty(sortingRuleStringing)) {
            apiProductSearch.setSortingRule(sortingRuleStringing);
        }
        apiProductSearch.setOrderableProductsOnly(true);
    }

    if (qs.cgid === 'root') {
        if (!request.httpParameterMap || !request.httpParameterMap.pmin.submitted) {
            apiProductSearch.setPriceMin(0.01);
            hiddenPriceRefinement = true;
        }
    }
    apiProductSearch.search();

    if (hiddenPriceRefinement) {
        apiProductSearch.removeRefinementValues('pmin', 0.01);
    }

    if (apiProductSearch.category) {
        isStaticLandingPage = 'isStaticLandingPage' in apiProductSearch.category.custom && apiProductSearch.category.custom.isStaticLandingPage;
    }

    categoryTemplate = getCategoryTemplate(apiProductSearch);

    if (categoryTemplate) {
        hasCustomRenderingTemplate = true;
    }

    // Custom rendering search pages
    // TODO: use custom rendering template like code above.
    if (!empty(qs.cgid) && (qs.cgid === CATEGORIES.profis)) {
        return renderProfisCategory(apiProductSearch, req, res, next);
    }

    // TODO: use custom rendering template like code above.
    if (categoryTemplate === 'search/action/tournament.isml') {
        return renderTournamentBallActionCategory(apiProductSearch, req, res, next);
    }

    if (categoryTemplate === 'search/action/teamwear.isml') {
        return renderTeamwearCategory(apiProductSearch, req, res, next);
    }

    productSearch = new ProductSearch(
        apiProductSearch,
        qs,
        qs.srule,
        CatalogMgr.getSortingOptions(),
        CatalogMgr.getSiteCatalog().getRoot()
    );

    if (productSearch.count === 0 && !isStaticLandingPage) {
        reportingURLs = reportingUrlsHelper.getProductSearchReportingURLs(productSearch);
        var seoConst = require('../scripts/seo/constants');
        req.pageMetaData.setTitle(Resource.msg('message.page.not.found', 'error', null));
        var backgroundImage = Site.getCurrent().getCustomPreferenceValue('nohitsimage');
        if (empty(backgroundImage)) {
            backgroundImage = URLUtils.staticURL('/images/error/err404.jpg');
        } else {
            backgroundImage = backgroundImage.url;
        }

        let isProductTileRedesign = false;
        if (Redesigns.isABTestEnabled(res) || Redesigns.isABTestFeatureEnabled('productTiles', res)) {
            isProductTileRedesign = true;
        }

        res.render('search/searchNoHits', {
            isProductTileRedesign: isProductTileRedesign,
            robots: seoConst.META_ROBOTS_NOINDEX_FOLLOW,
            reportingURLs: reportingURLs,
            bgImage: backgroundImage,
            searchTerm: qs.q || '',
            suggestedPhrases: getSuggestedPhrases(apiProductSearch)
        });
        return next();
    }

    var refineurl = URLUtils.url('Search-Refinebar');
    appendSearchParams(refineurl, qs);

    if (productSearch.searchKeywords !== null && !productSearch.selectedFilters.length) {
        reportingURLs = reportingUrlsHelper.getProductSearchReportingURLs(productSearch);
    }

    if (
        productSearch.isCategorySearch
        && categoryTemplate
    ) {
        res.render(categoryTemplate, {
            productSearch: productSearch,
            isStaticLandingPage: isStaticLandingPage,
            maxSlots: maxSlots,
            queywords: queywords,
            category: apiProductSearch.category,
            reportingURLs: reportingURLs,
            searchModel: apiProductSearch,
            refineurl: refineurl,
            encodeBase64: StringUtils.encodeBase64
        });
    } else {
        res.render(resultsTemplate, {
            productSearch: productSearch,
            isStaticLandingPage: isStaticLandingPage,
            maxSlots: maxSlots,
            queywords: queywords,
            reportingURLs: reportingURLs,
            searchModel: apiProductSearch,
            refineurl: refineurl,
            encodeBase64: StringUtils.encodeBase64,
            isStringingSearch: isStringingSearch
        });
    }


    let isABTestEnabled = Redesigns.isABTestEnabled(res);
    if (isABTestEnabled || Redesigns.isABTestFeatureEnabled('filters', res) || Redesigns.isABTestFeatureEnabled('productTiles', res)) {
        let refineurlRefs = URLUtils.url('Search-Refinebar', 'redesign', true);
        appendSearchParams(refineurlRefs, qs);
        let viewData = res.getViewData();
        viewData.isFilterRedesignEnabled = !isStringingSearch && ((isABTestEnabled && Site.getCurrent().getCustomPreferenceValue('enableFiltersOnABTest')) || Redesigns.isABTestFeatureEnabled('filters', res));
        if (viewData.isFilterRedesignEnabled) {
            viewData.refineurl = refineurlRefs;
            viewData.sortedRefinments = orderRefinementValues(viewData.productSearch.refinements);
        }
        resultsTemplate = isAjax ? 'search/searchResultsNoDecoratorRedesign' : 'search/searchResultsRedesign';
        res.render(resultsTemplate);
    }

    return next();
}, cache.applyShortPromotionSensitiveCache);

server.get('LoadStatisticsInfo', server.middleware.include, function (req, res, next) {
    res.render('product/components/statistics', {
        isInTennisPointEmployeeGroup: customer.isMemberOfCustomerGroup('TennisPointEmployee')
    });
    return next();
});


server.append('Show', googleTagManager.createDataLayer, function (req, res, next) {
    var bazaarvoiceActivation = Site.current.getCustomPreferenceValue('TP_Bazaarvoice_Activation');
    var currentLocale = Locale.getLocale(req.locale.id);
    var viewData = res.getViewData();
    var productSearch = viewData.productSearch;
    var apiProductSearch = viewData.searchModel;
    var largeProductTile;
    var showFromPrices;
    var productCompare = false;
    var displayCollectionName;
    var displayProductType;
    var httpParams = req.querystring;

    var genderConstant = (httpParams.preferences && httpParams.preferences.genderConstant) ? httpParams.preferences.genderConstant : null;
    var productType = (httpParams.preferences && httpParams.preferences.productType) ? httpParams.preferences.productType : null;

    var productLineRefinement;
    var isCategoryOfBrands = false;
    var isCategoryOfProfis = false;
    var withNavigationTree = false;
    var navigationTreeIncludeUrl = null;
    var currentRootCategoryId = null;
    var parentCategory;
    var category;
    var grouppedTournaments = null;
    var selectedTournamentYears = null;

    if (
        ((!empty(httpParams.cgid) && httpParams.cgid === CATEGORIES.brands) ||
            (!empty(httpParams.cgid) && httpParams.cgid === CATEGORIES.profis) ||
            hasCustomRenderingTemplate) &&
        !viewData.isStaticLandingPage
    ) {
        // provide cgrootid parameter for Page-IncludeHeaderMenu
        viewData.currentRootCategoryId = httpParams.cgid;
        req.pageMetaData.setTitle(viewData.CurrentPageMetaData.title);
        req.pageMetaData.setDescription(viewData.CurrentPageMetaData.pageDescription);
        req.pageMetaData.setKeywords(viewData.CurrentPageMetaData.pageKeywords);
        return next();
    }

    if ((productSearch === undefined || productSearch.count === 0) && !viewData.isStaticLandingPage) {
        return next();
    }

    if (productSearch.isCategorySearch) {
        var selectedRefinements = httpParams.preferences || {};
        category = apiProductSearch.category;
        parentCategory = category.parent;
        if (parentCategory) {
            isCategoryOfBrands = CATEGORIES.brands === parentCategory.ID || CATEGORIES.brands === category.ID;
            isCategoryOfProfis = CATEGORIES.profis === parentCategory.ID;
        }

        /**
         * Initiate the category navigation tree
         */
        if (category.ID === 'root' || (parentCategory && [category.ID, parentCategory.ID].indexOf(CATEGORIES.aktion) < 0)) {
            withNavigationTree = true;
            let isABTestEnabled = Redesigns.isABTestEnabled(res);
            if (isABTestEnabled || (Redesigns.isABTestFeatureEnabled('filters', res) || Site.getCurrent().getCustomPreferenceValue('enableFiltersOnABTest'))) {
                navigationTreeIncludeUrl = URLUtils.url('Search-IncludeNavigationTree', 'redesign', true);
            } else {
                navigationTreeIncludeUrl = URLUtils.url('Search-IncludeNavigationTree');
            }
            appendSearchParams(navigationTreeIncludeUrl, httpParams);
            currentRootCategoryId = NavigationHelper.getMainCategoriePath(category)[0].ID;
        }

        /**
         * If user select a brand refinement, we display a special refinement
         * filter in the left navigation.
         */
        if ('brand' in selectedRefinements && selectedRefinements.brand.indexOf('|') === -1) {
            productLineRefinement = prepareProductLineRefinement(productSearch, httpParams);
        }

        /**
         * set category view characteristics
         */
        largeProductTile = ('largeProductTiles' in category.custom && category.custom.largeProductTiles) || false;
        productCompare = ('productCompare' in category.custom && category.custom.productCompare) || false;
        displayCollectionName = shouldDisplayCollectionName(category, selectedRefinements);
        displayProductType = shoulddisplayProductType(category);
        showFromPrices = 'showFromPrices' in category.custom ? category.custom.showFromPrices : false;
    }

    /**
     * Initiate category breadcrumbs
     */
    var breadcrumbs = generateBreadcrumbs(
        productSearch,
        category
    );

    /**
     * Initiate SEO optimzed page meta data
     */
    var metaRobots = seoFactory.create('META_ROBOTS', {
        productSearch: productSearch,
        currentLocale: currentLocale,
        category: category
    }, req, res);

    var canonicalUrl = seoFactory.create('CANONICAL_URL', {
        productSearch: productSearch,
        currentLocale: currentLocale,
        category: category
    }, req, res);

    var pageTitle = seoFactory.create('META_TITLE', {
        productSearch: productSearch,
        currentLocale: currentLocale,
        category: category
    }, req, res);

    var pageDescription = seoFactory.create('META_DESCRIPTION', {
        productSearch: productSearch,
        currentLocale: currentLocale,
        category: category
    }, req, res);

    var pageKeywords = seoFactory.create('META_KEYWORDS', {
        productSearch: productSearch,
        currentLocale: currentLocale,
        category: category
    }, req, res);

    var headline = seoFactory.create('CATEGORY_HEADLINE', {
        productSearch: productSearch,
        currentLocale: currentLocale,
        category: category
    }, req, res);

    var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
    pageMetaHelper.setPageMetaTags(req.pageMetaData, productSearch);
    req.pageMetaData.setTitle(pageTitle);
    req.pageMetaData.setDescription(pageDescription);
    req.pageMetaData.setKeywords(pageKeywords);

    /**
     * Content manager can configure super banner per category and filters
     */
    var categorySuperBannerContent = categoryBanner.createBanner(productSearch, 'category-super-banner-');

    /**
     * Content manager can configure special banner images per category and filters
     */
    var categoryBannerContent = categoryBanner.createBanner(productSearch, 'category-banner-');

    /**
     * Category grid teaser, which will be shown between the single product tiles.
     */
    var categoryTeaser = categoryBanner.createTeaser(productSearch);

    /**
     * Content manager can configure content for SEO per category and filters
     */
    var categorySeoContent = categoryBanner.createSeoContent('footer', productSearch);

    var categorySidebarSeoContent = categoryBanner.createSeoContent('sidebar', productSearch);

    /**
     * Content manager can configure content for skyscraper per category
     */
    var categorySykscraperContent = categoryBanner.createSkyscraper(currentRootCategoryId);

    /**
     * For profi category, tennis rackets are always placed first.
     */
    var specialSortedProductIds = [];
    var getTradeGroupCount = null;

    if (isCategoryOfProfis) {
        for (var i = 0; i < productSearch.productIds.length; i++) {
            var product = productSearch.productIds[i];
            if (product.productSearchHit.product.custom.tradeGroup === 'apparel') {
                specialSortedProductIds.unshift(product);
            } else {
                specialSortedProductIds.push(product);
            }
        }

        var tradeGroupRefinement = arrayUtil.find(productSearch.refinements, function (refinement) {
            return refinement.attributeId === 'tradeGroup';
        });
        var tradeGroupCounts = {};
        if (tradeGroupRefinement && tradeGroupRefinement.values) {
            tradeGroupRefinement.values.forEach(function (refinementItem) {
                tradeGroupCounts[refinementItem.displayValue] = refinementItem.hitCount;
            });
        }
        getTradeGroupCount = function (refinementValue) {
            return tradeGroupCounts[refinementValue] || 0;
        };

        grouppedTournaments = groupTournaments(productSearch.refinements);
        selectedTournamentYears = getSelectedTournamentYears(grouppedTournaments);
    }

    const rawCurrentCustomer = req.currentCustomer.raw;

    const shoeSizeMePlpObj = require('*/cartridge/scripts/helpers/shoeSizeMeHelper.js').getShoeSizeMePlpObject(rawCurrentCustomer, currentRootCategoryId);
    const criteoObj = require('*/cartridge/scripts/helpers/criteoHelper.js').getCriteoPlpObject(rawCurrentCustomer, productSearch, breadcrumbs);

    res.setViewData({
        pageType: 'CATEGORY', // TODO: illimiate it, we can use the controller action name.
        robots: metaRobots,
        canonicalUrl: canonicalUrl,
        headline: headline,
        specialSortedProductIds: specialSortedProductIds,
        largeProductTile: largeProductTile,
        showFromPrices: showFromPrices,
        productCompare: productCompare,
        breadcrumbs: breadcrumbs,
        currentRootCategoryId: currentRootCategoryId,
        withNavigationTree: withNavigationTree,
        navigationTreeIncludeUrl: navigationTreeIncludeUrl,
        categoryId: category ? category.ID : null,
        category: category,
        isCategoryOfBrands: isCategoryOfBrands,
        brandCategoryId: CATEGORIES.brands,
        isCategoryOfProfis: isCategoryOfProfis,
        categorySuperBannerContent: categorySuperBannerContent,
        categoryBannerContent: categoryBannerContent,
        categoryTeaserAssetIds: categoryTeaser.assetIds,
        categoryTeaserPositions: categoryTeaser.positions,
        categorySykscraperContent: categorySykscraperContent,
        categorySeoContent: categorySeoContent,
        categorySidebarSeoContent: categorySidebarSeoContent,
        displayCollectionName: displayCollectionName,
        displayProductType: displayProductType,
        displayGroupName: displayCollectionName || displayProductType,
        productLineRefinement: productLineRefinement,
        enableBazaarvoice: bazaarvoiceActivation,
        getTradeGroupCount: getTradeGroupCount,
        showPromoCallout: true,
        genderConstant: genderConstant,
        productType: productType,
        grouppedTournaments: grouppedTournaments,
        selectedTournamentYears: selectedTournamentYears,
        shoeSizeMePlpObj: shoeSizeMePlpObj,
        criteoObj: criteoObj
    });

    // Override the rendering template if it is a stringing search
    if (viewData.productSearch.isCategorySearch && httpParams.stringingsearch === 'true') {
        let productsIDsToInclude = Site.getCurrent().getCustomPreferenceValue('ProductsStringing');
        if (productsIDsToInclude) {
            // Include special sorting products
            viewData.productSearch.productIds = stringingHelpers.getSpecialProduct(productsIDsToInclude, viewData.productSearch.productIds);
        }
        viewData.isStringingService = true;
        res.render('product/stringingracket/listing', res.viewData);
    }

    return next();
}, pageMetaData.computedPageMetaData);

server.get(
    'IncludeNavigationTree',
    cache.applyDefaultCache,
    function (req, res, next) {
        var httpParams = req.querystring;
        var apiProductSearch = new ProductSearchModel();
        setupSearch(apiProductSearch, httpParams);
        apiProductSearch.search();

        var category = apiProductSearch.category;
        var parentCategory = category.parent;
        var isCategoryOfBrands = false;
        var isCategoryOfProfis = false;
        if (parentCategory) {
            isCategoryOfBrands = CATEGORIES.brands === parentCategory.ID || CATEGORIES.brands === category.ID;
            isCategoryOfProfis = CATEGORIES.profis === parentCategory.ID;
        }


        var navigationTree = getNavigationTree(
            isCategoryOfBrands,
            isCategoryOfBrands ? CatalogMgr.getSiteCatalog().getRoot() : category,
            apiProductSearch,
            httpParams,
            category.displayName
        );

        res.render('search/components/categoryBox', {
            isCategoryOfProfis: isCategoryOfProfis,
            navigationTree: navigationTree,
            category: category,
            categoryId: category.ID
        });

        if (Redesigns.isABTestEnabled(res) || Redesigns.isABTestFeatureEnabled('filters', res)) {
            res.render('search/components/categoryBoxRedesign');
        }

        return next();
    }
);

server.get(
    'IncludeNewsletterSidebar',
    server.middleware.include,
    cache.applyDefaultCache,
    function (req, res, next) {
        var sidebarNewsletterEnablements = JSON.parse(Site.getCurrent().getCustomPreferenceValue('isNewsletterEnabled'));
        var sidebarNewsletterEnabled = (sidebarNewsletterEnablements && sidebarNewsletterEnablements[res.viewData.locale]) ? sidebarNewsletterEnablements[res.viewData.locale] : false;

        res.render('search/components/sidebarNewsletter', {
            sidebarNewsletterEnabled: sidebarNewsletterEnabled
        });
        return next();
    }
);

/**
 * Renders a full-featured content folder page.
 *
 * Constructs a page based on the content assets linkes in the folder.
 * If there are no product results found, it redirects to homepage.
 */

server.get(
    'ShowContent',
    cache.applyDefaultCache,
    function (req, res, next) {
        var ContentMgr = require('dw/content/ContentMgr');
        var httpParams = req.querystring;

        var folder = ContentMgr.getFolder(httpParams.fdid);
        var folderContent;
        if (folder && folder.content.length > 0) {
            var currentLibrary = ContentMgr.getSiteLibrary();
            folderContent = ContentMgr.getContent(currentLibrary, folder.content[0].ID);
        }

        if (folderContent.custom.body.markup) {
            res.render('rendering/folder/foldercontent', {
                content: folderContent.custom.body.markup
            });
        } else {
            res.redirect(URLUtils.url('Home-Show'));
        }

        return next();
    }
);

module.exports = server.exports();
