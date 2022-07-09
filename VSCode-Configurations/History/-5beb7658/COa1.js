/* global empty request */
'use strict';

var collections = require('*/cartridge/scripts/util/collections');
var searchRefinementsFactory = require('*/cartridge/scripts/factories/searchRefinements');
var URLUtils = require('dw/web/URLUtils');
var ArrayList = require('dw/util/ArrayList');
var ProductSortOptions = require('*/cartridge/models/search/productSortOptions');
var urlHelper = require('*/cartridge/scripts/helpers/urlHelpers');
var navigationHelper = require('*/cartridge/scripts/helpers/navigationHelper.js');
var Site = require('dw/system/Site');
var CATEGORIES = require('*/cartridge/config/categories.json');

var ACTION_ENDPOINT = 'Search-Show';
var DEFAULT_PAGE_SIZE = Site.current.getCustomPreferenceValue('productSearchPageSize') || 24;

/**
 * Generates URL that removes refinements, essentially resetting search criteria
 *
 * @param {dw.catalog.ProductSearchModel} search - Product search object
 * @param {Object} httpParams - Query params
 * @param {string} [httpParams.q] - Search keywords
 * @param {string} [httpParams.cgid] - Category ID
 * @return {string} - URL to reset query to original search
 */
function getResetLink(search, httpParams) {
    return search.categorySearch
        ? URLUtils.url(ACTION_ENDPOINT, 'cgid', httpParams.cgid)
        : URLUtils.url(ACTION_ENDPOINT, 'q', httpParams.q);
}

/**
 * Get an object with top brands and further brands to show them separately in
 * the brands refinement.
 * @param {dw.catalog.ProductSearchModel} productSearch - Product search object
 * @param {string} attributeId - ID of the current refinement
 * @param {Object[]} values - array of refinement value object
 * @returns {Object} object with topValues and moreValues or null
 */
function getBrandGroups(productSearch, attributeId, values) {
    if (!productSearch.categorySearch || attributeId !== 'brand') {
        return null;
    }
    var categoryPath = navigationHelper.getMainCategoriePath(productSearch.category);
    var topCategory = categoryPath[0];
    var brandsToShowObj = topCategory.custom.brandsToShowInNavi;
    // check if top brands are defined for this category
    if (empty(brandsToShowObj)) {
        return null;
    }
    var brandsToShow = JSON.parse(brandsToShowObj);
    // sort given refinement values into the two groups
    var topValues = [];
    var moreValues = [];
    values.forEach(function (value) {
        if (value.displayValue in brandsToShow && brandsToShow[value.displayValue]) {
            topValues.push(value);
        } else {
            moreValues.push(value);
        }
    });
    // only return groups if there are brands in both groups
    if (empty(topValues) || empty(moreValues)) {
        return null;
    }
    return {
        topValues: topValues,
        moreValues: moreValues,
        allValues: values
    };
}

/**
 * Concatenating refinement values with a comma and return it
 * @param {Object[]} values - array of refinement value object
 * @returns {string} selected values
 */
function getSelectedValues(values) {
    const selectedValuesArr = [];

    values.forEach(function (value) {
        if (value.selected) {
            selectedValuesArr.push(value.displayValue);
        }
    });

    let selectedValues = selectedValuesArr.join(', ');

    if (selectedValues.length > 30) {
        selectedValues = selectedValues.substring(0, 30) + '...';
    }

    return selectedValues;
}

/**
 * Retrieves search refinements
 *
 * @param {dw.catalog.ProductSearchModel} productSearch - Product search object
 * @param {dw.catalog.ProductSearchRefinements} refinements - Search refinements
 * @param {ArrayList.<dw.catalog.ProductSearchRefinementDefinition>} refinementDefinitions - List of
 *     product serach refinement definitions
 * @return {Refinement[]} - List of parsed refinements
 */
function getRefinements(productSearch, refinements, refinementDefinitions) {
    return collections.map(refinementDefinitions, function (definition) {
        var refinementValues = refinements.getAllRefinementValues(definition);
        var values = searchRefinementsFactory.get(productSearch, definition, refinementValues);
        // don't mask the filters brand and gender for category searches without refinements
        var dontEscapeUrl = productSearch.categorySearch && !productSearch.refinedCategorySearch &&
                (definition.attributeID === 'brand' || definition.attributeID === 'gender');
        var brandGroups = getBrandGroups(productSearch, definition.attributeID, values);

        const selectedValues = getSelectedValues(values);

        return {
            attributeId: definition.attributeID,
            displayName: definition.displayName,
            isCategoryRefinement: definition.categoryRefinement,
            isAttributeRefinement: definition.attributeRefinement,
            isPriceRefinement: definition.priceRefinement,
            values: values,
            brandGroups: brandGroups,
            isEscapeUrl: !dontEscapeUrl,
            selectedValues: selectedValues
        };
    });
}

/**
 * Returns the refinement values that have been selected
 *
 * @param {Array.<CategoryRefinementValue|AttributeRefinementValue|PriceRefinementValue>}
 *     refinements - List of all relevant refinements for this search
 * @return {Object[]} - List of selected filters
 */
function getSelectedFilters(refinements) {
    var selectedFilters = [];
    var selectedValues;

    refinements.forEach(function (refinement) {
        if (!refinement.isCategoryRefinement) {
            selectedValues = refinement.values.filter(function (value) { return value.selected; });
            if (selectedValues.length) {
                selectedFilters.push.apply(selectedFilters, selectedValues);
            }
        }
    });

    return selectedFilters;
}

/**
 * Retrieves banner image URL
 *
 * @param {dw.catalog.Category} category - Subject category
 * @return {string} - Banner's image URL
 */
function getBannerImageUrl(category) {
    var url = null;

    if (category.custom && 'slotBannerImage' in category.custom &&
        category.custom.slotBannerImage) {
        url = category.custom.slotBannerImage.getImageURL({ format: 'jpg', quality: 80 });
    } else if (category.image) {
        url = category.image.getURL();
    }

    return url;
}

/**
 * Configures and returns a PagingModel instance
 *
 * @param {dw.util.Iterator} productHits - Iterator for product search results
 * @param {number} count - Number of products in search results
 * @param {number} pageSize - Number of products to display
 * @param {number} startIndex - Beginning index value
 * @return {dw.web.PagingModel} - PagingModel instance
 */
function getPagingModel(productHits, count, pageSize, startIndex) {
    var PagingModel = require('dw/web/PagingModel');
    var paging = new PagingModel(productHits, count);

    paging.setStart(startIndex || 0);
    paging.setPageSize(pageSize || DEFAULT_PAGE_SIZE);

    return paging;
}

/**
 * Generate URLs for paging buttons
 *
 * @param {dw.web.PagingModel} paging - Paging Model
 * @param {dw.web.URL} pageUrl - PLP page url
 * @param {number} startIdx - start index of current page
 * @param {number} pageSize - number of product-tiles per page
 * @return {Array} - Array of paging Names and URLs
 */
function getPagingUrls(paging, pageUrl, startIdx, pageSize) {
    // the total page count
    var pageCount = paging.pageCount;
    // the maximum possible page number
    var maxPage = paging.maxPage;
    // current page index
    var pageNumber = paging.currentPage;
    // number of page links to the left and to the right
    var lr = 2;

    // create paging urls
    var pagingUrls = [];

    if (pageCount > 1) {
        // "prev" button
        if (pageNumber > 0) {
            pagingUrls.push({
                page: '<',
                url: paging.appendPaging(pageUrl, startIdx - pageSize),
                class: 'icon prev'
            });
        }

        // pages buttons
        for (var n = 0; n <= maxPage; n++) {
            // paging pattern 'without dots'
            if (maxPage <= ((2 * lr) + 1)) {
                pagingUrls.push({
                    page: (n + 1).toString(),
                    class: n === pageNumber ? 'current' : '',
                    url: paging.appendPaging(pageUrl, startIdx + ((n - pageNumber) * pageSize))
                });
            }

            // paging pattern 'with dots'
            if (maxPage > ((2 * lr) + 1)) {
                // right-side elipsis "< 1 2 3 ... N >"
                if (pageNumber < lr) {
                    if (n < (lr + 1) || n === maxPage) {
                        pagingUrls.push({
                            page: (n + 1).toString(),
                            class: n === pageNumber ? 'current' : '',
                            url: paging.appendPaging(pageUrl, startIdx + ((n - pageNumber) * pageSize))
                        });
                    } else {
                        pagingUrls.push({
                            page: '...',
                            class: 'elipsis'
                        });
                    }
                }

                // left- and right-side elipsis "< 1 ... n ... N >"
                if (pageNumber >= lr && pageNumber <= (maxPage - lr)) {
                    if (n === 0 || n === pageNumber || n === maxPage) {
                        pagingUrls.push({
                            page: (n + 1).toString(),
                            class: n === pageNumber ? 'current' : '',
                            url: paging.appendPaging(pageUrl, startIdx + ((n - pageNumber) * pageSize))
                        });
                    } else {
                        pagingUrls.push({
                            page: '...',
                            class: 'elipsis'
                        });
                    }
                }

                // left-side elipsis "< 1 ... L M N >"
                if (pageNumber > (maxPage - lr)) {
                    if (n === 0 || n >= (maxPage - lr)) {
                        pagingUrls.push({
                            page: (n + 1).toString(),
                            class: n === pageNumber ? 'current' : '',
                            url: paging.appendPaging(pageUrl, startIdx + ((n - pageNumber) * pageSize))
                        });
                    } else {
                        pagingUrls.push({
                            page: '...',
                            class: 'elipsis'
                        });
                    }
                }
            }
        }

        // "next" button
        if (pageNumber < maxPage) {
            pagingUrls.push({
                page: '>',
                class: 'icon next',
                url: paging.appendPaging(pageUrl, startIdx + pageSize)
            });
        }
    }

    // filter subsequent elipsis-button into one elipsis-button
    pagingUrls = pagingUrls.filter(function (url, i, urls) {
        return i === 0 ? true : urls[i - 1].page !== url.page;
    });

    return pagingUrls;
}

/**
 * generate URL for a load-more button
 *
 * @param {dw.web.PagingModel} paging - Paging Model
 * @param {dw.web.URL} pageUrl - Base URL
 * @param {number} startIdx - Start index of current page
 * @param {number} pageSize - Number of product-tiles per page
 * @return {string} - Load-more URL
 */
function getLoadMoreUrl(paging, pageUrl, startIdx, pageSize) {
    var pageCount = paging.pageCount;
    var maxPage = paging.maxPage;
    var pageNumber = paging.currentPage;
    var loadMoreUrl = null;

    if (pageCount > 1) {
        if (pageNumber < maxPage) {
            loadMoreUrl = paging.appendPaging(pageUrl, startIdx + pageSize);
        }
    }
    return loadMoreUrl;
}

/**
 * Forms a URL that can be used as a permalink with filters, sort, and page size preserved
 *
 * @param {dw.catalog.ProductSearchModel} productSearch - Product search object
 * @param {number} pageSize - 'sz' query param
 * @param {number} startIdx - 'start' query param
 * @return {string} - Permalink URL
 */
function getPermalink(productSearch, pageSize, startIdx) {
    var showMoreEndpoint = 'Search-Show';
    var params = { start: '0', sz: pageSize + startIdx };
    var url = productSearch.url(showMoreEndpoint).toString();
    var appended = urlHelper.appendQueryParams(url, params).toString();
    return appended;
}

/**
 * Forms a URL that can be used as a permalink with filters, sort, and page size preserved
 *
 * @param {dw.util.List} collectionSearchHits - list of search hits
 * @return {array} - sortedList
 */
function innerCollectionSorting(collectionSearchHits) {
    if (collectionSearchHits.length < 2) return collectionSearchHits;
    var list = [];
    var sortedList = [];
    for (let i = 0; i < collectionSearchHits.length; i += 1) {
        var pos = !empty(collectionSearchHits[i].product.custom.collectionPosition) ? '000000' + collectionSearchHits[i].product.custom.collectionPosition : '999999';
        pos = pos.substring(pos.length - 6);
        list.push([pos, collectionSearchHits[i].product.name, collectionSearchHits[i]]);
    }
    list.sort();
    for (let i = 0; i < list.length; i += 1) {
        sortedList.push(list[i][2]);
    }
    return sortedList;
}

/**
 * Forms a URL that can be used as a permalink with filters, sort, and page size preserved
 *
 * @param {dw.util.Iterator} productSearchHitsIterator - Product search hits iterator
 * @return {string} - Permalink URL
 */
function groupSearchResults(productSearchHitsIterator) {
    // grouping the search results
    var productSearchHitsList = productSearchHitsIterator.asList();
    var productSearchHitsDict = {};
    for (let i = 0; i < productSearchHitsList.length; i += 1) {
        var searchHit = productSearchHitsList[i];
        var product = searchHit.product;
        var key = product.custom.collection || 'others';
        if (!(key in productSearchHitsDict)) productSearchHitsDict[key] = [];
        productSearchHitsDict[key].push(searchHit);
    }
    var collectionsList = [];
    var keys = Object.keys(productSearchHitsDict);
    var collectionsSorting = Site.getCurrent().getCustomPreferenceValue('collectionsSorting');
    collectionsSorting = !empty(collectionsSorting) ? JSON.parse(collectionsSorting) : {};
    var locale = request.locale;
    if (!empty(collectionsSorting[locale])) {
        collectionsSorting = collectionsSorting[locale];
    } else if (!empty(collectionsSorting[locale.split('_')[0]])) {
        collectionsSorting = collectionsSorting[locale.split('_')[0]];
    } else {
        require('dw/system/Logger').error('"SitePreferences.custom.collectionSorting" contains no entry for current locale ' + locale);
        collectionsSorting = {};
    }

    // the 'collectionList' which need to be sorted is assembled in a way that avoids the creation of a custom sort function which operates with string comparition
    for (let i = 0; i < keys.length; i += 1) {
        var pos = collectionsSorting[keys[i]];
        if (keys[i] === 'others') {
            collectionsList.push(['999999', keys[i]]); // these products do have no collection name maintained and go to th buttom of the list when sorted
        } else if (!empty(pos)) {
            var n = '000000' + pos;
            n = n.substring(n.length - 6);
            collectionsList.push([n, keys[i]]);
        } else {
            collectionsList.push(['999998', keys[i]]); // these products do have a collection name but this one does not appear in 'SitePreferences.custom.collectionsSorting, so they go in alphabetical order to the end of the list when sorted
        }
    }
    collectionsList.sort();

    var groupedSearchCounts = {};
    var productSearchHitsSorted = new ArrayList();
    for (let i = 0; i < collectionsList.length; i += 1) {
        var collectionSearchHits = productSearchHitsDict[collectionsList[i][1]];
        groupedSearchCounts[collectionsList[i][1]] = collectionSearchHits.length;

        // inner-collection-sorting
        collectionSearchHits = innerCollectionSorting(collectionSearchHits);
        for (let j = 0; j < collectionSearchHits.length; j += 1) {
            productSearchHitsSorted.push(collectionSearchHits[j]);
        }
    }

    return [productSearchHitsSorted.iterator(), groupedSearchCounts];
}

/**
 * @constructor
 * @classdesc ProductSearch class
 *
 * @param {dw.catalog.ProductSearchModel} productSearch - Product search object
 * @param {Object} httpParams - HTTP query parameters
 * @param {string} sortingRule - Sorting option rule ID
 * @param {dw.util.ArrayList.<dw.catalog.SortingOption>} sortingOptions - Options to sort search
 *     results
 * @param {dw.catalog.Category} rootCategory - Search result's root category if applicable
 */
function ProductSearch(productSearch, httpParams, sortingRule, sortingOptions, rootCategory) {
    var selectedRefinements = httpParams.preferences || {};
    this.selectedRefinements = selectedRefinements;

    /**
     * In the Profi category the articles are displayed grouped by product attr "tradeGroup".
     * This leads to pagination problems. We increase the page size to fix this issue
     */
    if (productSearch.categorySearch && productSearch.category.parent && productSearch.category.parent.ID === CATEGORIES.profis) {
        this.pageSize = 200;
    } else {
        this.pageSize = parseInt(httpParams.sz, 10) || DEFAULT_PAGE_SIZE;
    }
    this.productSearch = productSearch;

    var productSearchHitsIterator = productSearch.productSearchHits;
    if (productSearch.refinedCategorySearch && 'displayCollectionName' in productSearch.category.custom
        && productSearch.category.custom.displayCollectionName
        && 'brand' in selectedRefinements && selectedRefinements.brand.length > 0) {
        // group search results
        [productSearchHitsIterator, this.groupedSearchCounts] = groupSearchResults(productSearchHitsIterator);
    }

    var startIdx = parseInt(httpParams.start, 10) || 0;
    var paging = getPagingModel(
        productSearchHitsIterator,
        productSearch.count,
        this.pageSize,
        startIdx
    );

    this.pageNumber = paging.currentPage;
    this.pageCount = paging.pageCount;
    this.count = productSearch.count;
    // if actual page is the last page, use total count, otherwise calculate product start + products per page to get the number of products loaded
    this.productsLoaded = (paging.pageCount === paging.currentPage) ? productSearch.count : (paging.start + this.pageSize);

    var productSearchPagingPattern = Site.current.getCustomPreferenceValue('productSearchPagingPattern');
    productSearchPagingPattern = productSearchPagingPattern ? productSearchPagingPattern.value : 'pagination';
    if (productSearchPagingPattern === 'pagination') {
        this.baseUrl = productSearch.url('Search-Show');
        this.pagingUrls = getPagingUrls(paging, this.baseUrl, startIdx, this.pageSize);
    }
    if (productSearchPagingPattern === 'loadMore') {
        this.baseUrl = productSearch.url('Search-UpdateGrid');
        this.loadMoreUrl = getLoadMoreUrl(paging, this.baseUrl, startIdx, this.pageSize);
    }

    this.isCategorySearch = productSearch.categorySearch;
    this.isRefinedCategorySearch = productSearch.refinedCategorySearch;
    this.searchKeywords = productSearch.searchPhrase;
    this.resetLink = getResetLink(productSearch, httpParams);
    this.bannerImageUrl = productSearch.category ? getBannerImageUrl(productSearch.category) : null;
    this.productIds = collections.map(paging.pageElements, function (item) {
        return {
            productID: item.productID,
            minPriceStr: item.minPrice.toString(),
            maxPriceStr: item.maxPrice.toString(),
            productSearchHit: item
        };
    });
    this.productSort = new ProductSortOptions(
        productSearch,
        sortingRule,
        sortingOptions,
        rootCategory,
        paging
    );
    this.showMoreUrl = urlHelper.getShowMoreUrl(productSearch, httpParams);

    this.permalink = getPermalink(
        productSearch,
        parseInt(this.pageSize, 10),
        parseInt(startIdx, 10)
    );

    if (productSearch.category) {
        this.category = {
            name: productSearch.category.displayName,
            id: productSearch.category.ID,
            pageTitle: productSearch.category.pageTitle,
            pageDescription: productSearch.category.pageDescription,
            pageKeywords: productSearch.category.pageKeywords
        };
    }
    this.pageMetaTags = productSearch.pageMetaTags;
}

Object.defineProperty(ProductSearch.prototype, 'selectedFilters', {
    get: function () {
        return getSelectedFilters(this.refinements);
    }
});

Object.defineProperty(ProductSearch.prototype, 'refinements', {
    get: function () {
        if (!this.cachedRefinements) {
            this.cachedRefinements = getRefinements(
                this.productSearch,
                this.productSearch.refinements,
                this.productSearch.refinements.refinementDefinitions
            );
        }

        return this.cachedRefinements;
    }
});

module.exports = ProductSearch;
