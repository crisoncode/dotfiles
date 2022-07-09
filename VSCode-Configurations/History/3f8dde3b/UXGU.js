'use strict';

import Swiper from 'swiper';
// import 'swiper/swiper.min.css';


const SELECTORS = {
    gallery: {
        containerSelector: '.gallery-container-js'
    }
};

/**
 * Initializes gallery slider
 */
function initSwiper() {
    // eslint-disable-next-line no-unused-vars
    const swiper = new Swiper(SELECTORS.gallery.containerSelector, {
        // Optional parameters
        loop: true
    });
}

const build = () => {
    console.log('method for build gallery fired, testing properties of the component -->' + SELECTORS.gallery.containerSelector);

    initSwiper();
};


module.exports = {
    build: build
};
