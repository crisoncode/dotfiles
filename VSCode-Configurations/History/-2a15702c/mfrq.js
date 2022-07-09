'use strict';
/**
 * For all the products that are associated to a category
 * we want to create a breadcrumb structure
 * and save it in  a custom attribute
 * like the following one:
 * Running shoes -> Mountain -> Summer
 * But we have a problem here,
 * we want this breadcrumbs in English for all the sites.
 * This is the reason for the creation of this jobStep.+
 *
 * So we will create a job -> job step that will be executed
 * in a organization scope.
 * In this way we can jump between locales.
 */

// TDD
// red, simple implementation, green, refactor

const Site = require('dw/system/Site');
const CatalogMgr = require('dw/catalog/CatalogMgr');
const ProductMgr = require('dw/catalog/ProductMgr');
const Status = require('dw/system/Status');
const SystemObjectMgr = require("dw/object/SystemObjectMgr");

function fillBreadcrumbsCustomAttribute() {
    const products = SystemObjectMgr.querySystemObject()
    return true;
}


exports.fillBreadcrumbsCustomAttribute = fillBreadcrumbsCustomAttribute;
