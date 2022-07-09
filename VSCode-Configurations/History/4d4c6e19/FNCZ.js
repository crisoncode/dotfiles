'use strict';
const Logger = require('dw/system/Logger');
const Transaction = require('dw/system/Transaction');
const Status = require('dw/system/Status');

/**
 *
 * Setting order to status that blocks the exportation to external systems. (In our case: ORDER_STATUS_CANCELLED)
 *
 * @param {dw.order.order} order SFCC raw order object.
 * @param {Object} zerberusAnswer response object from Zerberus endpoint.
 * @param {Object} blockOrdersConfig Configuration for set order status and order export status
 */
function blockOrderExportation(order, zerberusAnswer, blockOrdersConfig) {
    try {
        Transaction.wrap(function () {
            order.custom.blockedByZerberus = JSON.stringify(zerberusAnswer);

            if (blockOrdersConfig.orderStatus !== 'NONE') {
                order.setStatus(order[blockOrdersConfig.orderStatus]);
            }

            if (blockOrdersConfig.orderExportStatus !== 'NONE') {
                order.setExportStatus(order[blockOrdersConfig.orderExportStatus]);
            }
        });
    } catch (error) {
        Logger.error('Problem founded trying to block an order with orderNo ' + order.orderNo + ' error message: ' + error);
    }
}

/**
 *
 * Handle zerberus answer, mark order as processed and block exportation if is needed.
 *
 * @param {dw.svc.Result} zerberusServiceResult SFCC service
 * @param {dw.order.Order} order SFCC raw order object.
 * @param {Object} blockOrdersConfig Configuration for set order status and order export status
 * @return {boolean} result of handling the request
 */
function handleZerberusResult(zerberusServiceResult, order, blockOrdersConfig) {
    let result = false;
    try {
        if (zerberusServiceResult.ok && zerberusServiceResult.object) {
            const zerberusAnswer = zerberusServiceResult.object;

            if (zerberusAnswer.badGuy === true) {
                blockOrderExportation(order, zerberusAnswer, blockOrdersConfig);
            }

            Transaction.wrap(function () {
                order.custom.checkedByZerberus = true;
            });

            result = true;
        } else {
            Logger.error('Problem founded in Zerberus request ' + JSON.stringify(zerberusServiceResult));
        }
    } catch (error) {
        Logger.error('Problem in handle zerberus result and process the order' + error);
    }
    return result;
}

/**
 * @param {dw.order.order} order typical SFCC raw order object.
 * @returns {Object} this object contains the data structure of a customer ready to be send.
 */
function buildCustomerObjectForMulesoft(order) {
    let result = null;

    if (order && order.orderNo) {
        result = {};
        result.shippingAddr = {
            orderNumber: order.orderNo,
            name: order.defaultShipment.shippingAddress.fullName,
            street: order.defaultShipment.shippingAddress.address1,
            city: order.defaultShipment.shippingAddress.city,
            zip: order.defaultShipment.shippingAddress.postalCode,
            country: order.defaultShipment.shippingAddress.countryCode.displayValue
        };
        result.billingAddr = {
            orderNumber: order.orderNo,
            name: order.billingAddress.fullName,
            street: order.billingAddress.address1,
            city: order.billingAddress.city,
            zip: order.billingAddress.postalCode,
            country: order.billingAddress.countryCode.displayValue
        };
    }

    return result;
}

/**
 * Development use only, for check mulesoft calls
 *
 * @param {Object} args common job args object (Contains Order number)
 * @returns {service} service
 */
function checkCustomerByOrder(args) {
    const OrderMgr = require('dw/order/OrderMgr');
    const order = OrderMgr.getOrder(args.orderNumber.toString());
    let zerberusServiceResult = null;
    const startTime = Date.now();

    if (order && order.orderNo) {
        const zerberusCustomerObj = buildCustomerObjectForMulesoft(order);
        const zerberusService = require('int_zerberus/cartridge/services/checkCustomer');
        zerberusServiceResult = zerberusService.checkCustomer.call(zerberusCustomerObj, false);
        Logger.info('Zerberus response -->  ' + JSON.stringify(zerberusServiceResult));
        handleZerberusResult(zerberusServiceResult, order, { orderStatus: args.orderStatus, orderExportStatus: args.orderExportStatus });
    } else {
        throw new Error('Order with ID ' + args.orderNumber + ' not found');
    }

    let endTime = Date.now();
    let timeSpent = (endTime - startTime) / 1000;
    Logger.info('We spent --> ' + timeSpent + ' seconds in process the order');
    return new Status(Status.OK);
}

/**
 * This method make the same query that we have for export orders
 * @returns {dw.util.SeekableIterator} contains all the orders to be exported.
 */
function getAllOrdersReadyToExport() {
    const SystemObjectMgr = require('dw/object/SystemObjectMgr');
    const Order = require('dw/order/Order');
    const ordersIterator = SystemObjectMgr.querySystemObjects('Order',
            '(exportStatus={0} OR exportStatus={1}) AND confirmationStatus={2} AND (status={3} OR status={4})',
            null,
            Order.EXPORT_STATUS_READY,
            Order.EXPORT_STATUS_FAILED,
            Order.CONFIRMATION_STATUS_CONFIRMED,
            Order.ORDER_STATUS_NEW,
            Order.ORDER_STATUS_OPEN);
    return ordersIterator;
}

/**
 * This method makes a call to mulesoft per each order
 * for check the trustability of each customer
 * if the customer is a bad guy we will change the status of the order
 * @param {Object} args common job args object (Contains disableStep, orderStatus, orderExportStatus)
 * @return {dw.system.Status} return SFCC status
 */
function checkOrdersToBeExported(args) {
    if (!args.disableStep) {
        const maxCallRetries = args.maxCallRetries ? args.maxCallRetries : 5;
        const ordersIterator = getAllOrdersReadyToExport();
        const zerberusService = require('int_zerberus/cartridge/services/checkCustomer');
        let badHandleResults = 0;

        while (ordersIterator.hasNext()) {
            let order = ordersIterator.next();

            if (order.custom.checkedByZerberus) {
                continue;
            }

            let zerberusCustomerObj = buildCustomerObjectForMulesoft(order);

            if (zerberusCustomerObj && maxCallRetries > badHandleResults) {
                let zerberusServiceResult = zerberusService.checkCustomer.call(zerberusCustomerObj, false);
                if (args.EnableZerberusLogs) {
                    Logger.info('OrderNo: ' + order.orderNo + ' with data --> ' + JSON.stringify(zerberusCustomerObj) + ' response --> ' + JSON.stringify(zerberusServiceResult));
                }
                const handlingResult = handleZerberusResult(zerberusServiceResult, order, { orderStatus: args.orderStatus, orderExportStatus: args.orderExportStatus });

                if (!handlingResult) {
                    badHandleResults++;
                }
            } else {
                if (maxCallRetries > badHandleResults) {
                    Logger.error('Max call - issues limit for exceed');
                }
                if (!zerberusCustomerObj) {
                    Logger.error('Problem within an order with UUID ' + order.getUUID() + ' and order Number ' + order.orderNo);
                }

                Logger.error('An error happened in Zerberus.');
            }
        }
    }
    return new Status(Status.OK);
}

/**
 * Method/JobStep for test timings when we make calls to mulesoft.
 * @return {dw.system.Status} return SFCC status
 * */
function retrieveCustomersDevUtil() {
    const sysCustomerMgr = require('dw/customer/CustomerMgr');
    const profiles = sysCustomerMgr.searchProfiles('customerNo != NULL', null, null);
    let orderNumber = 1000;
    const zerberusService = require('int_zerberus/cartridge/services/checkCustomer');
    Logger.info('starting loop at -->' + new Date());
    let counter = 0;

    while (profiles.hasNext()) {
        let profile = profiles.next();
        let profileAddresses = profile.addressBook.addresses;

        if (profileAddresses.length > 0) {
            let address = profileAddresses.get(0);

            let zerberusObject = {
                orderNumber: orderNumber.toString(),
                name: profile.firstName + ' ' + profile.lastName,
                street: address.address1,
                city: address.city
            };
            let zerberusServiceResult = zerberusService.checkCustomer.call(zerberusObject, false);
            let zerberusAnswer = zerberusServiceResult.object;
            Logger.info('order nº->' + orderNumber + ' Answer -> ' + JSON.stringify(zerberusAnswer));
            counter++;
        }
        orderNumber++;
    }
    Logger.info('ending loop at -->' + new Date() + ' counter-->' + counter);
    return new Status(Status.OK);
}

exports.retrieveCustomersDevUtil = retrieveCustomersDevUtil;
exports.checkCustomerByOrder = checkCustomerByOrder;
exports.checkOrdersToBeExported = checkOrdersToBeExported;
