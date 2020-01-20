/*!
 * Graphite Cookie Extension
 * http://graphite.github.io ( maybe )
 *
 * Copyright 2014, LBi Denmark
 *
 * @author Rasmus Elken <rasmus.elken@digitaslbi.com> | <rasmuselken@gmail.com>
 * @Credits  Bjarne Øverli - https://github.com/bjarneo/CookieJS
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

}(window, function ( G ) {

    'use strict';

    /*
     * Failsafe
     */
    if ( !G ) return window.console ? console.warn('Graphite Core is not available!') : false;
    if ( typeof(Cookie) !=="undefined" ) return;

    // //////////////////////////////////////////////////////////////////////////
    // Private methods & values
    // //////////////////////////////////////////////////////////////////////////
    var _w = window,
		prefix = "GRAPHITE-COOKIE-",
		
		_set = function( cookieName, value, params){
			params = params || {};
			var _cookieName = cookieName ? prefix+cookieName : false;
			if(_cookieName){
				var cookie = _cookieName + '=' + encodeURI(value) + ';';
				if (params.expires) {
					params.expires = new Date(new Date().getTime() + parseInt(params.expires) * 1000 * 60 * 60 * 24);
					cookie += 'expires=' + params.expires.toUTCString() + ";";
				}
				cookie += (params.path) ? 'path=' + params.path + ';' : 'path=/';
				cookie += (params.domain) ? 'domain=' + params.domain + ';' : '';
				cookie += (params.secure) ? 'secure;' : '';
				cookie += (params.httpOnly) ? 'httpOnly;' : '';

				document.cookie = cookie;
				return {cookieName: cookieName, cookieValue: value};
			} else {
				console.warn('Graphite cookie: No cookiename defined');
				return false;
			}
		},
        _get = function( cookieName ) {
			var _cookieName = cookieName ? prefix+cookieName : false,
				parts = document.cookie.split(_cookieName + '=');
			if (parts.length == 2) {
				return decodeURI(parts.pop().split(';').shift());
			} else {
				return false;
			}
		},
		_remove = function( cookieName ){
			if(_get(cookieName)){
				_set(cookieName, '', {
					expires:-1,
					path: '',
					domain: '',
					secure: '',
					httpOnly: ''
				})
			}
		},
		_getAll = function(){
			var cookies = {},
				allCookies = document.cookie;

			if(allCookies === '') {
				return cookies;
			}
			var list = allCookies.split('; '),
				len = list.length;

			while(len--) {
				var cookie = list[len].split('=');
				cookie[0] = cookie[0].replace(prefix, '');
				cookies[cookie[0]] = decodeURI(cookie[1]);
			}
			return cookies;
		},
		_notify = function (event) {
			if (G.has.pubsub) {
				G.pubsub.notify(event);
			}
		};


    // //////////////////////////////////////////////////////////////////////////
    // Public methods & values
    // /////////////////////////////////////////////////////////////////////////
    var cookie = {
		set: function( cookieName, value, params ) {
			return _set(cookieName, value, params);
		},
		get: function(cookieName){
			return _get(cookieName);
		},
		remove: function(cookieName){
			_remove(cookieName);
			_notify('app/cookie-removed')
		},
		has: function(cookieName){
			return _get(cookieName)!=false;
		},
		getAll: function(){
			return _getAll();
		}
    };

    /*
     * add library to 'has' checklist
     */
    G.has.add( 'cookie', true );
    return G.extend( Graphite, { cookie: cookie } );


}));