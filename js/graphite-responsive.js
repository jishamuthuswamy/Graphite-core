/*!
 * Graphite Responsive Helper Extension
 * http://graphite.github.io ( maybe )
 *
 * Copyright 2014, LBi Denmark
 *
 * @author Rasmus Bangsted Pedersen <rasmus.pedersen@lbi.com> | <rasmusbangsted@gmail.com>
 *
 */

( function (root, extension) {

    // Shukri Adams, 10-3-15 : I had to bypass the use of both define and require here as both were throwing errors which
    // were preventing the use of Graphite. I recommend refactoring all Graphite parts so they are wrapped in
    // an outer require, it would greatly simplify module structure and prevent these require issues.
    if (Graphite) {
        return extension();
    }
	/*
	 * Expose either as AMD module and handle dependency feedback
	 */
	if (typeof define === "function" && define.amd) {

		define('graphite', [], function () {
			return extension()
		});

	} else {
		return extension();
	}

}(window, function () {

	'use strict';

	/*
	 * Failsafe
	 */
	if ( !G ) return window.console ? console.warn('Graphite Core is not available!') : false;

	// //////////////////////////////////////////////////////////////////////////
	// Private methods & values
	// //////////////////////////////////////////////////////////////////////////
	var w = window,
		$ = window.jQuery,
		_el = G.query('[data-response]'),
		_stateMap = {
			small:'small',
			medium: 'medium',
			large: 'large'
		},
		_options = {},
		_notify = function ( event, data ) {
			if (G.has.pubsub) {
				return G.pubsub.notify(event, data);
			}
		},
		_debounce = function ( fn ) {
			if (G.has.utilities) {
				return G.utils.debounce(fn, 300);
			} else {
				return fn;
			}
		},
		_indicatorEl,
		/**
		 * Creates a pseudo element that uses :before content
		 * to "return" the media query defined in the CSS
		 * - small
		 * - medium
		 * - large
		 * This way we control the media queries solely from CSS
		 * @private
		 */
		_createIndicatorEl = function () {
			_indicatorEl = document.createElement('div');
			_indicatorEl.className = 'js-match-media';
			document.body.appendChild(_indicatorEl);
		},
		/**
		 * Returns the currently matched media
		 * - small
		 * - medium
		 * - large
		 * @returns {string}
		 * @private
		 */
		_getState = function () {
			if (  window.getComputedStyle && G.is.ie() > 8) {
				return window.getComputedStyle(
					_indicatorEl, ':before'
				).getPropertyValue('content').replace(/\"/g, '').replace(/\'/g, '');
			} else {
				return 'large';
			}
		},
		/**
		 * Get elements based on current media state
		 * and return and object of those
		 * @private
		 */
		_getElements = function () {
			var obj = {};

			G.each(_el, function ( el ) {
				var attr = G.primitives( el.getAttribute( 'data-response' ));
				if ( attr ) {
					G.each(attr.split(" "), function( state ) {
						if ( !obj[state] ) {
							obj[state] = [];
						}
						obj[state].push(el);
					});
				}
			});

			return obj;
		},
		_loadImages = function ( elements, state ) {
			var loadedImages = 0;
			var self = this;
			var imagesLength = 0;
			var imageLoaded = function (e) {
				loadedImages ++;
				if (this.removeEventListener) {                   // For all major browsers, except IE 8 and earlier
					this.removeEventListener("load", imageLoaded);
				} else if (this.detachEvent) {                   // For IE 8 and earlier versions
					this.detachEvent("load", imageLoaded);
				}
				if(loadedImages == imagesLength){
					_notify('media/imagesloaded');
				}
			}
			// do we have images?
			if(elements.small){
				var length = elements.small.length;
				for(var i= 0; i<length; i++){
					var el = null;
					var elState = 'large';
					var elStates = null;


					/* added functionality for specific elements to use larger screensize than others */
					if(elements[state] && elements[state][i] && state=="xlarge"){
						el = elements[state][i];
					} else if(elements.large && elements.large[i]){
						el = elements.large[i];
					} else if(elements.medium && elements.medium[i]){
						el = elements.medium[i];
					} else if(elements.small && elements.small[i]){
						el = elements.small[i];
					}
					elStates = el.getAttribute( 'data-response').split(' ');
					if($.inArray(state, elStates) < 0){
						elState =  elStates[elStates.length-1];
					} else {
						elState = state;
					}
					/* added functionality for specific elements to use larger screensize than others */

					var imgAttr = G.primitives( el.getAttribute( 'data-response-src' ));
					if (imgAttr && imgAttr.length>0) {
						var ext, src = imgAttr;
						ext = imgAttr.split(".").pop();

						// If we have a stateMapFunction we will use that for creating sourceString instead.
						if(_options.imgStateMapFunction){
							src = _options.imgStateMapFunction(src, elState, el);
						} else{
							// if not.. we use the default "small,medium,large"
							if(_stateMap[state]){
								src = imgAttr.replace('.' + ext, '-' + _stateMap[elState] + '.' + ext);
							}
							else{
								// if the state is not in the state array then default to large.
								src = imgAttr.replace('.' + ext, '-large.' + ext);
							}
						}
						if ( src !== el.getAttribute('src') ) {
							el.setAttribute('src', src);
							if(_options.notifyOnImagesLoad){
								if (el.addEventListener) {                   // For all major browsers, except IE 8 and earlier
									el.addEventListener("load", imageLoaded);
								} else if (el.detachEvent) {                   // For IE 8 and earlier versions
									el.attachEvent("load", imageLoaded);
								}
							}
						}
						imagesLength ++;
					} else{
						console.warn('data-response-src is missing on: '+ el);
					}


				}
			}
		}

	// //////////////////////////////////////////////////////////////////////////
	// Prototype
	// /////////////////////////////////////////////////////////////////////////
	var responsive = {
		getState: _getState,
		getElements: _getElements,
		loadImages: function ( elements, state ) {
			elements = elements || _getElements();
			state = state || _getState();
			_loadImages(elements, state);
		},
		initialize: function (options) {
			// extend with default values
			options = G.extend({
				notifyOnImagesLoad: true
			}, options || {});
			_options = options;

			init(options);
		}

	};


	// //////////////////////////////////////////////////////////////////////////
	// Initializer
	// /////////////////////////////////////////////////////////////////////////
	var init = function ( options ) {
		var options = options || {};
		// Create the indicator element, so we can check device width
		_createIndicatorEl();

		// set up event listeners, on resize and on DOM ready
		var handler = function (e) {
				var state = _getState(),
					elements = _getElements();

				// load images
				_loadImages( elements, state, options );
				
				
				// notify when the state changes.
				_notify('media/statechange', {
					state: state
				});

                
				// notify when the state changes.
				_notify('media/statechange', {
					state: state
				});

				// notify app
				_notify('media/' + state, {
					e: e,
					media: state,
					el: elements[state] ? elements[state] : [],
					allElements: elements
				});

				// attach FastClick if available
				if ( e && window.FastClick && (e.type == 'DOMContentLoaded' || e.type == 'onload') ) {
					FastClick.attach(document.body);
				}
			},
			bouncer = _debounce(handler);

		if( w.addEventListener ){
			w.addEventListener( 'resize', bouncer, false );
			w.addEventListener( 'DOMContentLoaded', function(e){
				handler(e);
				_notify('media/imagesloaded');
				w.removeEventListener( 'load', handler, false );
			}, false );
			w.addEventListener( 'load', handler, false );
		}
		else if( w.attachEvent ){
			w.attachEvent( 'onload', handler );
		}
		handler();
	};

	/*
	 * add library to 'has' checklist
	 */
	G.has.add( 'responsive', true );

	/*
	 * Auto init
	 */
//	init();
	return G.extend( Graphite, { responsive: responsive } );


}));