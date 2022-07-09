/**
 * For all the products that are associated to a category
 * we want to create a breadcrumb structure
 * like the following one:
 * Running shoes -> Mountain -> Summer
 * But we have a problem here,
 * we want this breadcrumbs in English for all the sites.
 * This is the reason for the creation of this jobStep.
 */
const Site = require('dw/system/Site');
const CatalogMgr = require('dw/catalog/CatalogMgr');

function example() {
    const Sites = Site.getAllSites();
    const rootCategory = CatalogMgr.getCatalog();
    this.handleCategories(rootCategory);
}
