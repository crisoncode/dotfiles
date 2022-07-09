'use strict';

var server = require('server');
var Transaction = require('dw/system/Transaction');
var CustomerMgr = require('dw/customer/CustomerMgr');
var Site = require('dw/system/Site');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var googleTagManager = require('../scripts/middleware/googleTagManager');
var Helper = require('app_storefront_common/cartridge/scripts/utils.js');
var Resource = require('dw/web/Resource');
var URLUtils = require('dw/web/URLUtils');
var StringUtils = require('dw/util/StringUtils');
var logger = require('dw/system/Logger').getLogger('Account', 'OXIDLoggin');
var captchaHelper = require('../scripts/helpers/captchaHelper.js');
var ArrayList = require('dw/util/ArrayList');

server.extend(module.superModule);

/**
 * Checks if the email value entered is correct format
 * @param {string} email - email string to check if valid
 * @returns {boolean} Whether email is valid
 */
function validateEmail(email) {
    const regex = /^[\s]*[\w.%+-]+@[\w.-]+\.[\w]{2,6}[\s]*$/;
    return regex.test(email.trim());
}

/**
 * Gets the password reset token of a customer
 * @param {Object} customer - the customer requesting password reset token
 * @returns {string} password reset token string
 */
function getPasswordResetToken(customer) {
    var passwordResetToken;
    Transaction.wrap(function () {
        passwordResetToken = customer.profile.credentials.createResetPasswordToken();
    });
    return passwordResetToken;
}

/**
 * localized date & time (respecting timezone) for display
 * @param {date} dateTime - the customer requesting password reset token
 * @returns {string} date & time
 */
function getLocalizedDisplayDateTime(dateTime) {
    var Calendar = require('dw/util/Calendar');
    var calendar = new Calendar(dateTime);
    calendar.setTimeZone('Etc/GMT-2');
    return StringUtils.formatCalendar(calendar);
}

/**
 * send customer support email with trainer license attachment
 * @param {dw/util/LinkedHashMap} files map where the keys are the actual file names and the values are references to the File
 * @param {Object} customer current customer
 */
function sendTrainerLicenseEmail(files, customer) {
    var Mail = require('dw/net/Mail');
    var Template = require('dw/util/Template');
    var HashMap = require('dw/util/HashMap');
    var attachmentHelper = require('*/cartridge/scripts/helpers/fileAttachment.js');

    var fileList = new ArrayList();
    fileList.add(files.licenseFile.fullPath);

    var base64FileMap = attachmentHelper.getBase64EncodedAttachments(fileList);
    var emailData = {
        base64FileMap: base64FileMap,
        customerEmail: customer.profile.email,
        customerName: customer.profile.firstName + ' ' + customer.profile.lastName
    };

    var email = new Mail();
    var context = new HashMap();
    Object.keys(emailData).forEach(function (key) {
        context.put(key, emailData[key]);
    });

    email.addTo(Site.current.getCustomPreferenceValue('coachProgramMailReceiver'));
    email.setSubject(Resource.msg('trainerlicense.mail.subject', 'customerservice', null));
    email.setFrom(Site.current.getCustomPreferenceValue('coachProgramMailSender'));
    var template = new Template('account/trainerlicenseEmail');
    var content = template.render(context).text;
    email.setContent(content, 'multipart/mixed; boundary=------------003783700293748321000320', 'iso-8859-1');
    email.send();
}

/**
 * delete license file from webdav temp folder
 * @param {dw/util/LinkedHashMap} files map where the keys are the actual file names and the values are references to the File
 */
function deleteLicenseFiles(files) {
    var fileToDelete = files.licenseFile;
    if (fileToDelete.exists() && !fileToDelete.directory) {
        fileToDelete.remove();
    }
}

/**
 * Sends the email with password reset instructions
 * @param {string} email - email for password reset
 * @param {Object} resettingCustomer - the customer requesting password reset
 * @param {string} host - host of instance
 */
function sendPasswordResetEmail(email, resettingCustomer, host) {
    var Mail = require('dw/net/Mail');
    var Template = require('dw/util/Template');
    var HashMap = require('dw/util/HashMap');
    var contact = require('*/cartridge/scripts/helpers/customerServiceHelper.js').getCustomerServiceContact();
    var brands = require('*/cartridge/config/brands.json');
    var currentSite = Site.getCurrent().ID;

    var template;
    var content;

    var passwordResetToken = getPasswordResetToken(resettingCustomer);
    var url = URLUtils.https('Account-SetNewPassword', 'token', passwordResetToken);
    var objectForEmail = {
        passwordResetToken: passwordResetToken,
        firstName: resettingCustomer.profile.firstName,
        lastName: resettingCustomer.profile.lastName,
        url: url,
        contact: contact,
        brand: brands[currentSite].brand
    };
    var resetPasswordEmail = new Mail();
    var context = new HashMap();
    Object.keys(objectForEmail).forEach(function (key) {
        context.put(key, objectForEmail[key]);
    });

    resetPasswordEmail.addTo(email);
    resetPasswordEmail.setSubject(
        Resource.msgf('subject.password.reset.email', 'account', null, host));
    resetPasswordEmail.setFrom(contact.emailName + '<' + contact.emailAddress + '>');

    template = new Template('account/password/passwordResetEmail');
    content = template.render(context).text;
    resetPasswordEmail.setContent(content, 'text/html', 'UTF-8');
    resetPasswordEmail.send();
}

server.get(
    'PasswordResetModal',
    server.middleware.https,
    csrfProtection.generateToken,
    googleTagManager.createDataLayer,
    function (req, res, next) {
        res.render('/account/password/passwordResetForm', {
            siteKeyForGoogleCaptcha: Site.getCurrent().getCustomPreferenceValue('SiteKeyForCaptcha'),
            enableGoogleCaptcha: Site.getCurrent().getCustomPreferenceValue('EnableGoogleCaptchaPasswordReset') === true
        });
        next();
    }
);

server.replace('PasswordResetDialogForm', server.middleware.post, server.middleware.https,
csrfProtection.validateAjaxRequest, captchaHelper.validTokenPasswordReset, function (req, res, next) {
    if (res.viewData.captchaerror === true) {
        next();
        return;
    }
    var email = req.form.loginEmail;
    var errorMsg = null;
    var isValid;
    var resettingCustomer;
    var mobile = req.querystring.mobile;

    if (email) {
        email = email.replace(/\s/g, '');
        isValid = validateEmail(email);
        if (isValid) {
            resettingCustomer = CustomerMgr.getCustomerByLogin(email);
            if (resettingCustomer) {
                sendPasswordResetEmail(email, resettingCustomer, req.host);
                var receivedMsgHeading = Resource.msg('label.resetpasswordreceived', 'login', null);
                var receivedMsgBody = Resource.msg('msg.requestedpasswordreset', 'login', null);
                var buttonText = Resource.msg('button.text.loginform', 'login', null);
                var returnUrl = URLUtils.url('Login-Show').toString();
                res.json({
                    success: true,
                    receivedMsgHeading: receivedMsgHeading,
                    receivedMsgBody: receivedMsgBody,
                    buttonText: buttonText,
                    mobile: StringUtils.stringToHtml(mobile),
                    returnUrl: returnUrl
                });
            } else {
                errorMsg = Resource.msg('error.message.passwordreset.customermissing', 'login', null);
            }
        } else {
            errorMsg = Resource.msg('error.message.passwordreset', 'login', null);
        }
    } else {
        errorMsg = Resource.msg('error.message.required', 'login', null);
    }
    if (!empty(errorMsg)) {
        res.json({
            fields: {
                loginEmail: errorMsg
            }
        });
    }
    next();
});


server.get('Newsletter',
    server.middleware.https,
    userLoggedIn.validateLoggedIn,
    googleTagManager.createDataLayer,
    function (req, res, next) {
        var context = res.getViewData();
        var seoFactory = require('../scripts/seo/seoFactory');
        var pageTitle = seoFactory.create('META_TITLE', context, req, res);
        req.pageMetaData.setTitle(pageTitle);

        var sidebarNewsletterEnablements = JSON.parse(Site.getCurrent().getCustomPreferenceValue('isNewsletterEnabled'));
        var sidebarNewsletterEnabled = (sidebarNewsletterEnablements && sidebarNewsletterEnablements[res.viewData.locale]) ? sidebarNewsletterEnablements[res.viewData.locale] : false;

        res.render('account/newsletterRegistration', {
            newsletterClass: ' active',
            sidebarNewsletterEnabled: sidebarNewsletterEnabled,
            breadcrumbs: [
                {
                    htmlValue: Resource.msg('global.home', 'common', null),
                    url: URLUtils.home().toString()
                }, {
                    htmlValue: Resource.msg('page.title.myaccount', 'account', null),
                    url: URLUtils.url('Account-Show').toString()
                }, {
                    htmlValue: Resource.msg('dashboadcards.newsletter.title', 'account', null)
                }
            ]
        });
        next();
    }
);

server.get('OrderHistory',
    server.middleware.https,
    userLoggedIn.validateLoggedIn,
    googleTagManager.createDataLayer,
    function (req, res, next) {
        var profile = req.currentCustomer.profile;
        if (profile) {
            var seoFactory = require('../scripts/seo/seoFactory');
            var customerNo = profile.customerNo;
            var OrderMgr = require('dw/order/OrderMgr');
            var Order = require('dw/order/Order');
            var customerOrders = OrderMgr.queryOrders('customerNo = {0} AND status != {1} AND status != {2} AND status != {3} ',
                                                        'creationDate desc',
                                                        customerNo,
                                                        Order.ORDER_STATUS_CREATED, Order.ORDER_STATUS_FAILED, Order.ORDER_STATUS_REPLACED);

            if (!customerOrders) {
                customerOrders = new ArrayList();
            }

            var context = res.getViewData();
            var pageTitle = seoFactory.create('META_TITLE', context, req, res);
            req.pageMetaData.setTitle(pageTitle);

            var sidebarNewsletterEnablements = JSON.parse(Site.getCurrent().getCustomPreferenceValue('isNewsletterEnabled'));
            var sidebarNewsletterEnabled = (sidebarNewsletterEnablements && sidebarNewsletterEnablements[res.viewData.locale]) ? sidebarNewsletterEnablements[res.viewData.locale] : false;

            res.render('account/orderhistory', {
                orderHistoryClass: ' active',
                customerOrders: customerOrders,
                sidebarNewsletterEnabled: sidebarNewsletterEnabled,
                breadcrumbs: [
                    {
                        htmlValue: Resource.msg('global.home', 'common', null),
                        url: URLUtils.home().toString()
                    }, {
                        htmlValue: Resource.msg('page.title.myaccount', 'account', null),
                        url: URLUtils.url('Account-Show').toString()
                    }, {
                        htmlValue: Resource.msg('dashboadcards.orderhistory.title', 'account', null)
                    }
                ]
            });
        }
        next();
    }
);

server.get('Orderdetails',
    server.middleware.https,
    Helper.validateLoggedInAjax,
    googleTagManager.createDataLayer,
    csrfProtection.generateToken,
    function (req, res, next) {
        var viewData = res.viewData;
        var orderToken = req.querystring.ot;
        var orderNo = req.querystring.oid;
        if (viewData.loggedin === false) {
            res.json({
                success: true,
                redirectUrl: URLUtils.url('Address-List').toString()
            });
        } else {
            var OrderMgr = require('dw/order/OrderMgr');
            var customerOrder = OrderMgr.getOrder(orderNo, orderToken);
            // var customerEmail = req.currentCustomer.profile.email;
            if (customerOrder) {
                var returnsGetDetailsService = require('../scripts/returns/returnsService');
                var serviceRegistry = require('dw/svc/LocalServiceRegistry');
                var currentLocale = require('dw/util/Locale').getLocale(req.locale.id);
                var brands = require('*/cartridge/config/brands.json');
                var SiteID = require('dw/system/Site').getCurrent().ID;
                var clinetId = brands[SiteID].clientid || 1;

                var config = { numberOfLineItems: '*' };
                var OrderModel = require('*/cartridge/models/order');
                var orderModel = new OrderModel(customerOrder, { config: config, countryCode: currentLocale.country });
                var trackingResults = [];

                for (var index = 0; index < customerOrder.shipments.length; index++) {
                    var shipment = customerOrder.shipments[index];
                    if ('carrier' in shipment.custom && 'trackingNumber' in shipment.custom) {
                        var orderHelper = require('../scripts/order/orderHelper');
                        var tracking = orderHelper.trackOrderShippingStatus(customerOrder.orderNo, shipment.custom.trackingNumber, shipment.custom.carrier, currentLocale.language);
                        trackingResults.push(tracking);
                    }
                }
                if (Site.current.getCustomPreferenceValue('EnableRetourService') === true) {
                    var orderDetailsService = serviceRegistry.createService('returns.orderdetails', returnsGetDetailsService);
                    var retourDetails = orderDetailsService.call(clinetId, orderNo);
                    var retourInfo = null;

                    try {
                        retourInfo = JSON.parse(customerOrder.custom.retourInfo);
                    } catch (error) {
                        retourInfo = null;
                    }

                    if (!retourDetails || retourDetails.status === 'ERROR' || !retourDetails.object) {
                        res.setViewData({
                            customerOrder: customerOrder,
                            order: orderModel,
                            trackingData: trackingResults,
                            enableRetourService: true,
                            error: Resource.msg('msg.generic.error', 'common', null)
                        });
                    } else {
                        var Calendar = require('dw/util/Calendar');
                        var retourDate = StringUtils.formatCalendar(new Calendar(), 'dd.MM.yyyy');
                        req.session.privacyCache.set('reasonsList', null);
                        var returnsObject = {
                            oid: orderNo,
                            date: retourDate,
                            myAccount: true
                        };

                        var orderItems = [];
                        var orderProducts = customerOrder.getAllProductLineItems();
                        for (var i = 0; i < retourDetails.object.length; i++) {
                            var orderProductsIterator = orderProducts.iterator();
                            var orderObject = retourDetails.object[i];
                            while (orderProductsIterator.hasNext()) {
                                var orderProduct = orderProductsIterator.next();
                                var item = {
                                    docNum: orderObject.docNum,
                                    docEntry: orderObject.docEntry,
                                    itemCode: orderProduct.productID,
                                    returnOk: true
                                };
                                orderItems.push(item);
                            }
                        }

                        retourDetails = orderItems;
                        var returnsHelper = require('../scripts/helpers/returnsHelper.js');
                        returnsHelper.saveObject(returnsObject);

                        res.setViewData({
                            customerOrder: customerOrder,
                            order: orderModel,
                            retourInfo: retourInfo,
                            trackingData: trackingResults,
                            retourDetails: retourDetails,
                            enableRetourService: true,
                            retourAction: URLUtils.url('Returns-GetOrderInfo', 'oid', orderNo).toString()
                        });
                    }
                } else {
                    res.setViewData({
                        customerOrder: customerOrder,
                        order: orderModel,
                        trackingData: trackingResults,
                        enableRetourService: false,
                        retourAction: URLUtils.url('Returns-GetOrderInfo', 'oid', orderNo).toString()
                    });
                }
                res.render('account/orderdetails');
            } else {
                res.redirect(URLUtils.url('Home-Show'));
            }
        }
        next();
    }
);

server.get('EditEmail',
    server.middleware.https,
    userLoggedIn.validateLoggedIn,
    googleTagManager.createDataLayer,
    function (req, res, next) {
        var messages = session.custom.messages ? JSON.parse(session.custom.messages) : null; // eslint-disable-line
        var profileForm = server.forms.getForm('profile');

        if (messages) {
            session.custom.messages = null; // eslint-disable-line
        } else {
            profileForm.clear();
        }

        var context = res.getViewData();
        var seoFactory = require('../scripts/seo/seoFactory');
        var pageTitle = seoFactory.create('META_TITLE', context, req, res);
        req.pageMetaData.setTitle(pageTitle);

        var sidebarNewsletterEnablements = JSON.parse(Site.getCurrent().getCustomPreferenceValue('isNewsletterEnabled'));
        var sidebarNewsletterEnabled = (sidebarNewsletterEnablements && sidebarNewsletterEnablements[res.viewData.locale]) ? sidebarNewsletterEnablements[res.viewData.locale] : false;

        res.render('account/editemail', {
            profileForm: profileForm,
            messages: messages,
            editEmailClass: ' active',
            firstName: req.currentCustomer.profile.firstName,
            sidebarNewsletterEnabled: sidebarNewsletterEnabled,
            breadcrumbs: [
                {
                    htmlValue: Resource.msg('global.home', 'common', null),
                    url: URLUtils.home().toString()
                },
                {
                    htmlValue: Resource.msg('page.title.myaccount', 'account', null),
                    url: URLUtils.url('Account-Show').toString()
                }, {
                    htmlValue: Resource.msg('dashboadcards.email.title', 'account', null)
                }
            ]
        });
        next();
    }
);

server.append(
    'EditPassword',
    server.middleware.https,
    csrfProtection.generateToken,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var context = res.getViewData();
        var seoFactory = require('../scripts/seo/seoFactory');
        var pageTitle = seoFactory.create('META_TITLE', context, req, res);
        req.pageMetaData.setTitle(pageTitle);
        res.render('account/password', {
            editPasswordClass: ' active'
        });
        next();
    }
);

server.get('Wishlist', server.middleware.https, googleTagManager.createDataLayer, function (req, res, next) {
    var PAGE_SIZE_ITEMS = 100;

    var productListHelper = require('*/cartridge/scripts/productList/productListHelpers');
    var list = productListHelper.getList(req.currentCustomer.raw, { type: 10 });
    productListHelper.updateQuantityCookie(req, res, list.items.length);
    var WishlistModel = require('*/cartridge/models/productList');
    var loggedIn = req.currentCustomer.profile;

    var profileForm = server.forms.getForm('profile');
    profileForm.clear();

    var priceHelper = require('*/cartridge/scripts/helpers/pricing');
    priceHelper.setApplicablePricebooks();

    var wishlistModel = new WishlistModel(
        list,
        {
            type: 'wishlist',
            publicView: false,
            pageSize: PAGE_SIZE_ITEMS,
            pageNumber: 1
        },
        req.locale.id
    ).productList;

    var context = res.getViewData();
    var seoConst = require('../scripts/seo/constants');
    var seoFactory = require('../scripts/seo/seoFactory');
    var pageTitle = seoFactory.create('META_TITLE', context, req, res);
    req.pageMetaData.setTitle(pageTitle);

    var isAjax = Object.hasOwnProperty.call(req.httpHeaders, 'x-requested-with') && req.httpHeaders['x-requested-with'] === 'XMLHttpRequest';
    var renderTemplate = isAjax ? 'account/wishlistItems' : 'account/wishlist';
    res.render(renderTemplate, {
        wishListClass: ' active',
        breadcrumbs: [{
            htmlValue: Resource.msg('global.home', 'common', null),
            url: URLUtils.home().toString()
        }, {
            htmlValue: Resource.msg('page.title.myaccount', 'account', null),
            url: URLUtils.url('Account-Show').toString()
        }, {
            htmlValue: Resource.msg('dashboadcards.wishlist.title', 'account', null)
        }],
        wishlist: wishlistModel,
        loggedIn: loggedIn,
        robots: seoConst.META_ROBOTS_NOINDEX_NOFOLLOW
    });
    next();
});

server.get('TrainerLicense',
    server.middleware.https,
    function (req, res, next) {
        if (Site.current.getCustomPreferenceValue('coachProgramEnabled')) {
            var seoConst = require('../scripts/seo/constants');
            if (!req.currentCustomer.profile) {
                res.redirect(URLUtils.url('Login-Show'));
            }

            var viewData = {
                trainerLicenseClass: ' active',
                breadcrumbs: [{
                    htmlValue: Resource.msg('global.home', 'common', null),
                    url: URLUtils.home().toString()
                }, {
                    htmlValue: Resource.msg('page.title.myaccount', 'account', null),
                    url: URLUtils.url('Account-Show').toString()
                }, {
                    htmlValue: Resource.msg('dashboadcards.trainerlogin.title', 'account', null)
                }],
                error: false,
                success: false,
                hasUploadedLicense: false,
                robots: seoConst.META_ROBOTS_NOINDEX_NOFOLLOW
            };

            var customerProfile = req.currentCustomer.raw.profile;
            if (customerProfile.custom.trainerLicenseUploaded && customerProfile.custom.trainerLicenseUploadDateTime) {
                viewData.trainerLicenseUploadDate = getLocalizedDisplayDateTime(customerProfile.custom.trainerLicenseUploadDateTime);
                viewData.hasUploadedLicense = true;
            }

            var context = res.getViewData();
            var seoFactory = require('../scripts/seo/seoFactory');
            var pageTitle = seoFactory.create('META_TITLE', context, req, res);
            req.pageMetaData.setTitle(pageTitle);

            res.render('account/trainerlicense', viewData);
        } else {
            res.redirect(URLUtils.home());
        }
        next();
    }
);

server.post('UploadTrainerLicense',
    server.middleware.https,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var File = require('dw/io/File');

        var files = request.httpParameterMap.processMultipart(function (field, contentType, fileName) {
            if (fileName == null || fileName === '') {
                return null;
            }
            return new File([File.TEMP, '/', fileName].join(''));
        });

        var viewData = {
            trainerLicenseClass: ' active',
            breadcrumbs: [{
                htmlValue: Resource.msg('global.home', 'common', null),
                url: URLUtils.home().toString()
            }, {
                htmlValue: Resource.msg('page.title.myaccount', 'account', null),
                url: URLUtils.url('Account-Show').toString()
            }, {
                htmlValue: Resource.msg('dashboadcards.trainerlogin.title', 'account', null)
            }]
        };

        // check for file ...
        if (files.length === 0) {
            viewData.error = true;
            viewData.errorType = 'no-file';
            res.render('account/trainerlicense', viewData);
            return next();
        }

        // check for a max file size of 2250000 Bytes (2.25 MB)
        //
        // There is an enforced quota limit 'api.dw.io.StringWriter.length' of 5000000
        // Then there is a max limit of rendered templates of 3 MB
        // -> as file data will be base64 encoded for mail attachments, the effective allowed file size is approximatly (3 MB / 4 * 3)
        var fileSize = files.licenseFile.length();
        if (fileSize > 2250000) {
            viewData.error = true;
            viewData.errorType = 'file-size';
            res.render('account/trainerlicense', viewData);
            deleteLicenseFiles(files);
            return next();
        }

        // send email with attachment
        var customer = req.currentCustomer;
        sendTrainerLicenseEmail(files, customer);

        // delete license file
        deleteLicenseFiles(files);

        Transaction.wrap(function () {
            // update profile
            customer.raw.profile.custom.trainerLicenseUploaded = true;
            customer.raw.profile.custom.trainerLicenseUploadDateTime = new Date();

            // put customer into silver customer group
            var groupToAssign = CustomerMgr.getCustomerGroup('SilverCustomers');
            if (groupToAssign != null && !customer.raw.isMemberOfCustomerGroup(groupToAssign)) {
                groupToAssign.assignCustomer(customer.raw);
            }
        });

        // render response
        viewData.success = true;
        viewData.error = false;
        var customerProfile = customer.raw.profile;
        if (customerProfile.custom.trainerLicenseUploaded && customerProfile.custom.trainerLicenseUploadDateTime) {
            viewData.trainerLicenseUploadDate = getLocalizedDisplayDateTime(customerProfile.custom.trainerLicenseUploadDateTime);
            viewData.hasUploadedLicense = true;
        }
        res.render('account/trainerlicense', viewData);
        return next();
    }
);

server.append('Show',
    server.middleware.https,
    userLoggedIn.validateLoggedIn,
    googleTagManager.createDataLayer,
    function (req, res, next) {
        var wishListAccount = require('*/cartridge/models/account/wishListAccount');
        var productListMgr = require('dw/customer/ProductListMgr');
        var viewData = res.getViewData();
        var birthday = null;

        if (viewData && req.currentCustomer.profile) {
            var profile = req.currentCustomer.profile;
            viewData.firstName = profile.firstName;
            res.setViewData(viewData);
        }

        if (viewData && req.currentCustomer.raw && req.currentCustomer.raw.profile) {
            birthday = req.currentCustomer.raw.profile.birthday;
        }

        var context = res.getViewData();
        var seoFactory = require('../scripts/seo/seoFactory');
        var pageTitle = seoFactory.create('META_TITLE', context, req, res);
        req.pageMetaData.setTitle(pageTitle);

        res.setViewData({
            account: viewData.account,
            birthday: birthday,
            breadcrumbs: [{
                htmlValue: Resource.msg('global.home', 'common', null),
                url: URLUtils.home().toString()
            }, {
                htmlValue: Resource.msg('page.title.myaccount', 'account', null),
                url: URLUtils.url('Account-Show').toString()
            }]
        });

        var apiWishlist = productListMgr.getProductLists(req.currentCustomer.raw, '10');
        if (apiWishlist.length > 0) {
            wishListAccount(viewData.account, apiWishlist[0]);
            res.setViewData({
                wishlist: {
                    UUID: apiWishlist[0].ID
                }
            });
        }

        next();
    }
);

server.post('SaveEmail',
    server.middleware.https,
    function (req, res, next) {
        var formErrors = {};

        var profileForm = server.forms.getForm('profile');
        var newEmails = profileForm.customer.newEmails;

        // form validation
        if (newEmails.newemail.value !== newEmails.newemailconfirm.value) {
            profileForm.valid = false;
            formErrors[profileForm.customer.newEmails.newemail.htmlName] = { class: ' is-invalid' };
            formErrors[profileForm.customer.newEmails.newemailconfirm.htmlName] = { class: ' is-invalid' };
            formErrors.msg = Resource.msg('edit.email.mismatch.error', 'account', null);
        }

        if (profileForm.valid) {
            res.setViewData({
                newEmail: newEmails.newemail.value,
                newEmailConfirm: newEmails.newemailconfirm.value,
                profileForm: profileForm
            });
            this.on('route:BeforeComplete', function () { // eslint-disable-line no-shadow
                var formInfo = res.getViewData();
                var customer = CustomerMgr.getCustomerByCustomerNumber(req.currentCustomer.profile.customerNo);
                var setLoginStatus = null;
                var setEmailStatus = null;

                if (!customer.profile.credentials.login.equalsIgnoreCase(formInfo.profileForm.customer.email.value)) {
                    profileForm.valid = false;
                    formErrors[profileForm.customer.email.htmlName] = { class: ' is-invalid', msg: Resource.msg('edit.email.mismatch.error', 'account', null) };
                }
                if (profileForm.valid) {
                    Transaction.wrap(function () {
                        setLoginStatus = customer.profile.credentials.setLogin(formInfo.newEmail);
                        setEmailStatus = customer.profile.setEmail(formInfo.newEmail);
                    });
                    if (setLoginStatus || setEmailStatus) {
                        profileForm.valid = false;
                        formErrors[profileForm.customer.email.htmlName] = { msg: Resource.msg('edit.email.status.error', 'account', null) };
                    }
                    session.custom.messages = null; // eslint-disable-line
                    res.redirect(URLUtils.url('Account-EditEmail', 'email_success', 'true'));
                } else {
                    session.custom.messages = JSON.stringify(formErrors); // eslint-disable-line
                    res.redirect(URLUtils.url('Account-EditEmail'));
                }
            });
        } else {
            session.custom.messages = JSON.stringify(formErrors); // eslint-disable-line
            res.redirect(URLUtils.url('Account-EditEmail'));
        }
        return next();
    }
);

server.get(
    'Register',
    server.middleware.https,
    csrfProtection.generateToken,
    function (req, res, next) {
        res.redirect(URLUtils.url('Login-Show'));
        return next();
    }
);

server.replace(
    'Login',
    server.middleware.https,
    googleTagManager.createDataLayer,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var BasketMgr = require('dw/order/BasketMgr');
        var email = req.form.loginEmail;
        var password = req.form.loginPassword;
        var giftCardHelpers = require('app_storefront_common/cartridge/scripts/helpers/giftCardHelpers.js');
        var rememberMe = req.form.loginRememberMe
            ? (!!req.form.loginRememberMe)
            : false;
        var authenticatedCustomer;
        var checkoutLogin = req.querystring.checkoutLogin;

        // Retrieve Customer By Login
        var customer = CustomerMgr.getCustomerByLogin(email);
        if (customer === null) {
            res.json({ error: [Resource.msg('error.message.login.form', 'login', null)] });
        } else {
            try {
                if (customer.profile.custom.oxidMigrated === false) {
                    var hash = Helper.calculateOxidHash(password, customer.profile.custom.oxidSalt, customer.profile.custom.oxidHash.length > 32);
                    logger.info('Calculated hash value for user \'' + email + '\' = ' + hash);
                    if (hash === customer.profile.custom.oxidHash) {
                        var isSuccess = Helper.setPassword(customer, password);
                        var Status = require('dw/system/Status');

                        if (isSuccess === Status.OK) {
                            Transaction.wrap(function () {
                                customer.profile.custom.oxidMigrated = true;
                            });
                        }
                    }
                }
            } catch (err) {
                logger.error('OXID Logging Error: ' + err);
            }

            // store all the related GC information
            var basketBeforeLogin = BasketMgr.getCurrentBasket();
            var giftCardsToReapply = [];
            if (basketBeforeLogin) {
                var gcPaymentInstruments = basketBeforeLogin.getPaymentInstruments(giftCardHelpers.GIFT_CARD_PAYMENT_METHOD_ID);
                for (var i = 0; i < gcPaymentInstruments.length; i += 1) {
                    giftCardsToReapply.push({
                        giftCardCode: gcPaymentInstruments[i].custom.GiftCertificateCode,
                        amount: gcPaymentInstruments[i].paymentTransaction.amount
                    });
                }
            }

            authenticatedCustomer = Helper.authenticateUser(email, password, rememberMe);
            if (authenticatedCustomer && authenticatedCustomer.authenticated) {
                res.setViewData({ authenticatedCustomer: authenticatedCustomer });
                var accountHelper = require('app_storefront_common/cartridge/scripts/account/accountHelper.js');

                var currentBasket = BasketMgr.getCurrentBasket();
                if (currentBasket) {
                    accountHelper.useCustomerAddressInBasket(currentBasket, authenticatedCustomer);
                    // reapply giftcards after authentication
                    Transaction.wrap(function () {
                        for (var x = 0; x < giftCardsToReapply.length; x += 1) {
                            var newPaymentInstrument = currentBasket.createPaymentInstrument(giftCardHelpers.GIFT_CARD_PAYMENT_METHOD_ID, giftCardsToReapply[x].amount);
                            newPaymentInstrument.custom.GiftCertificateCode = giftCardsToReapply[x].giftCardCode;
                        }
                    });
                }

                req.session.privacyCache.set('checkoutLoginDone', true);

                res.json({
                    success: true,
                    redirectUrl: checkoutLogin
                        ? URLUtils.url('Checkout-PaymentPage').toString()
                        : URLUtils.url('Account-Show').toString()
                });
            } else {
                res.json({ error: [Resource.msg('error.message.login.form', 'login', null)] });
            }
        }
        return next();
    }
);

server.prepend('Login', function (req, res, next) {
    var viewData = res.getViewData();
    var productListHelper = require('*/cartridge/scripts/productList/productListHelpers');
    var list = productListHelper.getList(req.currentCustomer.raw, { type: 10 });
    viewData.list = list;
    res.setViewData(viewData);
    next();
});

server.append('Login', function (req, res, next) {
    var viewData = res.getViewData();
    var listGuest = viewData.list;
    if (viewData.authenticatedCustomer) {
        var productListHelper = require('*/cartridge/scripts/productList/productListHelpers');
        var listLoggedIn = productListHelper.getList(viewData.authenticatedCustomer, { type: 10 });
        var rememberMe = req.form.loginRememberMe
            ? (!!req.form.loginRememberMe)
            : false;
        productListHelper.mergelists(listLoggedIn, listGuest, req, { type: 10 });
        // provide rememberMe status from request because dwcustomer cookie isn't updated yet
        productListHelper.updateQuantityCookie(req, res, listLoggedIn.items.length, rememberMe);
    }
    session.privacy.promoCache = null; // eslint-disable-line
    var priceHelper = require('*/cartridge/scripts/helpers/pricing');
    // Set applicable Pricebooks
    priceHelper.setApplicablePricebooks();
    next();
});

// Added functionality to the Login that triggers BonusProduct promotion by attaching the bonus to a ProductLineItem from the cart
server.append('Login', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();

    if (currentBasket) {
        var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
        var collections = require('*/cartridge/scripts/util/collections');

        var bonusDiscountLineItemCount = currentBasket.bonusDiscountLineItems.length;
        var productLineItems = currentBasket.productLineItems;
        var productLineItemToAttachBonus = collections.first(productLineItems);

        Transaction.wrap(function () {
            var previousBonusDiscountLineItems = collections.map(currentBasket.bonusDiscountLineItems, function (bonusDiscountLineItem) {
                return bonusDiscountLineItem.UUID;
            });

            basketCalculationHelpers.calculateTotals(currentBasket);
            if (currentBasket.bonusDiscountLineItems.length > bonusDiscountLineItemCount) {
                var prevItems = JSON.stringify(previousBonusDiscountLineItems);

                collections.forEach(currentBasket.bonusDiscountLineItems, function (bonusDiscountLineItem) {
                    if (prevItems.indexOf(bonusDiscountLineItem.UUID) < 0) {
                        bonusDiscountLineItem.custom.bonusProductLineItemUUID = productLineItemToAttachBonus.UUID; // eslint-disable-line no-param-reassign
                        productLineItemToAttachBonus.custom.bonusProductLineItemUUID = 'bonus';
                        productLineItemToAttachBonus.custom.preOrderUUID = productLineItemToAttachBonus.UUID;
                    }
                });
            }
        });
    }
    next();
});

server.replace(
    'SubmitRegistration',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    captchaHelper.validTokenCustomerRegistration,
    function (req, res, next) {
        if (res.viewData.captchaerror === true) {
            next();
            return;
        }
        var formErrors = require('*/cartridge/scripts/formErrors');
        var registrationForm = server.forms.getForm('profile');
        var accountHelper = require('app_storefront_common/cartridge/scripts/account/accountHelper.js');

        // form validation
        if (registrationForm.customer.email.value.toLowerCase()
            !== registrationForm.customer.emailconfirm.value.toLowerCase()
        ) {
            registrationForm.customer.email.valid = false;
            registrationForm.customer.emailconfirm.valid = false;
            registrationForm.customer.emailconfirm.error =
                Resource.msg('error.message.mismatch.email', 'forms', null);
            registrationForm.valid = false;
        }

        if (registrationForm.login.password.value
            !== registrationForm.login.passwordconfirm.value
        ) {
            registrationForm.login.password.valid = false;
            registrationForm.login.passwordconfirm.valid = false;
            registrationForm.login.passwordconfirm.error =
                Resource.msg('error.message.mismatch.password', 'forms', null);
            registrationForm.valid = false;
        }

        if (!CustomerMgr.isAcceptablePassword(registrationForm.login.password.value)) {
            registrationForm.login.password.valid = false;
            registrationForm.login.passwordconfirm.valid = false;
            registrationForm.login.passwordconfirm.error =
                Resource.msg('error.message.password.constraints.not.matched', 'forms', null);
            registrationForm.valid = false;
        }

        // setting variables for the BeforeComplete function
        var registrationFormObj = {
            firstName: registrationForm.customer.firstname.value,
            lastName: registrationForm.customer.lastname.value,
            phone: registrationForm.customer.phone.value,
            email: registrationForm.customer.email.value,
            emailConfirm: registrationForm.customer.emailconfirm.value,
            password: registrationForm.login.password.value,
            passwordConfirm: registrationForm.login.passwordconfirm.value,
            validForm: registrationForm.valid,
            form: registrationForm
        };

        if (
            empty(registrationFormObj.firstName) || // eslint-disable-line
            empty(registrationFormObj.lastName) // eslint-disable-line
        ) {
            registrationForm.valid = false;
        }
        if (registrationForm.valid) {
            res.setViewData(registrationFormObj);

            this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
                // getting variables for the BeforeComplete function
                var registrationForm = res.getViewData(); // eslint-disable-line
                var newCustomer = null;

                if (registrationForm.validForm) {
                    var login = registrationForm.email;
                    var password = registrationForm.password;
                    var authenticatedCustomer;

                    // attempt to create a new user and log that user in.
                    try {
                        Transaction.wrap(function () {
                            newCustomer = CustomerMgr.createCustomer(login, password);

                            if (newCustomer) {
                                // assign values to the profile
                                var newCustomerProfile = newCustomer.getProfile();
                                newCustomerProfile.salutation = registrationForm.form.customer.salutation.value;
                                newCustomerProfile.gender = newCustomerProfile.salutation;
                                newCustomerProfile.firstName = registrationForm.firstName;
                                newCustomerProfile.lastName = registrationForm.lastName;
                                newCustomerProfile.phoneHome = registrationForm.phone;
                                newCustomerProfile.email = registrationForm.email;

                                var authenticateStatus = CustomerMgr.authenticateCustomer(login, password);
                                authenticatedCustomer = CustomerMgr.loginCustomer(authenticateStatus, false);
                                if (authenticatedCustomer.authenticated === false) {
                                    registrationForm.validForm = false;
                                    registrationForm.form.customer.email.valid = false;
                                    registrationForm.form.customer.emailconfirm.valid = false;
                                }
                            }
                        });
                    } catch (e) {
                        registrationForm.validForm = false;
                        registrationForm.form.customer.email.valid = false;
                        registrationForm.form.customer.email.error =
                            Resource.msg('error.message.username.invalid', 'forms', null);
                    }
                }

                if (registrationForm.form.customer.newsletter && registrationForm.form.customer.newsletter.checked) {
                    var newsletterHelper = require('app_storefront_common/cartridge/scripts/newsletterHelper.js');
                    var newsletterForm = newsletterHelper.generateFormFromRegister(registrationForm.form);
                    if (newsletterForm != null) {
                        newsletterHelper.subscribe(newsletterForm, 'FORM_ACCOUNT', 1);
                    }
                }

                delete registrationForm.password;
                delete registrationForm.passwordConfirm;
                formErrors.removeFormValues(registrationForm.form);

                if (registrationForm.validForm) {
                    req.session.privacyCache.set('checkoutLoginDone', true);
                    res.setViewData({ authenticatedCustomer: authenticatedCustomer }); // eslint-disable-line
                    res.json({
                        success: true,
                        redirectUrl: URLUtils.url('Account-Show',
                            'registration', 'submitted'
                        ).toString()
                    });
                    accountHelper.sendConfirmationEmail(newCustomer, req.host);
                } else {
                    res.json({
                        fields: formErrors.getFormErrors(registrationFormObj)
                    });
                }
            });
        } else {
            res.json({
                fields: formErrors.getFormErrors(registrationFormObj)
            });
        }

        next();
    }
);

server.prepend('SubmitRegistration', function (req, res, next) {
    var viewData = res.getViewData();
    var productListHelper = require('*/cartridge/scripts/productList/productListHelpers');
    var list = productListHelper.getList(req.currentCustomer.raw, { type: 10 });
    viewData.list = list;
    res.setViewData(viewData);
    next();
});

server.append('SubmitRegistration', function (req, res, next) {
    this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
        var viewData = res.getViewData();
        var listGuest = viewData.list;
        if (viewData.authenticatedCustomer) {
            var productListHelper = require('*/cartridge/scripts/productList/productListHelpers');
            var listLoggedIn = productListHelper.getList(viewData.authenticatedCustomer, { type: 10 });
            productListHelper.mergelists(listLoggedIn, listGuest, req, { type: 10 });

            // Added functionality to the Registration that triggers BonusProduct promotion by attaching the bonus to a ProductLineItem from the cart
            var BasketMgr = require('dw/order/BasketMgr');
            var currentBasket = BasketMgr.getCurrentBasket();

            if (currentBasket) {
                var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
                var collections = require('*/cartridge/scripts/util/collections');

                var bonusDiscountLineItemCount = currentBasket.bonusDiscountLineItems.length;
                var productLineItems = currentBasket.productLineItems;
                var productLineItemToAttachBonus = collections.first(productLineItems);

                Transaction.wrap(function () {
                    var previousBonusDiscountLineItems = collections.map(currentBasket.bonusDiscountLineItems, function (bonusDiscountLineItem) {
                        return bonusDiscountLineItem.UUID;
                    });

                    basketCalculationHelpers.calculateTotals(currentBasket);
                    if (currentBasket.bonusDiscountLineItems.length > bonusDiscountLineItemCount) {
                        var prevItems = JSON.stringify(previousBonusDiscountLineItems);

                        collections.forEach(currentBasket.bonusDiscountLineItems, function (bonusDiscountLineItem) {
                            if (prevItems.indexOf(bonusDiscountLineItem.UUID) < 0) {
                                bonusDiscountLineItem.custom.bonusProductLineItemUUID = productLineItemToAttachBonus.UUID; // eslint-disable-line no-param-reassign
                                productLineItemToAttachBonus.custom.bonusProductLineItemUUID = 'bonus';
                                productLineItemToAttachBonus.custom.preOrderUUID = productLineItemToAttachBonus.UUID;
                            }
                        });
                    }
                });
            }
        }
    });
    next();
});

server.replace(
    'SetNewPassword',
    server.middleware.https,
    googleTagManager.createDataLayer,
    function (req, res, next) {
        var passwordForm = server.forms.getForm('newPasswords');
        passwordForm.clear();
        var token = req.querystring.token;
        var resettingCustomer = CustomerMgr.getCustomerByToken(token);
        if (!resettingCustomer) {
            res.redirect(URLUtils.url('Account-PasswordReset'));
        } else {
            res.render('account/password/newPassword', {
                passwordForm: passwordForm,
                token: token,
                breadcrumbs: [
                    {
                        htmlValue: Resource.msg('global.home', 'common', null),
                        url: URLUtils.home().toString()
                    },
                    {
                        htmlValue: Resource.msg('label.profile.resetpassword', 'account', null)
                    }
                ]
            });
        }
        next();
    }
);

server.replace('Header', server.middleware.include, function (req, res, next) {
    var currentSite = Site.getCurrent();
    var template;
    var brands = require('*/cartridge/config/brands.json');
    var qs = req.querystring;
    var allowedCurrencies = currentSite.allowedCurrencies;
    var allowedLocales = currentSite.allowedLocales;

    var params = {
        username: req.currentCustomer.profile ? req.currentCustomer.profile.firstName : null,
        brand: brands[currentSite.ID].brand,
        mobile: qs.mobile || false,
        // login modal only available on GET requests, except for the login page
        noLoginModal: qs.noLoginModal === 'true'
    };

    if (qs.mobile) {
        template = 'account/mobileHeader';
        params.loadLanguages = allowedLocales.size() > 1 || false;
        if (params.loadLanguages) {
            params.languageUrl = URLUtils.url('Page-LoadFlyoutSwitch', 'type', 'language', 'mobile', 'true').toString();
        }

        params.loadCurrencies = allowedCurrencies.size() > 1 || false;
        if (params.loadCurrencies) {
            params.currencyUrl = URLUtils.url('Page-LoadFlyoutSwitch', 'type', 'currency', 'mobile', 'true').toString();
        }

        params.loadShipTo = !customer.isMemberOfCustomerGroup('BusinessCustomers') && (Site.getCurrent().ID === 'JPO-COM' || Site.getCurrent().ID === 'TPO-COM' || Site.getCurrent().ID === 'ITF-COM' || Site.getCurrent().ID === 'PPO-COM');
        if (params.loadShipTo && session.custom.shipTo) {
            var shipToCountries = require('*/cartridge/config/shiptoCountries.json');
            var selectedValue = session.custom.shipTo.split('_')[0];
            var selectedCountry = shipToCountries[selectedValue];
            selectedCountry.id = selectedValue;
            params.shipToUrl = URLUtils.url('Page-LoadMobileShipToCountries', 'selectedCountry', JSON.stringify(selectedCountry)).toString();
        } else {
            params.shipToUrl = URLUtils.url('Page-LoadMobileShipToCountries').toString();
        }
    } else {
        template = 'account/header';
    }

    res.render(template, params);
    next();
});

server.get('DeleteCustomerAccount', server.middleware.https,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var context = res.getViewData();
        var seoFactory = require('../scripts/seo/seoFactory');
        var pageTitle = seoFactory.create('META_TITLE', context, req, res);
        req.pageMetaData.setTitle(pageTitle);
        res.render('account/deleteAccount', {
            deleteAccountClass: ' active'
        });
        next();
    }
);

server.get('Delete',
    server.middleware.https,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var customer = req.currentCustomer.raw.profile;
        var OrderMgr = require('dw/order/OrderMgr');
        var Order = require('dw/order/Order');
        var canCustomerBeDeleted = true;
        var hasOrdersWithStatusCreated = false;
        /**
         * Because we have to delete the account only if it does not have open orders, we first
         * search for orders with status NEW, OPEN or CREATED.
         * CREATED orders are automatically open orders beacause the transaction is not achived yet
         * For OPEN and NEW orders, we must check if they are paid and shipped
         */
        var customerOrders = OrderMgr.searchOrders('customerNo = {0} AND (status = {1} OR status = {2} OR status = {3})',
                                null, customer.customerNo, Order.ORDER_STATUS_NEW, Order.ORDER_STATUS_OPEN, Order.ORDER_STATUS_CREATED);

        var result = { success: false };

        while (customerOrders.hasNext()) {
            var order = customerOrders.next();
            if (order.status.value === Order.ORDER_STATUS_CREATED) {
                /**
                 * If the order has the status CREATED, then the account can not be deleted and we do not have to continue with the
                 * next iterations
                */
                canCustomerBeDeleted = false;
                hasOrdersWithStatusCreated = true;
                break;
            }
            if (order.paymentStatus.value !== Order.PAYMENT_STATUS_PAID || order.shippingStatus.value !== Order.SHIPPING_STATUS_SHIPPED) {
                /**
                 * If we found an order which is not paid or not shipped, then the account can not be deleted
                 */
                canCustomerBeDeleted = false;
                break;
            }
        }
        if (!canCustomerBeDeleted && hasOrdersWithStatusCreated) {
            result.modalTitle = Resource.msg('error.generic', 'address', null);
            result.message = Resource.msg('label.modal.delete.account.error.createdorders', 'account', null);
        } else if (!canCustomerBeDeleted) {
            result.modalTitle = Resource.msg('error.generic', 'address', null);
            result.message = Resource.msg('label.modal.delete.account.error.openorders', 'account', null);
        } else {
            /**
             * If the account can be deleted, we will first logout the user, then we trigger the
             * delete action. After that we sen an Email notifiacation
             */
            Transaction.wrap(function () {
                // Prepare Email
                var Mail = require('dw/net/Mail');
                var Template = require('dw/util/Template');
                var HashMap = require('dw/util/HashMap');
                var customerServiceEmail = Site.getCurrent().getCustomPreferenceValue('deleteAccountNotificationEmail');
                var senderEmail = Site.getCurrent().getCustomPreferenceValue('deleteAccountSenderEmail');
                var template = new Template('account/deleteAccountEmail');

                var context = new HashMap();
                context.put('firstName', customer.firstName);
                context.put('lastName', customer.lastName);
                context.put('email', customer.email);
                context.put('siteID', Site.getCurrent().ID);

                if ('sapCustNo' in customer.custom && customer.custom.sapCustNo) {
                    context.put('SAPcustomerID', customer.custom.sapCustNo);
                }

                context.put('acpCoach', 'No');
                if ('acpCoach' in customer.custom && customer.custom.acpCoach) {
                    context.put('acpCoach', 'Yes');
                }

                var notificationEmail = new Mail();
                notificationEmail.addTo(customerServiceEmail);
                notificationEmail.setSubject('Customer Account deleted!');
                notificationEmail.setFrom(senderEmail);

                // Delete Customer
                CustomerMgr.removeCustomer(customer.customer);
                CustomerMgr.logoutCustomer(false);

                // Send Email
                var content = template.render(context).text;
                notificationEmail.setContent(content, 'text/html', 'UTF-8');
                notificationEmail.send();

                result.success = true;
                result.redirectURL = URLUtils.url('Home-Show').toString();
            });
        }
        res.json(result);
        next();
    }
);

module.exports = server.exports();
