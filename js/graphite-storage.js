/*!
 * Graphite Storage Extension
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
    if ( typeof(Storage) !=="undefined" ) return;

    // //////////////////////////////////////////////////////////////////////////
    // Private methods & values
    // //////////////////////////////////////////////////////////////////////////
    var _w = window,
        _prefix = 'GRAPHITE-STORAGE-',
        _get = function( key, type ) {
            return _w[type].getItem(_prefix + key);
        },
        _existIn = function ( key ) {
            return _get(key, 'sessionStorage' ) === null  ? 'localStorage' : 'sessionStorage';
        };


    // //////////////////////////////////////////////////////////////////////////
    // Prototype
    // //////////////////////////////////////////////////////////////////////////
    var Storage = function ( key, initData, type ) {

        this.key = key || Math.round(Math.random() * 1000) + '-' + Math.round(Math.random() * 1000) +'-' + Math.round(Math.random() * 1000);

        if (type) {
            this.use( type )
        } else {
            this.type = _existIn( this.key );
        }

        var empty = _get( this.key, this.type ) === null;

        if ( empty ) {
            this.save(initData || '');
        } else if ( !empty && initData ) {
            this.save(initData);
        }

        return this;
    };

    G.extend(Storage.prototype, {
        use: function( type ) {
            if ( type === 'sessionStorage' || type === 'localStorage' ) {
                this.type = type;
            } else {
                this.type = 'localStorage';
            }
            return this;
        },
        clear: function () {
            _w[this.type].removeItem(_prefix + this.key);
            return this;
        },
        save: function ( data ) {
            _w[this.type].setItem(_prefix + this.key, data);
            return this;
        },
        get: function () {
            return _get(this.key, this.type);
        },
        copy: function ( newKey ) {
            // copy data to new 'key' in same storage type
        },
        move: function () {
            // move data from current key to passed key within currently used storage type
            // removes 'old' key
        }
    });



    // //////////////////////////////////////////////////////////////////////////
    // Public methods & values
    // /////////////////////////////////////////////////////////////////////////
    var storage = {
        add: function ( key, initData, type ) {
            return new Storage( key, initData, type );
        }
    };

    /*
     * add library to 'has' checklist
     */
    G.has.add( 'storage', true );
    return G.extend( Graphite, { storage: storage } );


}));