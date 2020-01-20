/*!
 * Graphite Pubsub Extension
 * http://graphite.github.io ( maybe )
 *
 * Copyright 2014, LBi Denmark
 *
 * @author Rasmus Bangsted Pedersen <rasmus.pedersen@lbi.com> | <rasmusbangsted@gmail.com>
 *
 * Credits
 * =======================================================================================
 * Richard Scarrot
 * https://github.com/richardscarrott/ply/blob/master/src/core.js
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
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
    var _listeners = {},
        _id = 0;

    // //////////////////////////////////////////////////////////////////////////
    // Public methods & values
    // /////////////////////////////////////////////////////////////////////////
    var pubsub = {

        /**
         * Broadcast event and data to subscribers
         *
         * @param event
         * @param data
         * @param sender
         */
        notify: function (event, data, sender) {

            // Cache listeners array or create a new array, assign, and cache it.
            var list = _listeners[event] || (_listeners[event] = []),
                i = 0,
                len = list.length;

            // Loop over listeners and notify each.
            for (; i < len; i++) {
                list[i].handler.call(list[i].listener, event, data, sender);
            }

        },

        /**
         * Attach listener to event
         *
         * @param event
         * @param handler
         * @param listener
         * @returns {Array}
         */
        listen: function (event, handler, listener) {

            // Cache the notification's listeners if it exists or create and cache
            // a new array otherwise.
            var list  = _listeners[event] || (_listeners[event] = []),
            // Split the notification on whitespace. Clients can listen to
            // multiple notifications by passing in a string with the notification
            // names split by whitespace.
                events = event.split(/\s/),
            // Create loop variables.
                len = events.length,
                i = 0;

            // If the notification name contains whitespace,
            // listen on each particular notification (segment).
            if (len > 1) {
                for (; i < len; i++) {
                    this.listen(events[i], handler, listener);
                }

                return;
            }

            // Add the listener and handler function to the notifications array.
            list.push({
                id: _id += 1,
                handler: handler,
                listener: listener
            });

            // return handle used to ignore.
            return [event, _id];
        },

        /**
         * Unsubscribe from broadcast
         *
         * @param handle
         */
        ignore: function (handle) {

            var event = handle[0];

            if (_listeners[event]) {
                G.each(_listeners[event], function (e, i) {
                    if (e.id === handle[1]) {
                        _listeners[event].splice(i, 1);
                    }
                });
            }

            return;
        }

    };


    /*
     * add library to 'has' checklist
     */
    G.has.add( 'pubsub', true );
    return G.extend( Graphite, {pubsub:pubsub} );


}));