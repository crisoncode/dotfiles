'use strict';

module.exports = function (object, apiProduct, params) {
    // The product-attribute 'tradeGroup' is for the product type. Available values: rackets, shoes, balls, bags, apparel, strings, grips, accessories, squash, badminton
    Object.defineProperty(object, 'tradeGroup', {
        enumerable: true,
        value: 'tradeGroup' in apiProduct.custom && apiProduct.custom.tradeGroup ? apiProduct.custom.tradeGroup : null
    });

    // The product-attribute 'sizeType' is for the product size type. Available values: 0, 1, 2, 3 (mapping in properties label.size_X)
    Object.defineProperty(object, 'sizeType', {
        enumerable: true,
        value: 'sizeType' in apiProduct.custom && apiProduct.custom.sizeType ? apiProduct.custom.sizeType : null
    });

    // The size label for different size types (e.g. Size, Shoe size, Grip size...)
    Object.defineProperty(object, 'sizeTypeLabel', {
        enumerable: true,
        value: (function () {
            var sizeType = 'sizeType' in apiProduct.custom && apiProduct.custom.sizeType ? apiProduct.custom.sizeType : null;
            var sizeTypeLabel = 'label.size_' + (sizeType || '0');
            return sizeTypeLabel;
        }())
    });

    // The product-attribute 'sizeChart' is for the product size chart content asset ID
    Object.defineProperty(object, 'sizeChart', {
        enumerable: true,
        value: 'sizeChart' in apiProduct.custom && apiProduct.custom.sizeChart ? apiProduct.custom.sizeChart : null
    });

    // The product-attribute 'modelHeight' is the height of the model
    Object.defineProperty(object, 'modelHeight', {
        enumerable: true,
        value: 'modelHeight' in apiProduct.custom && apiProduct.custom.modelHeight ? apiProduct.custom.modelHeight : null
    });

    // The product-attribute 'modelSize' is the worn size by the model (e.g. "XL")
    Object.defineProperty(object, 'modelSize', {
        enumerable: true,
        value: 'modelArticleSize' in apiProduct.custom && apiProduct.custom.modelArticleSize ? apiProduct.custom.modelArticleSize : null
    });

    // The product is used as a part of a productBundle in the given context
    if (params) {
        Object.defineProperty(object, 'isBundleProduct', {
            enumerable: true,
            value: params.isBundleProduct
        });
    }

    // The product-attribute 'productType' (name collides with system attribute, hence we call it simply 'type')
    Object.defineProperty(object, 'type', {
        enumerable: true,
        value: 'productType' in apiProduct.custom && apiProduct.custom.productType ? apiProduct.custom.productType : null
    });

    // The product-attribute 'subProductType' or 'stringStructure' in case strings tradegroup
    // TODO: rename this property
    Object.defineProperty(object, 'subType', {
        enumerable: true,
        value: (function () {
            if ('tradeGroup' in apiProduct.custom && apiProduct.custom.tradeGroup === 'strings'
                && 'stringStructure' in apiProduct.custom && apiProduct.custom.stringStructure) {
                return apiProduct.custom.stringStructure;
            }
            return 'subProductType' in apiProduct.custom && apiProduct.custom.subProductType ? apiProduct.custom.subProductType : null;
        }())
    });
};
