/*!
 * Graphite: Utilities Extension
 * 
 *
 *  @author rasmuselken <rasmus.elken@digitaslbi.com> | <rasmuselken@gmail.com>
 *  @Date: 3/20/14.
 *
 *
 * Credits
 * =======================================================================================
 * http://lodash.com/
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 */


( function (root, extension) {

    // Shukri Adams, 10-3-15 : I had to bypass the use of both define and require here as both were throwing errors which
    // were preventing the use of Graphite. I recommend refactoring all Graphite parts so they are wrapped in
    // an outer require, it would greatly simplify module structure and prevent these require issues.
    if (Graphite) {
        return extension(Graphite);
    }

	/*
	 * Expose either as AMD module and handle dependency feedback
	 */
	if (typeof define === "function" && define.amd) {

		define('graphite', [], function (G) {
			return extension(G)
		});

	} else {
		return extension(Graphite);
	}

}(window, function (G) {

	'use strict';

	/*
	 * Failsafe
	 */
	if (!G) return window.console ? console.warn('Graphite Core is not available!') : false;

	// //////////////////////////////////////////////////////////////////////////
	// Private methods & values
	// //////////////////////////////////////////////////////////////////////////
	var _w = window,
		_isMobile = function(){
			return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
		},

		/**
		 * Returns object with current browser name and version. IE and Edge will be identify as separate.		 
		 */
		 _getBrowserInformation = function() {

		 	var userAgent = navigator.userAgent,
                browserVersion = userAgent.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*([0-9|\.]+)/i) || [],
                version;
            
            if (/trident/i.test(browserVersion[1])){
                version =  /\brv[ :]+(\d+)/g.exec(userAgent) || [];
                return {'browserName': 'IE', 'browserVersion': parseFloat(version[1]) || ''};
            }
            
            if (browserVersion[1] === 'Chrome'){
                version = userAgent.match(/\b(OPR|Edge)\/(\d+)/);
                if (version !== null) {
                    return {'browserName': version[1].replace('OPR', 'Opera'), 'browserVersion': parseFloat(version[2]) || ''};
                }
            }
        
            browserVersion = browserVersion[2] ? [browserVersion[1], browserVersion[2]] : [navigator.appName, navigator.appVersion, '-?'];
        
            if ((version = userAgent.match(/version\/([0-9|\.]+)/i)) !== null){
                browserVersion.splice(1, 1, version[1])
            }

            return {'browserName': browserVersion[0], 'browserVersion': parseFloat(browserVersion[1])};
		 },

		/**
		 * Returns true if current browser is IE 11 or lower, not edge.
		 *
		 * User agent is optional
		 */
		_isIEButNotEdge = function(userAgent){

			userAgent = userAgent || navigator.userAgent;
			return userAgent.indexOf("MSIE ") > -1 || userAgent.indexOf("Trident/") > -1;
		},

		/**
		 * child : an DOM element (NOT a jquery object)
		 * parent : can be a class name (not a selector, just the class name), or a DOM element (NOT a jquery object)
		 */
		_isDescendantOf = function(child, parent){
			while (child){

				if (typeof(parent) === 'string' && child.className.split(' ').indexOf(parent) !== -1)
					return true;
				else if (child === parent)
					return true;

				child = child.parentElement;
			}

			return false;
		},
		/**
		 * Loads a script into DOM. This is basically a poor man's requirejs
		 */
		_loadScript = function(src, isAsync){
			var body = document.getElementsByTagName('body')[0],
				fileRef;

			fileRef = body.querySelectorAll('script[src="' + src + '"]');

			if (fileRef && fileRef.length === 0) {
				fileRef = document.createElement('script');
			} else {
				fileRef = fileRef[0];
			}

			// note : append element BEFORE setting attributes, due to an IE quirk
			body.appendChild(fileRef);

			if (isAsync){
				fileRef.setAttribute('async', '');
				fileRef.setAttribute('defer', '');
			}

			// note : href must be added LAST because of an IE quirk
			fileRef.setAttribute('src', src);
		},
		_debounce = function debounce(func, wait, options) {  // lodash debounce function.
			/**
			EXAMPLE:
			var lazyLayout = G.utils.debounce(calculateLayout, 150);
			$(window).on('resize', lazyLayout);
			*/

			var args,
				maxTimeoutId,
				result,
				stamp,
				thisArg,
				timeoutId,
				trailingCall,
				lastCalled = 0,
				maxWait = false,
				trailing = true,
				nativeMax = Math.max,
				now = function(){
					return new Date().getTime();
				}
			if (!G.isFunction(func)) {
				throw new TypeError;
			}
			wait = nativeMax(0, wait) || 0;
			if (options === true) {
				var leading = true;
				trailing = false;
			} else if (typeof options == "object") {
				leading = options.leading;
				maxWait = 'maxWait' in options && (nativeMax(wait, options.maxWait) || 0);
				trailing = 'trailing' in options ? options.trailing : trailing;
			}
			var delayed = function () {
				var remaining = wait - (now() - stamp);
				if (remaining <= 0) {
					if (maxTimeoutId) {
						clearTimeout(maxTimeoutId);
					}
					var isCalled = trailingCall;
					maxTimeoutId = timeoutId = trailingCall = undefined;
					if (isCalled) {
						lastCalled = now();
						result = func.apply(thisArg, args);
						if (!timeoutId && !maxTimeoutId) {
							args = thisArg = null;
						}
					}
				} else {
					timeoutId = setTimeout(delayed, remaining);
				}
			};

			var maxDelayed = function () {
				if (timeoutId) {
					clearTimeout(timeoutId);
				}
				maxTimeoutId = timeoutId = trailingCall = undefined;
				if (trailing || (maxWait !== wait)) {
					lastCalled = now();
					result = func.apply(thisArg, args);
					if (!timeoutId && !maxTimeoutId) {
						args = thisArg = null;
					}
				}
			};

			return function () {
				args = arguments;
				stamp = now();
				thisArg = this;
				trailingCall = trailing && (timeoutId || !leading);

				if (maxWait === false) {
					var leadingCall = leading && !timeoutId;
				} else {
					if (!maxTimeoutId && !leading) {
						lastCalled = stamp;
					}
					var remaining = maxWait - (stamp - lastCalled),
						isCalled = remaining <= 0;

					if (isCalled) {
						if (maxTimeoutId) {
							maxTimeoutId = clearTimeout(maxTimeoutId);
						}
						lastCalled = stamp;
						result = func.apply(thisArg, args);
					}
					else if (!maxTimeoutId) {
						maxTimeoutId = setTimeout(maxDelayed, remaining);
					}
				}
				if (isCalled && timeoutId) {
					timeoutId = clearTimeout(timeoutId);
				}
				else if (!timeoutId && wait !== maxWait) {
					timeoutId = setTimeout(delayed, wait);
				}
				if (leadingCall) {
					isCalled = true;
					result = func.apply(thisArg, args);
				}
				if (isCalled && !timeoutId && !maxTimeoutId) {
					args = thisArg = null;
				}
				return result;
			};
		};



	// //////////////////////////////////////////////////////////////////////////
	// Public methods & values
	// /////////////////////////////////////////////////////////////////////////
	var utilities = {
		isMobile: function(){
			return _isMobile();
		},
		debounce: function(func, wait, options){
			return _debounce(func, wait, options);
		},
		isDescendantOf : function(child, parent){
			return _isDescendantOf(child, parent);
		},
        loadScript : function(src, isAsync){
			return _loadScript(src, isAsync);
		},
		isIEButNotEdge : function(userAgent){
			return _isIEButNotEdge(userAgent);
		},
		getBrowserInformation : function(){
			return _getBrowserInformation();
		}
	};

	/*
	 * add library to 'has' checklist
	 */
	G.has.add('utilities', true);
	return G.extend(Graphite, { utils: utilities });


}));