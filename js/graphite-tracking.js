/*!
 * Graphite Tracking Extension
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

    // //////////////////////////////////////////////////////////////////////////
    // Private methods & values
    // //////////////////////////////////////////////////////////////////////////
    var _w = window,
        _tags = {},
        _getTags = function ( selector ) {
            return G.query( selector );
        }

    // //////////////////////////////////////////////////////////////////////////
    // Extension
    // //////////////////////////////////////////////////////////////////////////
    var tracking = {
        initialize: function ( options ) {

            this.options = G.extend({
                selector: '[data-tracking]'
            }, options || {});

            var tags = _getTags( this.options.selector );

        }
    };



    // //////////////////////////////////////////////////////////////////////////
    // Public methods & values
    // /////////////////////////////////////////////////////////////////////////
    var factory = function( options ) {
        return tracking.initialize( options );
    };

    /*
     * add library to 'has' checklist
     */
    G.has.add( 'tracking', true );
    return G.extend( Graphite, { tracking: factory } );


}));