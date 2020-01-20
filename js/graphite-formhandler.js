/*!
 * Graphite Form Validation Extension
 * (Wraps jQuery Validation Plugin)
 *
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
		_rules = {
			pattern: function ( val, regex ) {
				return regex.test(val);
			},
			email: function  ( val ) {
				return /^(?:\w+\.?)*\w+@(?:\w+\.)+\w+$/.test(val);
			},
			equal: function (val, equalto) {
				return (val == equalto);
			}
		},
		_messages = {
			required: "This field is required",
			email: "Please enter valid email",

			equal: function ( label ) {
				return "The value of this field does not match " + label
			},
			none: "This field is invalid"
		},
		_getRulesMap = function ( str ) {
			if ( typeof str !== 'string' ) return false;
			var self = this,
				arr = [],
				rules = str.split(' ');

			G.each(rules, function ( rule ) {
				var method = _trim(rule).split(":",1)[0],
					args = rule.substring(method.length+1);
				if ( method ) {
					var msgObj = self.options.messages,
						msg = msgObj[method] ? (G.isFunction(msgObj[method]) ? msgObj[method]( args ) : msgObj[method]) : msgObj.none;

					arr.push({
						method: method,
						args: args.length > 0 ? G.primitives( args.split(',') ) : null,
						message: msg
					});
				}
			});
			return arr;
		},
		_trim = function (str) {
			return (''.trim) ? str.trim() : $.trim(str);
		},
		_errorEl = function (message) {
			return '<span class="c_alert alert-danger alert-compact alert-fullwidth validation-error-message">' + message + '</span>';
		},
		_getAttr = function ( el, attr ) {
			var data = el.getAttribute(attr);
			return data !== null ? data : undefined;
		},
		_initValidation = function ( form, options ) {

			var self = this,
				novalidate = G.attrOptions( form[0], 'novalidate');
			if (  novalidate && novalidate !== 'overridden' ) { return; }

			// prevent HTML5 validation
			form.attr('novalidate', 'overridden');

			// Create maps
			this.fieldsMap = [];
			this.errorList = [];
			this.successList = [];

			G.each(this.fields, function ( field ) {
				if ( ( field.type !== 'submit' && field.type !== 'reset' ) ) {
					var attrs = G.attrOptions( field, ['data-validate', 'required']),
						rules = _getRulesMap.call(self, attrs.validate );
					if ( attrs || rules ) {
						self.fieldsMap.push({
							field: field,
							required: attrs.required,
							message: null,
							valid: true,
							rules: rules,
							declined: null
						});
					}
				}

			});

		},
		_clearMessages = function () {
			this.form.find('.validation-error-message').remove();
		},
		_renderMessages = function () {

			// first: clear
			_clearMessages.call(this);

			G.each( this.errorList, function( error ) {
				var el = _errorEl( error.message );
				$(error.field).before(el);
			});


		},
		_checkRules = function ( value, rules ) {

			var self = this,
				status = {};

			status.valid = true;
			status.declined = null;

			G.each( rules, function ( rule ) {
				var method = self.options.rules[rule.method];
				if (G.isFunction(method)) {
					if ( !method( value, rule.args ) && status.valid ) {
						status.valid = false;
						status.declined = rule.method;
					}
					return;
				}
			});

			return status;

		},
		_checkField = function ( $field ) {

			var type = $field[0].type;

			if (type === 'checkbox' || type === 'radio') {
				return $field.is(':checked') ? 'checked' : '';
			} else {
				return _trim( $field.val()).length > 0;
			}

		},
		_validateOne = function ( fieldMap ) {

			var field = $(fieldMap.field);

			fieldMap.declined = null;

			if ( fieldMap.required ) {
				fieldMap.valid = _checkField( field );
				if ( !fieldMap.valid ) {
					field.addClass('invalid invalid-required');
					field.removeClass('valid');
					fieldMap.declined = 'required'
					fieldMap.message = this.options.messages.required
				} else {
					field.removeClass('invalid invalid-required');
					field.addClass('valid');
				}
			}

			if ( fieldMap.rules && fieldMap.valid ) {
				var status = _checkRules.apply(this, [field.val(), fieldMap.rules] ),
					declined = status.declined;

				fieldMap.valid = status.valid;

				if ( !fieldMap.valid ) {
					field.addClass('invalid invalid-' + declined);
					field.removeClass('valid');
					fieldMap.declined = declined;
					fieldMap.message = $.grep(fieldMap.rules, function(a){ return a.method === declined; })[0].message;
				} else {
					field.removeClass('invalid');
					field.addClass('valid')
					// we need to remove the "declined" class with a regex, since we can't rely on
					// that it's alway the same rule that fails
					field[0].className = field[0].className.replace(/\W*invalid-*[a-z]+/, '');
				}

			}

			var remove = function ( list, val ) {
					var index = G.indexOf(list, val);
					if ( index > -1 ) { list.splice(index, 1); }
				},
				add = function ( list, val ) {
					var index = G.indexOf(list, val);
					if ( index === -1 ) { list.push(val); }
				};
			if ( !fieldMap.valid ) {
				remove(this.successList, fieldMap);
				add(this.errorList, fieldMap);
			} else {
				remove(this.errorList, fieldMap);
				add(this.successList, fieldMap);
			}

			return fieldMap;

		},
		_validateAll = function () {

			var self = this,
				valid = true;

			G.each( this.fieldsMap, function( map ) {
				var status = true;
				if (map.required || map.rules) {
					status = _validateOne.call(self, map );
					if ( !status.valid && valid ) { valid = false; }
				}
			});

			this.isValid = valid;

			if ( valid ) {
				if ( G.isFunction(this.options.successHandler ) ) {
					var s = this.options.successHandler.call(this, this.successList);
					if ( s === false ) { return false; }
				}
				_clearMessages.call(this);
			} else {
				if ( G.isFunction(this.options.errorHandler ) ) {
					var e = this.options.errorHandler.call(this, this.errorList);
					if ( e === false ) { return false; }
				}
				_renderMessages.call(this);
			}

			if ( G.isFunction(this.options.validationHandler) ) {
				return this.options.validationHandler.apply(this, [this.fieldsMap, this.successList, this.errorList]);
			} else {
				return valid;
			}

		},
		_handleSubmit = function ( options ) {

			options = G.extend(this.options, options || {});
			options.ajax = this.options.ajax ? G.extend(this.options.ajax, options.ajax === true ? {} : options.ajax) : false;
			if(G.isFunction(options.beforeSubmit)){
				var a = options.beforeSubmit.call(this);
				if (a === false) return false;
			}
			if ( options.autoValidate && !options.force ) { _validateAll.call(this); }
			if ( !this.isValid && !options.force ) { return false; }
			
			if(options.ajax){
				_submitAjax.call(this, options);
			} else{
				_submit.call(this);
			}

		},
		_submitAjax = function( options ){
			var ajaxOptions = options.ajax || this.options.ajax || {},
				self = this;
			this.form.addClass(options.loaderClass);
			if(ajaxOptions.url){
				$.ajax({
					url : ajaxOptions.url,
					type: ajaxOptions.type || this.form[0].getAttribute('method'),
					data : $(self.form).serialize(),
					success: function(data, textStatus, jqXHR) {
						if(G.isFunction(ajaxOptions.onSucces)){
							ajaxOptions.onSucces.apply(this,[data, textStatus, jqXHR]);
						}
					},
					error: function (jqXHR, textStatus, errorThrown) {
						if(G.isFunction(ajaxOptions.onError)){
							ajaxOptions.onError.apply(this,[ textStatus, jqXHR]);
						}
					},
					complete: function(jqXHR, textStatus){
						if(G.isFunction(ajaxOptions.onComplete)){
							ajaxOptions.onComplete.apply(this,[ textStatus, jqXHR]);
						}
						setTimeout(function(){
							$(self.form).removeClass(options.loaderClass);
						}, 300)
					}
				});
			}
		},
		_submit = function(e){
			this.form.off();
			this.form.submit();
		};



	// //////////////////////////////////////////////////////////////////////////
	// Prototype
	// //////////////////////////////////////////////////////////////////////////
	var FormHandler = function (form, options) {
		this.form = form instanceof jQuery ? form : $(form);
		var self = this;
		var attrs = G.attrOptions( this.form[0], [
				'data-auto-validate',
				'data-ajax',
				'data-set-placeholders'
			]);

		options = options || {};
		// set common options
		this.options = G.extend({
			ajax: false,
			setPlaceholders: false,
			submitButton: this.form.find('[type="submit"]'),
			resetButton: this.form.find('[type="reset"]'),
			autoBind: true,
			autoDisable: true,
			loaderClass: 'state-loading',

			// callbacks
			beforeSubmit: false,
			errorHandler: false,
			successHandler: false,
			validationHandler: false,

			// options related to validation
			errorEl: _errorEl,
			force: false,
			autoValidate: true

		}, attrs, options);

		// set ajax options
		this.options.ajax = options.ajax ? G.extend({
			url: options.ajax.url || form.getAttribute('action') || null,
			type: 'GET'
		}, options.ajax === true ? {} : options.ajax) : this.options.ajax;

		// define rules and rules
		this.options.rules = G.extend(_rules, options.rules);
		this.options.messages = G.extend(_messages, options.messages);

		// 'cache' fields
		this.fields = [];
		G.each(form, function( field ) {
			self.fields.push(field);
		});

		_initValidation.apply( this, [this.form, this.options]);

		if(this.options.autoBind){
			this.form.off().on({
				submit: function(e){
					e.preventDefault();
					_handleSubmit.call( self, e);
				},
				reset: function(e){
					e.preventDefault();
					console.log('reset');
				}
			});
		}
		return this;
	};

	G.extend(FormHandler.prototype, {
		validate: function () {
			return _validateAll.call(this);
		},
		validateOne: function ( field ) {
			field = this.form.find(field);
			if ( el.length > 0 )
			return _validateOne.call(this, field);
		},
		disable: function () {

		},
		enable: function () {

		},
		reset: function () {
			console.log('reset');
		},
		submit: function ( options ) {
			_handleSubmit.call(this, options );
		}
	});


	// //////////////////////////////////////////////////////////////////////////
	// Factory
	// /////////////////////////////////////////////////////////////////////////
	var factory = function (forms, options) {
		var formsObj, formElements,
			warningHandler = 'Graphite FormHandler: This form already has a handler. ' +
					'Set "override: true" to override handler. ' +
					'Nothing has happened to the current handler.',
			warningNoElements = 'No element is found to put formhandler on';

		options = options || {};
		formsObj = {};

		formElements = forms instanceof jQuery === false ? G.query('form') : forms  || !forms || forms.toString() !== '[object NodeList]';

		// formEls filteres til kun at indeholde form med data-form-handler
		formElements = $(formElements).filter(function ( i, el ) {
			var dataHandler = G.attrOptions(el, ['data-form-handler']);
			return dataHandler ? dataHandler.formHandler : false;
		});
		if ( formElements.length>0 && formElements.length > 1 ) {

			G.each(formElements, function (form, i) {
				if ( !form.formHandler || options.override === true ) {
					var name = _getAttr( form ) || form.getAttribute('name') || 'form'+ i;
					form.formHandler = formsObj[name] = new FormHandler(form, options);
				} else {
					formsObj[name] = form.formHandler;
					G.warn( warningHandler, form );
				}
			});
			return formsObj;
		} else if (formElements.length>0 && !formElements[0].formHandler || options.override === true && formElements.length>0 ) {
			return formElements[0].formHandler = new FormHandler(formElements[0], options);
		} else {
			if(formElements.length <1 ) {
				G.warn( warningNoElements );
			} else if(formElements[0].formHandler){
				G.warn( warningHandler );
			}
			return forms;
		}
	};

	/*
	 * add library to 'has' checklist
	 */
	G.has.add('formhandler', true);
	return G.extend(Graphite, { formhandler: factory });


}));