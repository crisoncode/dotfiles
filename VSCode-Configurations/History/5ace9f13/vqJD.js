'use strict';

const productAttributesToHighlight = {
    rackets: {
        headSize: {
            title: 'Headsize',
            attributeID: 'headSize',
            enabled: true
        },
        stringPattern: {
            title: 'String pattern',
            attributeID: 'stringPattern',
            enabled: true
        },
        weight: {
            title: 'Weight',
            attributeID: 'weightUnstrung',
            enabled: true
        },
        length: {
            title: 'length',
            attributeID: 'length',
            enabled: true
        },
        balance: {
            title: 'Balance Point',
            attributeID: 'balance',
            enabled: true
        },
        testWinner: {
            title: 'Test winner',
            attributeID: false,
            enabled: false
        }
    },
    apparel: { // means clothing
        breathable: {
            title: 'breathable',
            attributeID: false,
            enabled: false
        },
        moistureRepellent: {
            title: 'Moisture Repellent',
            attributeID: false,
            enabled: false
        },
        lowWeight: {
            title: '(Low) Weight',
            attributeID: false,
            enabled: false
        },
        elasticityStretch: {
            title: 'Elasticity Stretch',
            attributeID: false,
            enabled: false
        },
        easyCare: {
            title: 'easyCare',
            attributeID: false,
            enabled: false
        },
        material: {
            title: 'Material',
            attributeID: 'material',
            enabled: true
        },
        manufacturerColor: {
            title: 'Manufacturer color',
            attributeID: 'manufacturerColor',
            enabled: true
        },
        sustainability: {
            title: 'Sustainability',
            attributeID: 'sustainability',
            enabled: true
        }
    },
    shoes: {
        material: {
            title: 'Material',
            attributeID: 'material',
            enabled: true
        },
        manufacturerColor: {
            title: 'Manufacturer color',
            attributeID: 'manufacturerColor',
            enabled: true
        },
        sustainability: {
            title: 'Sustainability',
            attributeID: 'sustainability',
            enabled: true
        },
        surface: {
            title: 'Surface',
            attributeID: 'Surface',
            enabled: false
        },
        innerMaterial: {
            title: 'Inner Material',
            attributeID: 'materialInnerClothShoes',
            enabled: true
        },
        outerMaterial: {
            title: 'Outer Material',
            attributeID: 'materialOuterClothShoes',
            enabled: true
        },
        outsole: {
            title: 'Outsole',
            attributeID: 'materialSoleShoes',
            enabled: true
        },
        insole: {
            title: 'Insole',
            attributeID: 'materialOuterSoleShoes',
            enabled: false
        }
    },
    bags: {
        outerMaterial: {
            title: 'Outer material',
            attributeID: 'outerMaterial',
            enabled: true
        },
        dimensions: {
            title: 'Dimensions',
            attributeID: false,
            enabled: false
        },
        separateShoeSpace: {
            title: 'Separate shoe space',
            attributeID: 'separateShoeSpace',
            enabled: false
        },
        carryHandle: {
            title: 'Carry Handle',
            attributeID: 'carryHandle',
            enabled: false
        },
        thermoguard: {
            title: 'Thermoguard',
            attributeID: 'thermocase',
            enabled: true
        }
    },
    strings: {
        material: {
            title: 'Material',
            attributeID: 'material',
            enabled: true
        },
        structure: {
            title: 'Structure',
            attributeID: 'stringStructure',
            enabled: true
        },
        control: {
            title: 'Control',
            attributeID: 'control',
            enabled: true
        },
        spin: {
            title: 'Spin',
            attributeID: 'spin',
            enabled: true
        },
        armProtection: {
            title: 'Arm protection',
            attributeID: 'armProtection',
            enabled: true
        },
        gameStrength: {
            title: 'Game strength',
            attributeID: 'gameStrength',
            enabled: true
        }
    }
};

/**
 * get the highlighted attributes for the current product type
 * @param {Object} args contains all the arguments.
 * @param {string} args.productType contains the product Type as string (shoes, clothes, etc.)
 * @return {Array} with the mapping of the current product type
 */
function getAttributesByProductType(args) {
    const productTypeMapping = productAttributesToHighlight[args.productType];
    return productTypeMapping || [];
}

/**
 * We have some cases of values like weight that in database are saved like "423"
 * and we want to paint them like "423gr"
 * for this special cases we will have this method. To prepare this values to be rendered
 * in the frontend with a good and enhanced format.
 * @param {Object} attribute that contains the attributeID,etc...
 */
function enhanceValuesWithMetrics(attribute) {

}


function getProductAttributeValue(attribute) {
    let attributeValue = productCustomAttributes[attrMap.attributeID];
}

/**
 * @param {Object} args contains all the arguments.
 * @param {Object} args.product product with all the attributes filled by our decorators
 * @param {string} args.attributesMapping contains all the attrs of a product that to be highlighted
 * @return {Array} with all the attributes that are filled in the database.
 */
function fillAttributes(args) {
    const attributesFilledResult = [];
    const productCustomAttributes = args.product.custom;

    Object.keys(args.attributesMapping).forEach((key) => {
        let attribute = args.attributesMapping[key];

        if (attrMap.enabled && attrMap.attributeID &&
            Object.prototype.hasOwnProperty.call(productCustomAttributes, attribute.attributeID)) {
            attribute.translationKey = key;
            attribute.value =
            let enhancedValue = getProductAttributeValue( {attribute: attribute, productCustomAttributes: productCustomAttributes });
            if (enhancedValue)  {

            }
            attributesFilledResult.push(attrMap);
        }
    });

    return attributesFilledResult;
}

/**
 * Returns a map of all the highlights avaialable for a product
 * @param {dw.catalog.Product} product product that comes from the decorator.
 * @return {Object} with all the avialable attributes to hightlight
 */
function getProductHighlights(product) {
    const productAttrsMapping = getAttributesByProductType({ productType: product.custom.tradeGroup });
    const productHighlights = fillAttributes({ product: product, attributesMapping: productAttrsMapping });

    return productHighlights;
}


module.exports = {
    productAttributesToHighlight: productAttributesToHighlight,
    getAttributesByProductType: getAttributesByProductType,
    fillAttributes: fillAttributes,
    getProductHighlights: getProductHighlights
};
