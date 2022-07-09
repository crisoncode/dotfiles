require('../thirdParty/jquery.cloudzoom');
require('../thirdParty/jquery.bxslider');
const deviceDetection = require('../components/deviceDetection');
const GalleryItem = require('../thirdParty/jquery.tp_zoom');
const PhotoSwipe = require('../thirdParty/photoswipe');
const PhotoSwipeUIDefault = require('../thirdParty/photoswipe-ui-default');
console.log('hello world');

const openPhotoSwipe = function () {
    const pswpElement = document.querySelectorAll('.pswp')[0];
    let activeProduct = 0;
    console.log('hello world 2');

    // build items array
    let items = $('.js-product-picture-box ul li a ').map((k, v) => {
        if ($(v).closest('li').attr('aria-hidden') === 'false') {
            activeProduct = k;
        }
        return {
            src: $(v).attr('href'),
            w: 2000,
            h: 2000
        };
    }).get();

    // define options (if needed)
    const options = {
        index: activeProduct,
        showAnimationDuration: 0,
        hideAnimationDuration: true,
        showHideOpacity: false,
        bgOpacity: 1,
        preload: [1, 3]
    };

    const gallery = new PhotoSwipe(pswpElement, PhotoSwipeUIDefault, items, options);
    gallery.init();
};

const createImageGallery = function () {
    const sm = window.matchMedia('(min-width: 544px)');
    const pagerThumbnails = '#morePicsContainer';
    const productPicturebox = '.productPicturebox';
    const galleryItems = $(productPicturebox + ' li');
    console.log('hello world 3');
    // Clone productPicturebox an show zoom icon
    if (deviceDetection.isMobileAgent) {
        $('.js-icon-zoom-in').show();
        $('.js-open-modal-photo-swipe').on('click', openPhotoSwipe);
    }

    let showMainPics = function (elem) {
        const sliderConfig = {
            infiniteLoop: galleryItems.length > 1,
            oneToOneTouch: galleryItems.length > 1,
            pagerCustom: pagerThumbnails,
            nextText: '<i class="icon icon-angle-right"></i>',
            prevText: '<i class="icon icon-angle-left"></i>'
        };
        if (sm.matches) {
            sliderConfig.slideWidth = 600;
        }

        $(elem).children('ul').bxSlider(sliderConfig);
        if (galleryItems.length > 0 && sm.matches === true) {
            var galleryItemHandles = [];
            for (var i = 0; i < galleryItems.length; i++) {
                var galleryItem = new GalleryItem(galleryItems[i]);
                if (!deviceDetection.isMobileAgent) {
                    galleryItem.getZoomItem().bind('mouseover.GalleryItem', galleryItem.startZoom);
                }
                galleryItemHandles.push(galleryItem);
            }
        }
    };
    showMainPics('.productPicturebox');

    // open video tab, if click on video thumb
    $(pagerThumbnails + ' .videoicon').click(function () {
        setTimeout(
            function () {
                $('html, body').animate({
                    scrollTop: $('#tabHeadVideo').offset().top
                }, 1000);
            },
            200);
    });
};

module.exports = {
    createImageGallery
};
