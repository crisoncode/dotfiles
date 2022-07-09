
var Site = require('dw/system/Site');
var BasketMgr = require('dw/order/BasketMgr');
var Transaction = require('dw/system/Transaction');
var Calendar = require('dw/util/Calendar');
const siteHelper = require('*/cartridge/scripts/helpers/siteHelper');

var VALIDATION_USER_ACTIONS = {
    PENDING: 0,
    ACCEPT: 1,
    DECLINE: 2,
    IGNORE: 3
};

var getRawAddress = function (addressID) {
    var address = null;
    if (addressID) {
        var addressBook = customer.getProfile().getAddressBook();
        address = addressBook.getAddress(addressID);
    }
    return address;
};

var getCustomerAddressVerificationStatus = function (addressID) {
    var verificationStatus = null;
    var rawAddress = getRawAddress(addressID);
    if (rawAddress) {
        var addressBook = customer.getProfile().getAddressBook();
        rawAddress = addressBook.getAddress(addressID);

        // Check if the address is a carrier address. If so, it is allway valid
        var isPackstationAddress = 'addressType' in rawAddress.custom && rawAddress.custom.addressType !== '0';

        if (isPackstationAddress) {
            verificationStatus = { isValid: true };
        } else if (rawAddress && 'addressValidation' in rawAddress.custom && rawAddress.custom.addressValidation) {
            try {
                verificationStatus = JSON.parse(rawAddress.custom.addressValidation);
            } catch (error) {
                verificationStatus = null;
            }
        }
    }
    return verificationStatus;
};

var shouldTriggerAddressValidation = function (validationStatus) {
    var triggerValidation = false;
    if (validationStatus === null) {
        triggerValidation = true;
    } else if (validationStatus.isValid === false) {
        if (validationStatus.userAction === VALIDATION_USER_ACTIONS.PENDING) {
            triggerValidation = true;
        } else if ((validationStatus.userAction === VALIDATION_USER_ACTIONS.DECLINE || validationStatus.userAction === VALIDATION_USER_ACTIONS.IGNORE) && validationStatus.timestamp) {
            try {
                var today = new Calendar();
                var validationDate = new Calendar(new Date(validationStatus.timestamp));
                var timeDiff = today.getTime() - validationDate.getTime();
                timeDiff = timeDiff / 1000 / 60 / 60 / 24; // Convert from milliseconds into days
                var loqateTestPeriod = Site.getCurrent().getCustomPreferenceValue('loqateTestPeriod') || 90;
                if (timeDiff > loqateTestPeriod) {
                    triggerValidation = true;
                }
            } catch (ignore) {} // eslint-disable-line
        }
    }
    return triggerValidation;
};

var isSuggestionEligible = function (addressForm, addressMatch) {
    var isSuccess = false;
    if ('AQI' in addressMatch && !('Unmatched' in addressMatch) &&
        addressMatch.Thoroughfare &&
        addressMatch.Locality &&
        addressMatch.PostalCode &&
        addressMatch['ISO3166-2']
    ) {
        isSuccess = true;
    }
    if (isSuccess && 'houseNo' in addressForm.custom && addressForm.custom.houseNo) {
        isSuccess = !empty(addressMatch.Premise);
    }

    return isSuccess;
};

const validateAddress = function (addressForm, isLoggedIn) {
    let addressID = '';
    let shouldValidate = true;
    const status = {};

    if (isLoggedIn) {
        addressID = 'addressId' in addressForm ? addressForm.addressId : addressForm.custom.addressID;
        const validationStatus = getCustomerAddressVerificationStatus(addressID);
        shouldValidate = shouldTriggerAddressValidation(validationStatus);
        status.addressValidationStatus = validationStatus;
    }

    if (shouldValidate) {
        const addressValidationResult = { isValid: true, validatedAddress: {} };
        const key = Site.getCurrent().getCustomPreferenceValue('loqateServiceKey');

        const userAddress1 = 'houseNo' in addressForm.custom && addressForm.custom.houseNo
            ? addressForm.address1 + ' ' + addressForm.custom.houseNo
            : addressForm.address1;

        const serviceRequest = {
            Key: key,
            Addresses: [{
                Address1: userAddress1,
                Locality: addressForm.city,
                PostalCode: addressForm.postalCode,
                Country: addressForm.countryCode.value
            }]
        };

        const LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
        const loqateService = require('../loqate/addressVerificationService');
        const loqateServiceObject = LocalServiceRegistry.createService('Loqate.AdressVerification.service', loqateService);
        const loqateResponse = loqateServiceObject.call(serviceRequest);

        if (loqateResponse.status === 'OK') {
            var addressMatch = loqateResponse.object[0].Matches[0];
            if (addressMatch.Thoroughfare !== addressForm.address1) {
                addressValidationResult.isValid = false;
            }
            if (addressValidationResult.isValid && addressMatch.PostalCode !== addressForm.postalCode) {
                addressValidationResult.isValid = false;
            }
            if (addressValidationResult.isValid && addressMatch.Locality !== addressForm.city) {
                addressValidationResult.isValid = false;
            }
            if ('houseNo' in addressForm.custom && addressForm.custom.houseNo) {
                if (addressValidationResult.isValid && addressMatch.Premise !== addressForm.custom.houseNo) {
                    addressValidationResult.isValid = false;
                }
            }

            if (!addressValidationResult.isValid) {
                if (isSuggestionEligible(addressForm, addressMatch)) {
                    addressValidationResult.validatedAddress = {
                        address1: addressMatch.Thoroughfare,
                        houseNo: 'houseNo' in addressForm.custom && addressForm.custom.houseNo ? addressMatch.Premise : '',
                        city: addressMatch.Locality,
                        postalCode: addressMatch.PostalCode,
                        country: addressMatch['ISO3166-2'],
                        addressID: addressID
                    };
                } else {
                    addressValidationResult.validatedAddress = { addressID: addressID };
                }
            }
        } else {
            addressValidationResult.isValid = false;
        }
        status.apiValidation = addressValidationResult;
    }
    return status;
};

var updateBasketBillingAddress = function (address) {
    var currentBasket = BasketMgr.getCurrentBasket();
    if (!currentBasket) {
        return;
    }

    Transaction.wrap(function () {
        currentBasket.billingAddress.custom.houseNo = address.houseNo;
        currentBasket.billingAddress.address1 = address.address1;
        currentBasket.billingAddress.city = address.city;
        currentBasket.billingAddress.postalCode = address.postalCode;
    });
};

var updateBasketShippingAddress = function (address) {
    var currentBasket = BasketMgr.getCurrentBasket();
    if (!currentBasket) {
        return;
    }

    Transaction.wrap(function () {
        currentBasket.defaultShipment.shippingAddress.custom.houseNo = address.houseNo;
        currentBasket.defaultShipment.shippingAddress.address1 = address.address1;
        currentBasket.defaultShipment.shippingAddress.city = address.city;
        currentBasket.defaultShipment.shippingAddress.postalCode = address.postalCode;
    });
};

const validateUserAddress = function (address, type, isLoggedIn) {
    const customer = request.session.customer;
    const enableLoqateForGuests = Site.getCurrent().getCustomPreferenceValue('LoqateGuestsValidation');
    let returnValue = null;
    if (customer && !customer.registered && !enableLoqateForGuests) {
        returnValue = { isValid: true };
    }

    if (!returnValue) {
        const results = validateAddress(address, isLoggedIn);
        if (results.apiValidation) {
            const userRawAddress = isLoggedIn ? getRawAddress('addressId' in address ? address.addressId : address.custom.addressID) : null;

            if (results.apiValidation.isValid === true) {
                results.apiValidation.validatedAddress.type = type;

                if (isLoggedIn && userRawAddress) {
                    Transaction.wrap(function () {
                        userRawAddress.custom.addressValidation = JSON.stringify({ isValid: true });
                    });
                }
            } else if (isLoggedIn && userRawAddress) {
                const apiResult = { isValid: false, timestamp: new Calendar().getTime().getTime(), userAction: VALIDATION_USER_ACTIONS.PENDING };

                // Save API-Result
                Transaction.wrap(function () {
                    userRawAddress.custom.addressValidation = JSON.stringify(apiResult);
                });
            }

            returnValue = results.apiValidation;
        } else {
            // We return here allways true because this code segment is reached if an address is ont matched the
            // criteria to be validated (shouldTriggerAddressValidation returned false)
            // In this way the storefront will interpret this address as a valid
            returnValue = { isValid: true };
        }
    }

    return returnValue;
};

const acceptSuggestedAddress = function (rawAddress, suggestedAddress) {
    if (rawAddress) {
        const address = rawAddress;
        const validationStatus = {
            isValid: true,
            userAction: VALIDATION_USER_ACTIONS.ACCEPT,
            timestamp: new Calendar().getTime().getTime()
        };

        address.address1 = suggestedAddress.address1;
        address.custom.houseNo = suggestedAddress.houseNo;
        address.city = suggestedAddress.city;
        address.postalCode = suggestedAddress.postalCode;
        address.custom.addressValidation = JSON.stringify(validationStatus);
    }
};

const denySuggestedAddress = function (rawAddress) {
    if (rawAddress) {
        const address = rawAddress;
        const validationStatus = {
            isValid: false,
            userAction: VALIDATION_USER_ACTIONS.DECLINE,
            timestamp: new Calendar().getTime().getTime()
        };
        address.custom.addressValidation = JSON.stringify(validationStatus);
    }
};

var resetAddressValidation = function (address, oldAddressID) {
    if ('addressValidation' in address.custom) {
        var validation = JSON.parse(address.custom.addressValidation);
        validation.isValid = false;
        validation.userAction = VALIDATION_USER_ACTIONS.PENDING;
        validation.timestamp = new Calendar().getTime().getTime(); // Set an old timestamp in o
        address.custom.addressValidation = JSON.stringify(validation); // eslint-disable-line

        // In the RefAff, each time an address is edited/saved (Address-SaveAddress), its ID is changed. WHY?????
        // Since the Address ID is changed during Editing the address, we have to update this ID
        // if the address is used in the basket
        if (oldAddressID) {
            var currentBasket = BasketMgr.getCurrentBasket();
            if (currentBasket) {
                // Retrieve addresses
                var billingAddress = currentBasket.billingAddress;
                var shippingAddress = currentBasket.shipments[0].shippingAddress;

                if (billingAddress && billingAddress.custom.addressID === oldAddressID) {
                    billingAddress.custom.addressID = address.ID;
                }
                if (shippingAddress && shippingAddress.custom.addressID === oldAddressID) {
                    shippingAddress.custom.addressID = address.ID;
                }
            }
        }
    }
};

var updateValidationStatus = function (address, validationStatus) {
    if (address.custom.addressID) {
        Transaction.wrap(function () {
            var validation = {
                isValid: validationStatus,
                userAction: VALIDATION_USER_ACTIONS.IGNORE,
                timestamp: new Calendar().getTime().getTime()
            };
            var customerAddress = getRawAddress(address.custom.addressID);
            customerAddress.custom.addressValidation = JSON.stringify(validation); // eslint-disable-line
        });
    }
};

var validateCheckoutAddress = function (address) {
    Transaction.wrap(function () {  //eslint-disable-line
        var basketAddress = address;
        try {
            basketAddress.firstName = address.firstName.length > 50 ? address.firstName.substring(0, 50) : address.firstName;
            basketAddress.lastName = address.lastName.length > 50 ? address.lastName.substring(0, 50) : address.lastName;
            basketAddress.address1 = address.address1.length > 50 ? address.address1.substring(0, 50) : address.address1;
            basketAddress.city = address.city.length > 40 ? address.city.substring(0, 40) : address.city;
            basketAddress.postalCode = address.postalCode && address.postalCode.length > 10 ? address.postalCode.substring(0, 10) : address.postalCode;

            if (address.salutation && typeof (address.salutation) === 'string') {
                basketAddress.salutation = address.salutation.length > 1 ? address.salutation.substring(0, 1) : address.salutation;
            }

            if (address.phone) {
                basketAddress.phone = address.phone.length > 30 ? address.phone.substring(0, 30) : address.phone;
            }

            if (address.address2) {
                basketAddress.address2 = address.address2 && address.address2.length > 50 ? address.address2.substring(0, 50) : address.address2;
            }

            if (address.companyName) {
                basketAddress.companyName = address.companyName && address.companyName.length > 40 ? address.companyName.substring(0, 40) : address.companyName;
            }
        } catch (ignore) {} // eslint-disable-line
    });
};

const clearStateIfNecessary = function (addressForm) {
    const countryList = JSON.parse(siteHelper.getSitePref('countriesWithStates'));
    const address = addressForm;
    const country = address && address.countryFields && address.countryFields.country ? address.countryFields.country.value : null;

    if (country && countryList && countryList[country] === true) {
        return;
    }

    if (address && address.states && address.states.stateCode) {
        address.states.stateCode.value = null;
    }
};

/**
 * Returns the Site Pref value for "isCompanyEnabled"
 * @return {boolean} true or false
 */
function isCompanyEnabled() {
    return Site.current.getCustomPreferenceValue('isCompanyEnabled');
}

module.exports = {
    updateBasketBillingAddress: updateBasketBillingAddress,
    updateBasketShippingAddress: updateBasketShippingAddress,
    acceptSuggestedAddress: acceptSuggestedAddress,
    denySuggestedAddress: denySuggestedAddress,
    validateUserAddress: validateUserAddress,
    updateValidationStatus: updateValidationStatus,
    resetAddressValidation: resetAddressValidation,
    validateCheckoutAddress: validateCheckoutAddress,
    clearStateIfNecessary: clearStateIfNecessary,
    isCompanyEnabled: isCompanyEnabled
};
