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
const collections = require('*/cartridge/scripts/util/collections');
const Status = require('dw/system/Status');

function fillBreadcrumbsCustomAttribute() {
    const allSites = Site.getAllSites();
    const rootCategory = CatalogMgr.getCatalog();

    for (const site in allSites) {
        let test = site;
        let test2 = 'hola';
    }

    return true;
}
