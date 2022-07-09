const LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
const Logger = require('dw/system/Logger');
//
// Zerberus service
//
const zerberusCheckCustomer = LocalServiceRegistry.createService('zerberus.checkCustomer', {


    createRequest: function (svc, args) {
        const customerAddr = args;
        const body = [];
        body.push(customerAddr.shippingAddr);
        body.push(customerAddr.billingAddr);
        svc.setRequestMethod('POST');
        svc.addHeader('Content-Type', 'application/json');
        svc.addHeader('client_id', svc.configuration.credential.user);
        svc.addHeader('client_secret', svc.configuration.credential.password);
        svc.addHeader('customer_id', 'soaptest');
        svc.setEncoding('UTF-8');
        return JSON.stringify(body);
    },

    parseResponse: function (svc, client) {
        let response = null;

        try {
            response = JSON.parse(client.text)[0];
        } catch (error) {
            Logger.error('Error in parsing response from Zerberus');
        }

        return response;
    },

    // eslint-disable-next-line no-unused-vars
    mockCall: function (svc, client) {
        const Site = require('dw/system/Site');
        const blockOrder = Site.getCurrent().getCustomPreferenceValue('zerberusBlockMockedAnswers');
        const mockResponse = {
            errorCode: '0',
            errorDescription: 'No errors',
            matchValue: 0,
            countResults: 0,
            countGoodLinks: 0,
            badGuy: false
        };

        if (blockOrder) {
            mockResponse.badGuy = true;
        }

        return {
            statusCode: 200,
            statusMessage: 'Success',
            text: JSON.stringify([mockResponse])
        };
    },

    filterLogMessage: function (message) {
        return message;
    }
});

module.exports = {
    checkCustomer: zerberusCheckCustomer
};
