'use strict';

var server = require('server');

server.get('Init', function (req, res, next) {
    var Logger = require('dw/system/Logger');
    var qs = req.querystring;
    var cartridgeName = qs.cartridge;
    var packageJsonConfig = require(cartridgeName + '/package.json');
    var addonid = qs.id;
    var resources = {};
    try {
        var addonsConfig = packageJsonConfig.addons;
        var URLUtils = require('dw/web/URLUtils');
        if (addonsConfig) {
            for (var elmIndex = 0; elmIndex < addonsConfig.length; elmIndex++) {
                var element = addonsConfig[elmIndex];
                if (element.id === addonid) {
                    var cartridge = element.cartridge;
                    var cnfg = require(cartridge + '/package.json');
                    for (var urlElmIndex = 0; urlElmIndex < cnfg.addonsresources.urls.length; urlElmIndex++) {
                        var urlElement = cnfg.addonsresources.urls[urlElmIndex];
                        resources[urlElement.id] = URLUtils.url(urlElement.route).toString();
                    }
                }
            }
        }
    } catch (e) {
        var log = Logger.getLogger('common-cartridge');
        log.error(e);
    }
    res.render('addons', {
        resources: JSON.stringify(resources)
    });
    next();
});

module.exports = server.exports();
