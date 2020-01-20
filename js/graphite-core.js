/*!
 * Graphite Core Library
 * http://graphite.github.io ( maybe )
 *
 * Copyright 2014, LBi Denmark
 *
 *
 * @author Rasmus Bangsted Pedersen <rasmus.pedersen@lbi.com> | <rasmusbangsted@gmail.com>
 *
 * Credits
 * =======================================================================================
 * Jeremy Ashkenas, Underscore.js [http://underscorejs.org],
 * (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and
 * Investigative Reporters & Editors:
 *
 * # _indexOf
 * # _each
 * # _extend
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 *
 */
(function (root, $) {

    'use strict';

    // /////////////////////////////////////////////////////////////////////////
    // Private methods, values & utility methods
    // /////////////////////////////////////////////////////////////////////////
    var _members = {},
        _memberNames = [],
        _config = {},
        _ie = 0,  // .. doing the IE check is relative expensive, so we 'cache' the result after the first check!

        /**
         * Legacy hacks
         */
            _hasOwnProperty = root.hasOwnProperty || Object.prototype.hasOwnProperty,

        /**
         * Generic messages used by Graphite core
         */
            _msg = {
            no_registered: function () {
                return 'There is no components or modules registered to Graphite! Nothing has happened!';
            },
            not_registered: function ( name ) {
                return '"' + name + '" is an undefined member of Graphite. ' +
                    'Use "Graphite.list()" to see available members';
            },
            invalid_factory: function ( name, factory ) {
                return '"' + factory + '" of "' + name + '" is not a function.';
            },
            already_exist: function ( name ) {
                return 'The member "' + name + '" is already registered. Nothing has happened!';
            },
            no_support: function ( method, name ) {
                return '"' + method + '()" of "' + name + '" is not support in current browser. ' +
                    'Make sure to add proper fallback library, e.g. jQuery';
            }
        },


        /**
         * Add test to '_has' or '_is' object
         *
         * @param name
         * @param statement
         * @param type
         * @returns {boolean}
         *
         * @private
         */
            _addTest = function ( name, statement, type ) {
            if ( type[name] ) {
                _console('warn','add test: test "' + name + '" already exist' );
                return false;
            }
            type[name] = typeof statement === 'function' ? statement() : statement;
        },

        /**
         * Test if various libraries, globals or APIs are available
         *
         * @type {{get: Function, underscore: Function, jquery: Function, zepto: Function}}
         * @private
         */
            _has = {

            /*
             * Test for third-party libraries
             */
            underscore: function () { return !!root._ && root._() instanceof root._ },
            jquery:     function () { return !!root.jQuery && root.jQuery() instanceof root.jQuery },
            zepto:      function () { return !!root.zepto && root.zepto() instanceof root.zepto },
            modernizr:  function () { return !!root.Modernizr },

            /*
             * make 'add()' available for extensions
             */
            add: function ( name, statement ) { _addTest( name, statement, _has) }


        },

        /**
         * Test various conditions or states
         *
         * @type {{ie: Function}}
         * @private
         */
            _is = {
            /**
             * Check if current browser is Internet Explorer
             * @returns {number} IE version or 'false'
             */
            ie: function () {
                if ( _ie !== 0 ) return _ie;

                var v = 5,
                    div = document.createElement('div');

                while (
                    div.innerHTML = '<!--[if gt IE '+(++v)+']><br><![endif]-->',
                        div.getElementsByTagName('br')[0]
                    );

                // 99 = not ie. It makes it easier to check.
                // E.g. the statement: "_is.ie() >= 8", will also return true if browser's not IE at all
                _ie = v > 6 ? v : 99;
                return _ie;
            },

            /*
             * make 'add()' available for extensions
             */
            add: function ( name, statement ) { _addTest( name, statement, _is) }
        },

        /**
         * Called whenever an undefined member has been tried initialized
         *
         * @param {string} name
         * @private
         */
        _error = function ( msg ) {
            throw new Error( 'Graphite: ' + msg );
        },

        /**
         * Wraps 'console.*' for cross-browser support

         * @private
         */
            _console = function ( type ) {
            if (!type || !_config.debug ) return;
            if (root.console) {
                if (root.console[type] && root.console[type].apply) {
                    console[type].apply(console, Array.prototype.slice.call(arguments, 1));
                }
            }
        },

        /**
         * Checks if an object is a function
         * @param object
         * @returns {boolean}
         * @private
         */
        _isFunction = function ( object ) {
            return typeof object === 'function';
        },

		/**
		 * Converts a string or an array of string into JS primitives
		 * e.g integers, booleans or objects
		 * @param str
		 * @returns {*}
		 * @private
		 */
		_primitives = function ( str ) {

			var handler = function ( val ) {
				var obj;
				try  {
					obj = Function("return("+str+")")();
				} catch(e) {
					obj = null;
				}
				if ( obj || obj === false ) { return obj; }
				else if ( val === '' ) { return true; }
				else { return val; }
			};
			if ( str instanceof Array ) {
				var arr = [];
				_each(str, function( s ) {
					arr.push( handler(s) );
				});
				return arr;
			} else {
				return handler(str);
			}

		},

		/**
		 * Get values from elements based on passed array (or string).
		 * Uses _primitives() to convert strings into JS primitives
		 * e.g.
		 * HTML el: <input data-hello="world" data-is-nice="true" required />
		 * JS: _attrOptions(el, ['data-hello']) => { hello: 'world', isNice: true, required: true };
		 * @param el
		 * @param attrs
		 * @param namespace
		 * @returns {*}
		 * @private
		 */
		_attrOptions = function ( el, attrs, namespace ) {
			var opt = {},
				helper = function (attr) {
				var split = attr.split('-'),
					keys =  split[0] === 'data' ? split.slice(1) : split.slice(0),
					name;

				if ( typeof namespace === 'string' && keys.indexOf( namespace ) > -1 ) {
					keys.splice(keys.indexOf( namespace ), 1);
				}

				name = [keys[0]];

				for (var i = 1, k = keys.length; i < k; i++) {
					name.push( keys[i].charAt(0).toUpperCase() + keys[i].substring(1) );

				}
				return { key: name.join(''), value: _primitives( el.getAttribute( attr ) ) };
			};

			attrs = attrs instanceof Array !== true ? [attrs] : attrs;

			_each( attrs, function (attr) {
				var o = helper(attr);
				if (o.value !== undefined )
					opt[o.key] = o.value;
			});
			return opt;
		},

		/**
		 * Construct an method object based on declarative string (method | arg1:value1 | arg2:value2)
		 * that includes a method name and an arguments list
		 * @private
		 */
		_methodObj = function ( str ) {
			var method = str.replace(/\s/g, '').split('|',1)[0],
				args = str.substring(method.length+1).split('|'),
				options = {};
			if ( args.length > 0 ) {
				$.each( args, function (i, s) {
					var split = $.trim(s).split(':');
					if ( split[1] !== undefined )
						options[split[0]] = _primitives(split[1]);
				});
			}
			return {
				method: method,
				args: options
			}
		},

        /**
         * Wraps Array.prototype.indexOf for cross-browser support
         * Credit: Jeremy Ashkenas, Underscore.js [http://underscorejs.org]
         * (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
         *
         * @param {Array|string} array , target array
         * @param {item} item to check index of
         *
         * @return {number} index of item or -1 of item doesn't exist in array
         */
         _indexOf = function (array, item) {

            if (array == null) return -1;
            var i = 0, length = array.length;
            if (Array.prototype.indexOf) return array.indexOf(item);
            for (; i < length; i++) if (array[i] === item) return i;
            return -1;

        },

        /**
         * Wraps Array.prototype.forEach for cross-browser support
         * Credit: Jeremy Ashkenas, Underscore.js [http://underscorejs.org]
         * (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
         *
         * @param {{}|[]} obj , array or object to iterate through
         * @param {function} iterator function
         * @context {object} context for iterator function
         *
         */
         _each = function ( obj, iterator, context ) {
            if (obj == null) {return;}

            var nativeEach = Array.prototype.forEach;

            if (nativeEach && obj.forEach === nativeEach) {
                obj.forEach(iterator, context);
            } else if (obj.length === +obj.length) {
                for (var i = 0, length = obj.length; i < length; i++) {
                    if (iterator.call(context, obj[i], i, obj) === {}) return;
                }
            } else {
                var keys = (function () {
                    var keys = [];
                    for (var key in obj) if ( _hasOwnProperty.call(obj, key) ) keys.push(key);
                    return keys;
                })();
                for (var i = 0, length = keys.length; i < length; i++) {
                    if (iterator.call(context, obj[keys[i]], keys[i], obj) === {}) return;
                }
            }

        },

        /**
         * Extend an object
         * Credit: Jeremy Ashkenas, Underscore.js [http://underscorejs.org]
         * (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
         *
         * @param {{}|[]} obj , array or object to iterate through
         *
         * @return {{}} extended object
         */
            _extend = function(obj) {

            _each(Array.prototype.slice.call(arguments, 1), function(source) {
                if (source) {
                    for (var prop in source) {
                        obj[prop] = source[prop];
                    }
                }
            });
            return obj;
        },

        /**
         * Traverse the DOM looking for matched elements.
         *
         * @param selector
         * @returns {Array} array of matched elements
         *
         * @private
         */
            _query = function ( selector ) {

            if (_is.ie() >= 8 ) {
                return document.querySelectorAll( selector );
            } else if ( _has.jquery() ||  _has.zepto() ) {
                var elems = [];
                _each($( selector ), function ( el ) {
                    elems.push(el);
                });
                return elems;
            } else {
                _console('warn', _msg.no_support( 'query', 'core' ) );
                return [];
            }
        },

        /**
         * Utility method to initialize a single member
         *
         * @param {string} name of member
         * @param {{}} options object to be passed to member factory
         * @returns {*} whatever the member's factory returns
         * @private
         */
         _initializeOne = function (name, options, iterator) {

            if (_members[ name ] === undefined)
                throw 'The requested component "' + name +'" does not exist.';

            var factory = _members[ name ].factory,
                instance = factory ? factory.call(factory, options) : _error( _msg.not_registered( name ) );

            _members[ name ].initialized = !!instance;
            if ( typeof iterator === 'function') {
                if ( instance.el ) {
                    iterator.apply(instance.el, [instance, {name: name, options: options}])
                } else {
                    _console('error', name + ' doesn\'t return an DOM element to the iterator function. See Graphite.core _initializeOne()');
                }
            }
            return instance;

        },

        /**
         * Iterates more or all registered members and passes them to
         * '_initializeOne' to be initialized one by one
         *
         * @param {Array} names. Array of member names
         * @returns {{}}
         * @private
         */
         _initializeMore = function ( names, iterator ) {
            var obj = {},
                arr = ( names && names.length > 0 ) ? names : _memberNames;

            _each(arr, function ( name ) {
                obj[ name ] = _initializeOne(name, {}, iterator);
            });

            return obj;
        };


    // //////////////////////////////////////////////////////////////////////////
    // Public methods & values
    // /////////////////////////////////////////////////////////////////////////
    var core = _extend({

        /**
         * Initializer function for members.
         * If no identifier (name) is passed to method every registered
         * member will be initialized with default options (or possible data-* overrides)
         *
         * @param {string|Array} name of member or array of members
         * @param {{}} options object to be passed to member factory
         * @param {function} iterator
         * @returns {*}
         */
        initialize: function (name, options, iterator) {

            if (_memberNames.length === 0 ) {
                _console('warn', _msg.no_registered() );
            }

            // Handle arguments
            var first = arguments[0],
                last = arguments[arguments.length-1];
            if ( _isFunction( first ) ) {
                iterator = first;
                name = false;
            } else if ( _isFunction( last ) ) {
                iterator = last;
            }

            if (!name || name instanceof Array) {
                return _initializeMore( name, iterator );
            } else {
                return _initializeOne(name, options, iterator);
            }

        },

        /**
         * Register a member to the Graphite sandbox
         *
         * @param {string} name of member
         * @param {function} factory of the member
         * @returns {string} returns the name of member, ready for init (useful if working with AMD
         */
        register: function (name, factory, deps) {

            if (_members[name] ) {
                _console('warn', _msg.already_exist( name ) );
                return false;
            } else if ( !factory || typeof factory !== 'function' ) {
                _error( _msg.invalid_factory(name, factory) );
            }

            _memberNames.push( name );

            _members[name] = {};
            _members[name].initialized = false;
            _members[name].factory = factory;
            _members[name].dependencies = deps || {not_provided: 'n\/a'};

            return name;

        },

        /**
         * Registers a component
         *
         */
        registerComponent : function(name, base){

            if ( typeof define === "function" && define.amd ) {
                var deps = ['graphite'];

                // add require dependencies here. Note that graphite is always included, so this doesn't need to be added by a component
                if (base.dependencies){
                    deps = deps.concat(base.dependencies);
                }

                define(name, deps, function(){
                    register(arguments);
                });

            } else {
                register([G]);
            }

            // Dependencies is the full array of dependencies declared by the component. Graphite is hardcoded as the first one.
            function register(dependencies){
                var G = dependencies[0];
                var dependenciesWithoutGraphite = [];
                for (var i = 0 ; i < dependencies.length ; i ++){
                    if (i == 0) continue;
                    dependenciesWithoutGraphite.push(dependencies[i]);
                }

                // force override string array with dependencies that string array specified
                base.dependencies = dependenciesWithoutGraphite;

                if (_members[name] ) {
                    _console('warn', _msg.already_exist( name ) );
                    return false;
                }

                // force prototype if Component doesn't have one by inheriting from func
                var Component = function () { };

                // append base methods
                G.extend( Component.prototype, {
                    update: function () {
                        this.notify(name + '/updated', {});
                    },
                    destroy: function ( ) {
                        this.notify(name + '/destroyed', {});
                    },
                    notify : function ( event, data, sender ) {
                        if (G.has.pubsub) {
                            return G.pubsub.notify(event, data, sender);
                        }
                    },
                    listen : function ( event, listener) {
                        if (G.has.pubsub) {
                            return G.pubsub.listen(event, listener);
                        }
                    },
                    ignore : function (  handler ) {
                        if (G.has.pubsub) {
                            return G.pubsub.ignore( handler );
                        }
                    }
                });

                G.extend(Component.prototype, base);

                // force attach properties
                if (!Component.prototype.name)
                    Component.prototype.name = name;

                if (!Component.prototype.options)
                    Component.prototype.options = {};

                if (!Component.prototype.attrOptions)
                    Component.prototype.attrOptions = [];

                // el is the selector of the element component will be attached to
                if (!Component.prototype.el)
                    Component.prototype.el = null;

                if (!Component.prototype.$el)
                    Component.prototype.$el = null;

                if (!Component.prototype.initialize)
                    Component.prototype.initialize = function(){ };

                _members[name] = {};
                _members[name].initialized = false;
                _members[name].component = Component;

                return true;
            }

        },

        /**
         * Replacement for initialize
         *
         * @param {string} name of member
         */
        initializeComponent : function(name, options){
            if (_memberNames.length === 0 ) {
                _console('warn', _msg.no_registered() );
            }

            if (!_members[name]) {
                _error('Invalid component ' + name);
            }

            options = options || {};

            var Component = _members[name].component;

            // 1) we can pass the host instance in directly using options.$el - this will be taken first.
            // 2) Next, we can use options.el to force instantiation on a specific select passed in
            // during initialization, else the default component declaration element will be used
            var parentElement =
                options.$el ? options.$el :
                options.el ? options.el : Component.prototype.el;

            if (!parentElement)
                throw 'Component ' + name + ' has no element defined';

            var elements = parentElement instanceof jQuery ? parentElement : $(parentElement);

            var output = {
                instances : []
            };

            if ( elements.length > 0 ) {
                G.each( elements, function ( el, i ) {
                    var $el = $(el);
                    output.instances[i] = new Component( $el, options );
                    output.instances[i].$el = $el;

                    if (options) {
                        output.instances[i].options = options;

                        // write each options propety to instance as a property
                        for (var property in options){
                            if (!options.hasOwnProperty(property))
                                continue;

                            output.instances[i][property] = options[property];
                        }
                    }

                    // append instance to dom if required - this allows us to retrieve the instance using a jquery data()
                    // selector on the DOM element
                    if (options.__appendToDOMElement)
                        $el.data(name +'-instance', output.instances[i]); // attach instance to dom element it was created on

                    // finally, initialize the component
                    output.instances[i].initialize(options);
                });

            } else {
                G.warn('No matching elements found in DOM for component ' + name);
            }

            return output;
        },

        /**
         * Remove a member from the list
         * of registered members.
         *
         * Useful if you need to make sure a member
         * doesn't mistakenly gets initialized
         *
         * @param {string} name of member
         */
        remove: function (name) {

            var index = _indexOf(_members, name);

            if (index > -1) {
                _members.splice(index, 1);
            }
            return core;
        },

        /**
         * Return list of registered members
         *
		 * @param {Boolean} detailed. Return a detailed object
         * @returns {Array}
         */
        list: function ( detailed ) {

            var arr = [];
            _each(_members, function ( val, name ) {
				if ( detailed ) {
					arr.push({
						name: name,
						initialized: val.initialized,
						dependencies: val.dependencies
					});
				} else {
					arr.push(name);
				}

                _console('groupCollapsed', name );
                _console('log', 'Dependencies of ' + name)
                _console('table', [val.dependencies]);
                _console('groupEnd');

            });

            return arr;

        },

        /**
         * Search the DOM for members and return a list of matched names
         * Only prerequisites is that the member element utilized the data-c-* identifier
         *
         * Useful if you, in a quick way, want to initialized only the members present on the page, e.g.:
         *
         *      G.initialize( G.inDOM() );
         *
         * ...or, if you've only loaded Graphite.core, and you want to know what JS files
         * you should lazy load, e.g. using Requirejs, e.g.:
         *
         *      var members = G.inDOM();
         *
         *      require( members, function () {
         *          var list = Array.prototype.slice.call(arguments, 0);
         *          G.initialize( list );
         *      });
         *
         * @returns {Array}
         */
        inDOM: function () {

            var arr  = [];

            _each( _query('*'), function ( el ) {
                _each( el.attributes, function ( attr ) {
                    var split =  attr.nodeName.split('-'),
                        identifier = split[1],
                        moduleOrComponent = ( identifier === 'c' || identifier === 'm' );
                    if ( split[0] === 'data' && moduleOrComponent ) {
                        var name = split.slice(2,split.length).join('_');
                        if ( _indexOf( arr, name ) === -1 ) {
                            arr.push( identifier + '_' + name );
                        }
                    }
                });
            });

            return arr;

        },

        /**
         * Warn developer of a 'no support' scenario
         * @param method
         * @param name of member
         * @returns {boolean}
         */
        noSupport: function ( method, name ) {
            _console('warn', _msg.no_support( method, name ) );
            return false;
        },

        /**
         * Warn developer if dependencies of a specific member
         * is missing when attempted initialized
         * @param name
         * @param dependencies
         */
        missingDependencies: function ( name, dependencies ) {

            var arr = [];
            _each(dependencies, function ( val, key ) {
                arr.push({
                    name: key,
                    version: val
                });
            });
            _console('groupCollapsed', '"' + name + '" failed to initialize!');
            _console('warn', '"' + name + '" has dependencies that are not available!');
            _console('table', arr);
            _console('log', dependencies);
            _console('groupEnd');
        },

        /**
         * Exposed utility methods
         */
        console:    _console,
        log:        function () {
            _console('log', arguments);
        },
        warn:       function () {
            _console('warn', arguments);
        },
		attrOptions	: _attrOptions,
		methodObj	: _methodObj,
		primitives	: _primitives,
        error:      _error,
        has:        _has,
        is:         _is,
        each:       _each,
        indexOf:    _indexOf,
        extend:     _extend,
        query:      _query,
		isFunction: _isFunction

    }, root.Graphite || {});

    /**
     * Enable pre-configuration
     */
    _config = core.config = _extend(function ( config ) {

        core.config = _extend({
            // defaults
        }, config || {});

        return core;

    }, core.config || {});


    /**
     * Expose Graphite as AMD module
     * and in global namespace
     */

    if (typeof define === "function" && define.amd) {
        define('graphite', [], function () {
            return core;
        });
    }

    root.Graphite = root.G = core;

    // Current version
    G.VERSION = '0.0.5';


})(this, window.jQuery, undefined);