/*!
 * Graphite Codegrabber Extension
 * http://graphite.github.io ( maybe )
 *
 * Copyright 2014, LBi Denmark
 *
 * @author Rasmus Elken <Rasmus.Elken@digitaslbi.com> | <rasmuselken@gmail.com>
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

//	'use strict';
	/*
	 * Failsafe
	 */
	if ( !G ) return window.console ? console.warn('Graphite Core is not available!') : false;
	if ( G.is.ie() < 9 ) { return false; }
	if ( typeof(Codegrabber) !=="undefined" ) return;



	// //////////////////////////////////////////////////////////////////////////
	// Private methods & values
	// //////////////////////////////////////////////////////////////////////////
	var _w = window,
		_config = {},
		_allElems = document.body.getElementsByTagName('*'),
		_allElemsRaw = (function () {
			var el = document.createElement('DIV');
			el.innerHTML = new String(document.body.innerHTML);
			return el.getElementsByTagName('*');
		})(),
		// all live codegrab elements
		_codeGrabElemsLive,
		// get the raw source elements for reference
		_codeGrabElemsRaw,
		/**
		 * Make html to encoded html
		 * @param html
		 * @returns {XML|string}
		 * @private
		 */

		_htmlEncode = function(html){
			return html.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
		},
		/**
		 * Get the ieVersion
		 * @returns {Number}
		 * @private
		 */
		_ieVersion = function(){
			var myNav = navigator.userAgent.toLowerCase();
			return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1]) : false;
		},
		_getBrowser = function(){
			var N=navigator.appName, ua=navigator.userAgent, tem;
			var M=ua.match(/(opera|chrome|safari|firefox|msie)\/?\s*(\.?\d+(\.\d+)*)/i);
			if(M && (tem= ua.match(/version\/([\.\d]+)/i))!= null) M[2]= tem[1];
			M=M? [M[1], M[2]]: [N, navigator.appVersion, '-?'];
			return M[0];
		},
		_getBrowserVersion = function(){
			var N=navigator.appName, ua=navigator.userAgent, tem;
			var M=ua.match(/(opera|chrome|safari|firefox|msie)\/?\s*(\.?\d+(\.\d+)*)/i);
			if(M && (tem= ua.match(/version\/([\.\d]+)/i))!= null) M[2]= tem[1];
			M=M? [M[1], M[2]]: [N, navigator.appVersion, '-?'];
			return M[1];
		},
		/**
		 * Function to toggle a class on and off.
		 * @param element
		 * @param className
		 */
		_toggleClass = function (element, className){
			if (!element || !className){
				return;
			}
			var classString = element.className, nameIndex = classString.indexOf(className);
			if (nameIndex == -1) {
				classString += ' ' + className;
			}
			else {
				classString = classString.substr(0, nameIndex) + classString.substr(nameIndex+className.length);
			}
			element.className = classString;
		},
		/**
		 * function for checking if element is child of element with a special class.
		 * @param elem
		 * @param parentClassNeedle
		 * @returns {boolean}
		 */
		_hasParents = function (elem, parentClass){
			var _elem = elem,
				retVal = false;
				
			while(_elem.parentNode && _elem.parentNode.className && _elem.parentNode.tagName !== 'BODY'){
				if(_elem.parentNode.className.indexOf(parentClass) > -1){
					return true;
					break;
				}
				else if(_hasDataAttr(_elem.parentNode, parentClass)){
					return true;
					break;
				}
				_elem = _elem.parentNode;
			}
			return retVal;
		},

		/**
		 * function that wraps an element in a tag
		 * @param elem
		 * @param wrapElemType
		 * @param wrapElemClass
		 * @returns {html-elem}
		 */
		_wrapElement = function (elem, wrapElemType, wrapElemClass){
			var wrapper = document.createElement(wrapElemType);
			wrapper.className = wrapElemClass;
			wrapper.appendChild(elem.cloneNode(true));
			elem.parentNode.replaceChild(wrapper, elem);
			return wrapper;
		},
		/**
		 * Function to unwrap elements.
		 * @param elem
		 * @private
		 */
		_unwrapElement = function(elem){
			while( elem.children[0] ) {
				var parent = elem;
				while( elem.children[0] ) {
					elem.parentNode.insertBefore( elem.children[0], elem);
				}
				elem.parentNode.removeChild( elem );
			}
		},
		/**
		 * add a class to an element.
		 * @param elem
		 * @private
		 */
		_addClass = function(elem, className){
			elem.className += " "+className;
		},
		/**
		 * remove a class from an element.
		 * @param elem
		 * @private
		 */
		_removeClass = function(elem, removeClass){
			elem.className = elem.className.replace(removeClass, '' );
		},
		/**
		 *
		 * @param attribute
		 * @param searchContainer
		 * @returns {Array}
		 * @private
		 */
		_getElementsByDataAttribute = function(dataAttrName, fromSource) {

			var nodeList = fromSource ? _allElemsRaw : _allElems,
				nodeArray = [],
				attr,
				dataAttr;

			for (var i = 0, node; node = nodeList[i]; i++) {
				dataAttr = _hasDataAttr(node, dataAttrName);
				if(dataAttr !== undefined ){
					node.name = dataAttr;
					nodeArray.push(node);
				}
			}
			return nodeArray.length > 0 ? nodeArray : null ;
		},
		_hasDataAttr = function(elem, dataNeedle){
			var attr, retVal=undefined;
			if(elem.attributes){
				for(var j=0; attr = elem.attributes[j]; j++){
					if(attr.name.indexOf(dataNeedle)>= 0){
						retVal = attr.name;
					}
				}
			} else {
				retVal = false;
			}

			return retVal;
		},
		_getElementsByClass = function(searchClass, fromSource){
			var nodeList = fromSource ? _allElemsRaw : _allElems,
				nodeArray = [];
			for (var i = 0, j = 0; i < nodeList.length; i++) {
				if ( nodeList[i].className.indexOf(searchClass) > -1 ) { // check if the classname matches.
					nodeArray[j] = nodeList[i]; // if it does, push in array.
					nodeArray[j].name = nodeList[i].className;
					j++;
				}
			}
			return nodeArray;
		},
		/**
		 * description: get all elements we want to modify with codegrab
		 * @param {array}    searchArray    Array of classnames to search for
		 * @return {Array} Returns array of elements
		 */
		_getElements = function (searchSelectors, fromSource){
			var elements = [],
				searchElem,
				retVal,
				nodeList = fromSource ? _allElemsRaw : _allElems,
				nodeArray = [],
				getSelectorType = function(searchClass){
					var retVal;
					if(searchClass.substring(0,1) === '.'){
						retVal = 'class';
					} else if(searchClass.substring(0,1) === '#'){
						retVal = 'id'
					} else if(searchClass.substring(0,5) === 'data-'){
						retVal = 'data'
					}
					return retVal;
				},
				getElementsBySelectorType = function(searchSelector, fromSource){
					switch(getSelectorType(searchSelector))
					{
						case 'class':
							nodeArray = _getElementsByClass(searchSelector.substring(1), fromSource);
							break;
						case 'id':
							nodeArray = _getElementsByClass(searchSelector.substring(1), fromSource);
							break;
						case 'data':
							nodeArray = _getElementsByDataAttribute(searchSelector, fromSource);
							break;
						default:
							nodeArray = [];
					}
					return nodeArray;
				};
			if(typeof searchSelectors == "object"){
				if(searchSelectors.length > 0){
					for(var i=0; i < searchSelectors.length; i++){
						nodeArray = getElementsBySelectorType(searchSelectors[i], fromSource);
						if(nodeArray && nodeArray.length > 0 ){
							elements.push.apply(elements, nodeArray);
						}
					}
					if(elements.length > 0 ){
						retVal = elements;

					} else {
						retVal = null;
					}
				}
			} else if(typeof searchSelectors == "string"){
				retVal = getElementsBySelectorType(searchSelectors, fromSource);
			}
			if(retVal && retVal.length === 1){
				retVal = retVal[0];
			}
			return retVal;
			
		},

		/**
		 * Create a debug menu
		 */
		_createMenu = function (){
			var menu = document.createElement('div');
			menu.className = 'menu collapsed';
			menu.id = 'menu';
			var browserInformation = "Browser: " + _getBrowser() +" "+ _getBrowserVersion(),
				pageUrl = encodeURI(document.location.href).replace('#', '%23'); // encode hash.

			var menuElements = "" +
				"<a href='#' class='js-small-menu'><span class='small-menu-title'>MENU</span><i class='icon-settings'></i></a>" +
				"<div class='menu-elems js-large-menu'>" +
				"	<div class='menu-section-header'>SETTINGS</div>" +
				"	<div class='menu-section'>" +
				"		<a class='btn-codegrabber type-of-debug' data-debug-type='simple' href='#'><i class='icon-markup-simple' /></i>Show Simple</a>" +
				"		<a class='btn-codegrabber type-of-debug' data-debug-type='detailed' href='#'><i class='icon-markup-detailed' /></i>Show Detailed</a>" +
				"		<a class='btn-codegrabber layout-toggle' data-debug-type='layout' href='#'><i class='icon-markup-layout' /></i>Toggle Layout</a>" +
				"		<a class='btn-codegrabber code-toggle' href='#'><i class='icon-toggle-code' /></i>Toggle code</a>" +
				"	</div>";
				if(_config.jiraPid){
					menuElements += "<div class='menu-section-header'>TESTING</div>" +
				"	<div class='menu-section'>" +
				"		<a class='btn-codegrabber jira-issue' href='"+_config.jiraBaseurl+_config.jiraCreatePath+"?pid="+_config.jiraPid+"&issuetype=1&summary="+pageUrl+"&description="+browserInformation+"' target='blank'><i class='icon-jira' /></i>Create Jira Issue</a>" +
				"	</div>";
				};
				menuElements +=	"</div>" +
								"<p class='menu-shortcuts'>Press command+d or control+d <br />to toggle settings</p>";

			document.body.insertBefore(menu,document.body.childNodes[0]);
			document.getElementById('menu').innerHTML = menuElements;

			// CHANGE "VIEW"

			var menuBtns = _getElementsByClass('type-of-debug');
			for( var i=0; i < menuBtns.length; i++){

				menuBtns[i].onclick = function(e){
					var event = e || window.event;
					event.preventDefault ? event.preventDefault() : event.returnValue = false;
					_config.debugType = this.getAttribute("data-debug-type");
					var menuDebugBtns = _getElementsByClass('type-of-debug');
					for(var j= 0; j<menuDebugBtns.length; j++){
						_removeClass(menuDebugBtns[j], 'selected');
					}
					_addClass(this, 'selected');
					_update();
				};
			}



			// TOGGLE MENU ON CLICK
			_getElementsByClass('js-small-menu')[0].onclick = function(e){
				var event = e || window.event;
				event.preventDefault ? event.preventDefault() : event.returnValue = false;
				_toggleClass(menu, 'collapsed');
			}
			//TOGGLE CODE
			_getElements('.code-toggle').onclick = function(e){
				var event = e || window.event;
				event.preventDefault ? event.preventDefault() : event.returnValue = false;
				_toggleClass(document.body, 'hide-code');

			}
			_getElements('.layout-toggle').onclick = function(e){
				var event = e || window.event;
				event.preventDefault ? event.preventDefault() : event.returnValue = false;
				_toggleClass(document.body, 'show-layout');

			}
		},
		/**
		 * Make Command+d a shortcut for collapsing/expand menu
		 * @private
		 */
		_addKeyboardShortcuts = function(){
			var isCommand = false,
				menu = document.getElementById('menu', true);

			document.onkeydown = function(e){
				var event = e || window.event;
				if(event.keyCode == 91 || event.keyCode == 17) isCommand=true;
				if(event.keyCode == 68 && isCommand == true) {
					_toggleClass(menu, 'collapsed');
					return false;
				}
			}
			document.onkeyup = function(e){
				var event = e || window.event;
				if(event.keyCode == 91 || event.keyCode == 17){
					isCommand = false;
				}
			}
		},
		/**
		 * description: Function for creating textareas with markup in
		 * @param {array}	elemArray	Array of elements to create codegrabs for
		 */
		_createCodeGrab = function (elemArrayRaw, elemArrayLive) {
			function addCodeGrab(elemRaw, elemLive){
				var isNode =elemRaw && elemLive && elemRaw.nodeType == 1 && elemLive.nodeType == 1;
				if(isNode){
					var isComponent = elemRaw.name.indexOf('data-c-')>-1,
						isModuleChild = _hasParents(elemRaw, 'data-m-');
					if( isComponent  && !isModuleChild || !isComponent){ // check it is a component/module in a module.. then we do not want to create the docblock.
						var moduleTitle=elemRaw.name || "No title";
						var moduleHeader = document.createElement('h2');
							moduleHeader.className = 'module-header';
							moduleHeader.innerHTML = moduleTitle;
						// only insert header if we use styled version.
						if(_config.debugType == _config.debugTypes.detailed){
							elemLive.parentNode.insertBefore(moduleHeader, elemLive);
						}
						// create a containr for the codegrab
						var codeGrabContainer = document.createElement('div');
							codeGrabContainer.className = 'code-grab toggle-code';
							codeGrabContainer.title		= 'code-grab-for-' + elemRaw.className;

						// Append textarea for holding code.
						var codeGrabTextArea = document.createElement('textarea');
							codeGrabTextArea.name 		= 'code-grab-textarea';
							codeGrabTextArea.className		= 'code-grab-textarea';
							codeGrabTextArea.readOnly 	= true;

						//Append the highlighting code.
						var codeGrabHighlight = document.createElement('code');
							codeGrabHighlight.className = 'code-grab-highlight';
							codeGrabHighlight.setAttribute('contenteditable', 'true');
						var pre = document.createElement('pre');
							pre.className = "language-markup";
							pre.appendChild(codeGrabHighlight);
							codeGrabHighlight.innerHTML = _htmlEncode(elemRaw.outerHTML);

						// If we want to use css styles
						if(_config.debugType == _config.debugTypes.detailed){
							// append codeGrabContainer after the module/component.
							elemLive.parentNode.insertBefore(codeGrabContainer, elemLive.nextSibling);
							// set the textarea-value to the markup of the elem.
							codeGrabTextArea.value = elemRaw.outerHTML;
						} else {
							// if we do not use styles, we want the code-grab-teaxtarea inside the module.
							// remove data-attr
							elemLive.removeAttribute("data-"+_config.dataSelector);
							// set the textarea-value to the markup of the elem.
							codeGrabTextArea.value = elemRaw.outerHTML;
							// append the text-area to the code-container.
							elemLive.appendChild(codeGrabContainer);
						}
						// and append the textarea to the codegrabcontainer.
						if(_config.debugType == _config.debugTypes.detailed){
							codeGrabContainer.appendChild(pre);
						} else{
							codeGrabContainer.appendChild(codeGrabTextArea);
						}

						// wrap the module/component in new element if we use styles.
						if(_config.debugType == _config.debugTypes.detailed){
							elemLive = _wrapElement(elemLive, 'div', 'doc-block');
						}

						//attach click-handler for selecting all text in text area.
						if(_config.debugType == _config.debugTypes.detailed){
							codeGrabHighlight.onfocus = function() {
								window.setTimeout(function() {
									var sel, range;
									if (window.getSelection && document.createRange) {
										range = document.createRange();
										range.selectNodeContents(codeGrabHighlight);
										sel = window.getSelection();
										sel.removeAllRanges();
										sel.addRange(range);
									} else if (document.body.createTextRange) {
										range = document.body.createTextRange();
										range.moveToElementText(codeGrabHighlight);
										range.select();
									}
								}, 1);
							};
							codeGrabHighlight.onblur = function(){
								Prism.highlightElement(codeGrabHighlight);
							}
						}
						if(_config.debugType == _config.debugTypes.simple){
							codeGrabTextArea.onfocus = function() {
								var self = this;
								setTimeout(function () {
									self.select();
								},100)
							};
						}
					}
				}
			}

			if(elemArrayRaw && elemArrayRaw.length==undefined){
				addCodeGrab(elemArrayRaw, elemArrayLive)
			} else if(elemArrayRaw && elemArrayRaw.length > 1){
				// for all other elements extend the elementsarray with the searched elements by classname.
				for(var i=0; i < elemArrayRaw.length; i++){
					addCodeGrab(elemArrayRaw[i], elemArrayLive[i]);
				}
			}
			else{
//				console.log('No elements with selector "'+ _config.chosenSelectors +'" found to make codegrab on!')
			}
		},
		/**
		 * description: A function to create a stylesheet for styling the codegrabs and such.
		 */
		_setBasicStyles = function (){

			// create inline stylesheet.
			var style = document.createElement('style');
			style.type = 'text/css';

			var cssString;
			// basic styles
			cssString =	"\
				::selection {\
					background: white;\
					color: black;\
				}\
				::-moz-selection {\
					background: white; \
					color: black;\
				}\
				code{\
					outline: none;\
				}\
				body.hide-code .toggle-code{\
					display: none;\
				}\
				#menu {\
					position: fixed;\
					width: 200px;\
					height: 100%;\
					background: rgba(31,31,31,1);\
					background: -moz-linear-gradient(left, rgba(31,31,31,1) 0%, rgba(20,20,20,0.98) 100%);\
					background: -webkit-gradient(left top, right top, color-stop(0%, rgba(31,31,31,1)), color-stop(100%, rgba(20,20,20,0.98)));\
					background: -webkit-linear-gradient(left, rgba(31,31,31,1) 0%, rgba(20,20,20,0.98) 100%);\
					background: -o-linear-gradient(left, rgba(31,31,31,1) 0%, rgba(20,20,20,0.98) 100%);\
					background: -ms-linear-gradient(left, rgba(31,31,31,1) 0%, rgba(20,20,20,0.98) 100%);\
					background: linear-gradient(to right, rgba(31,31,31,1) 0%, rgba(20,20,20,0.98) 100%);\
					filter: progid:DXImageTransform.Microsoft.gradient( startColorstr='#1f1f1f', endColorstr='#141414', GradientType=1 );\
					box-shadow: #333333 0px 1px 3px 0px;\
					top: 0;\
					right: 0;\
					font-family: Helvetica, verdana;\
					-webkit-transition: right 0.2s ease-in-out;\
					-moz-transition: right 0.2s ease-in-out;\
					-ms-transition: right 0.2s ease-in-out;\
					-o-transition: right 0.2s ease-in-out;\
					transition: right 0.2s ease-in-out;\
					font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;\
					z-index: 9999;\
				}\
				#menu .menu-elems{\
					background-color: rgba(0, 0, 0, 0.3);\
					background: rgba(0, 0 0, 0.3);\
					color:white;\
					color: rgba(0, 0, 0, 0.3);\
				}\
				#menu .js-small-menu{\
					position:fixed;\
					left: auto;\
					right: 4px;\
					top:8px;\
				}\
				#menu .js-small-menu:link, #menu .js-small-menu:hover, #menu .js-small-menu:visited, #menu .js-small-menu:active{\
					text-decoration: none;\
				}\
				#menu .small-menu-title{\
					color:#474747;\
					font-size: 12px;\
					display:none;\
					*display: inline;\
					display: inline;\
				}\
				#menu.collapsed{\
					right: -200px;\
				}\
				#menu.collapsed .js-small-menu{\
					display:inline-block;\
				}\
				.menu-section-header{\
					font-size:12px;\
					color: #ccc;\
					padding: 10px 5px 10px 10px;\
				}\
				.menu-elems .btn-codegrabber{\
					width: 100%;\
					background-color: #383838;\
					border-bottom: 1px solid #474747;\
					background-image: -webkit-gradient(\
						linear,\
							left top,\
							right bottom,\
							color-stop(0, #383838),\
						color-stop(1, #292929)\
					);\
					background-image: -o-linear-gradient(right bottom, #383838 0%, #292929 100%);\
					background-image: -moz-linear-gradient(right bottom, #383838 0%, #292929 100%);\
					background-image: -webkit-linear-gradient(right bottom, #383838 0%, #292929 100%);\
					background-image: -ms-linear-gradient(right bottom, #383838 0%, #292929 100%);\
					background-image: linear-gradient(to right bottom, #383838 0%, #292929 100%);\
				}\
				.menu-elems .btn-codegrabber:hover{\
					color:white;\
					background-color: #292929;\
					background-image: -webkit-gradient(\
						linear,\
							left top,\
							right bottom,\
							color-stop(0.1, #3B3B3B),\
						color-stop(1, #424242)\
					);\
					background-image: -o-linear-gradient(right bottom, #3B3B3B 10%, #424242 100%);\
					background-image: -moz-linear-gradient(right bottom, #3B3B3B 10%, #424242 100%);\
					background-image: -webkit-linear-gradient(right bottom, #3B3B3B 10%, #424242 100%);\
					background-image: -ms-linear-gradient(right bottom, #3B3B3B 10%, #424242 100%);\
					background-image: linear-gradient(to right bottom, #3B3B3B 10%, #424242 100%);\
				}\
				.menu-elems .btn-codegrabber.selected{\
					border-left: 2px solid #2CA4C4;\
				}\
				.menu-elems .btn-codegrabber:first-child{\
					border-top: 1px solid #474747;\
				}\
				.btn-codegrabber {\
					display: block;\
					background: #292929;\
					padding: 10px;\
					color: #ccc;\
					font-size: 11px;\
					text-decoration: none;\
					margin-right: -4px;\
				}\
				.menu-shortcuts{\
					font-size: 10px;\
					color:grey;\
					padding: 5px 10px;\
					margin: 0;\
				}\
				.code-toggle{\
					border-left: 2px solid #67C65D;\
				}\
				.hide-code .code-toggle{\
					border-left: 2px solid #CC4A4A;\
				}\
				.layout-toggle{\
					border-left: 2px solid #CC4A4A;\
				}\
				.show-layout .layout-toggle{\
					border-left: 2px solid  #67C65D;\
				}\
				.code-grab-textarea{\
					font-size: 10px;\
				}\
				.code-grab-highlight{\
					width: 50%;\
					color: #fff;\
				}\
				.show-layout .c_row{\
					outline: 1px solid blue; \
					outline-offset: -2px; \
				}\
				.show-layout .columns{\
					outline: 1px solid green; \
					outline-offset: -5px; \
					background: rgba(155,155,155,0.2); \
				}\
				\
				\
				//PRISM CSS\
				code[class*='language-'],pre[class*='language-']{color:#f8f8f2;text-shadow:0 1px rgba(0,0,0,0.3);font-family:Consolas,Monaco,'Andale Mono',monospace;direction:ltr;text-align:left;white-space:pre;word-spacing:normal;word-break:normal;-moz-tab-size:4;-o-tab-size:4;tab-size:4;-webkit-hyphens:none;-moz-hyphens:none;-ms-hyphens:none;hyphens:none}pre[class*='language-']{padding:1em;margin:.5em 0;overflow:auto;border-radius:.3em}:not(pre)>code[class*='language-'],pre[class*='language-']{background:#272822}:not(pre)>code[class*='language-']{padding:.1em;border-radius:.3em}.token.comment,.token.prolog,.token.doctype,.token.cdata{color:slategray}.token.punctuation{color:#f8f8f2}.namespace{opacity:.7}.token.property,.token.tag,.token.constant,.token.symbol{color:#f92672}.token.boolean,.token.number{color:#ae81ff}.token.selector,.token.attr-name,.token.string,.token.builtin{color:#a6e22e}.token.operator,.token.entity,.token.url,.language-css .token.string,.style .token.string,.token.variable{color:#f8f8f2}.token.atrule,.token.attr-value{color:#e6db74}.token.keyword{color:#66d9ef}.token.regex,.token.important{color:#fd971f}.token.important{font-weight:bold}.token.entity{cursor:help}.token a{color:inherit}\
				/**\
				\
				\
				*****ICONS***** \
				**/\
				[class^='icon-'],\
				[class*='icon-']{\
					background-repeat: no-repeat;\
					display: inline-block;\
					background-size: contain;\
					vertical-align: middle;\
				}\
				.icon-settings{\
					width:25px;\
					height:25px;\
					background-size: contain;\
					background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNS4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAgLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiIFsNCgk8IUVOVElUWSBuc19mbG93cyAiaHR0cDovL25zLmFkb2JlLmNvbS9GbG93cy8xLjAvIj4NCl0+DQo8c3ZnIHZlcnNpb249IjEuMSINCgkgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeG1sbnM6YT0iaHR0cDovL25zLmFkb2JlLmNvbS9BZG9iZVNWR1ZpZXdlckV4dGVuc2lvbnMvMy4wLyINCgkgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI0OXB4IiBoZWlnaHQ9IjQ5cHgiIHZpZXdCb3g9Ii0wLjUgLTAuNSA0OSA0OSINCgkgb3ZlcmZsb3c9InZpc2libGUiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgLTAuNSAtMC41IDQ5IDQ5IiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxkZWZzPg0KPC9kZWZzPg0KPHBhdGggZmlsbD0iIzdDN0M3QyIgZD0iTTI2LDQ4aC00Yy0xLjY1NCwwLTMtMS4zNDYtMy0zdi0zLjcyNWMtMS4yOC0wLjM2OS0yLjUxMi0wLjg4MS0zLjY4MS0xLjUyNmwtMi42MzQsMi42MzUNCgljLTEuMTM0LDEuMTM0LTMuMTA5LDEuMTMyLTQuMjQzLDBsLTIuODI5LTIuODI3Yy0wLjU2Ny0wLjU2Ni0wLjg3OS0xLjMyLTAuODc5LTIuMTIxYzAtMC44MDIsMC4zMTItMS41NTYsMC44NzktMi4xMjFsMi42MzUtMi42MzcNCgljLTAuNjQ1LTEuMTY2LTEuMTU2LTIuMzk3LTEuNTI1LTMuNjc5SDNjLTEuNjU0LDAtMy0xLjM0Ny0zLTN2LTRjMC0wLjgwMiwwLjMxMi0xLjU1NSwwLjg3OC0yLjEyMQ0KCWMwLjU2Ny0wLjU2NiwxLjMyLTAuODc5LDIuMTIyLTAuODc5aDMuNzI0YzAuMzctMS4yNzgsMC44OC0yLjUxMSwxLjUyNi0zLjY3OWwtMi42MzQtMi42MzVjLTEuMTctMS4xNy0xLjE3LTMuMDcyLDAtNC4yNDINCglsMi44MjgtMi44MjljMS4xMzMtMS4xMzIsMy4xMDktMS4xMzQsNC4yNDMsMGwyLjYzNSwyLjYzNWMxLjE2OC0wLjY0NSwyLjQtMS4xNTYsMy42NzgtMS41MjVWM2MwLTEuNjU0LDEuMzQ2LTMsMy0zaDQNCgljMS42NTQsMCwzLDEuMzQ2LDMsM3YzLjcyNGMxLjI3OSwwLjM3LDIuNTEyLDAuODgxLDMuNjc4LDEuNTI1bDIuNjM1LTIuNjM1YzEuMTM1LTEuMTMyLDMuMTA5LTEuMTM0LDQuMjQ0LDBsMi44MjgsMi44MjgNCgljMC41NjcsMC41NjYsMC44NzksMS4zMiwwLjg3OSwyLjEyMWMwLDAuODAxLTAuMzEyLDEuNTU1LTAuODc5LDIuMTIxbC0yLjYzNCwyLjYzNWMwLjY0NiwxLjE2OCwxLjE1NywyLjQsMS41MjYsMy42OEg0NQ0KCWMxLjY1NCwwLDMsMS4zNDYsMywzdjRjMCwwLjgwMi0wLjMxMiwxLjU1Ni0wLjg3OCwyLjEyMXMtMS4zMiwwLjg3OS0yLjEyMiwwLjg3OWgtMy43MjVjLTAuMzY5LDEuMjgtMC44ODEsMi41MTMtMS41MjUsMy42ODENCglsMi42MzQsMi42MzVjMS4xNzEsMS4xNywxLjE3MSwzLjA3MSwwLDQuMjQybC0yLjgyNywyLjgyOGMtMS4xMzUsMS4xMzMtMy4xMDksMS4xMzMtNC4yNDQsMEwzMi42OCwzOS43NQ0KCWMtMS4xNjgsMC42NDYtMi40LDEuMTU2LTMuNjc5LDEuNTI1VjQ1QzI5LDQ2LjY1NCwyNy42NTQsNDgsMjYsNDh6IE0xNS4xNTcsMzcuNDk4YzAuMTc5LDAsMC4zNiwwLjA0OCwwLjUyMSwwLjE0Ng0KCWMxLjQxNiwwLjg2NSwyLjk0OSwxLjUwMiw0LjU1NywxLjg5MUMyMC42ODQsMzkuNjQ1LDIxLDQwLjA0NSwyMSw0MC41MDdWNDVjMCwwLjU1MiwwLjQ0OSwxLDEsMWg0YzAuNTUxLDAsMS0wLjQ0OCwxLTF2LTQuNDkzDQoJYzAtMC40NjIsMC4zMTYtMC44NjIsMC43NjYtMC45NzJjMS42MDUtMC4zODksMy4xMzktMS4wMjMsNC41NTUtMS44OTFjMC4zOTYtMC4yNCwwLjkwMi0wLjE4LDEuMjI5LDAuMTQ2bDMuMTc5LDMuMTc5DQoJYzAuMzc1LDAuMzc0LDEuMDM5LDAuMzc2LDEuNDE0LDBsMi44MjgtMi44MjljMC4zOTEtMC4zOSwwLjM5MS0xLjAyMywwLTEuNDE0bC0zLjE3OS0zLjE3OWMtMC4zMjctMC4zMjUtMC4zODgtMC44MzUtMC4xNDYtMS4yMjkNCgljMC44NjUtMS40MTMsMS41LTIuOTQ2LDEuODg5LTQuNTU1YzAuMTA3LTAuNDQ5LDAuNTEtMC43NjcsMC45NzItMC43NjdINDVjMC4yNjgsMCwwLjUyLTAuMTA0LDAuNzA4LTAuMjkzDQoJQzQ1Ljg5NiwyNi41MTgsNDYsMjYuMjY4LDQ2LDI1Ljk5OXYtNGMwLTAuNTUyLTAuNDQ5LTEtMS0xaC00LjQ5M2MtMC40NjIsMC0wLjg2NC0wLjMxNi0wLjk3Mi0wLjc2Ng0KCWMtMC4zODktMS42MDctMS4wMjMtMy4xNC0xLjg4OS00LjU1NmMtMC4yNDItMC4zOTQtMC4xODItMC45MDEsMC4xNDYtMS4yMjlsMy4xNzktMy4xNzljMC4xODctMC4xODcsMC4yOTMtMC40NDQsMC4yOTMtMC43MDcNCglzLTAuMTA2LTAuNTIxLTAuMjkzLTAuNzA3bC0yLjgyOC0yLjgyOGMtMC4zNzktMC4zNzctMS4wMzctMC4zNzctMS40MTYsMGwtMy4xNzksMy4xNzljLTAuMzI1LDAuMzI4LTAuODMzLDAuMzg5LTEuMjI5LDAuMTQ2DQoJYy0xLjQxMi0wLjg2NC0yLjk0NC0xLjUtNC41NTMtMS44ODlDMjcuMzE2LDguMzU2LDI3LDcuOTU1LDI3LDcuNDkzVjNjMC0wLjU1Mi0wLjQ0OS0xLTEtMWgtNGMtMC41NTEsMC0xLDAuNDQ4LTEsMXY0LjQ5Mw0KCWMwLDAuNDYyLTAuMzE2LDAuODYzLTAuNzY1LDAuOTcyYy0xLjYwNiwwLjM4OC0zLjEzOSwxLjAyMy00LjU1NiwxLjg4OWMtMC4zOTUsMC4yNDEtMC45MDIsMC4xODEtMS4yMjgtMC4xNDZsLTMuMTc5LTMuMTc5DQoJYy0wLjM3OC0wLjM3Ny0xLjAzNy0wLjM3Ny0xLjQxNSwwTDcuMDMsOS44NTdjLTAuMzksMC4zOS0wLjM5LDEuMDI0LDAsMS40MTRsMy4xNzksMy4xNzljMC4zMjcsMC4zMjYsMC4zODcsMC44MzUsMC4xNDYsMS4yMjkNCgljLTAuODY2LDEuNDE2LTEuNTAxLDIuOTQ5LTEuODg5LDQuNTU1QzguMzU4LDIwLjY4Myw3Ljk1NiwyMSw3LjQ5NCwyMUgzYy0wLjI2NywwLTAuNTE5LDAuMTA0LTAuNzA4LDAuMjkzDQoJQzIuMTA0LDIxLjQ4LDIsMjEuNzMxLDIsMjEuOTk5djRjMCwwLjU1MiwwLjQ0OSwxLDEsMWg0LjQ5M2MwLjQ2MiwwLDAuODY0LDAuMzE1LDAuOTcyLDAuNzY3YzAuMzg5LDEuNjA3LDEuMDI0LDMuMTQxLDEuODg5LDQuNTU1DQoJYzAuMjQxLDAuMzk0LDAuMTgxLDAuOS0wLjE0NiwxLjIyOWwtMy4xNzksMy4xOGMtMC4xODYsMC4xODgtMC4yOTMsMC40NDQtMC4yOTMsMC43MDdjMCwwLjI2NCwwLjEwNywwLjUyMSwwLjI5MywwLjcwN2wyLjgyOSwyLjgyOA0KCWMwLjM3NywwLjM3NywxLjAzNywwLjM3NywxLjQxNSwwbDMuMTc4LTMuMTc5QzE0LjY0MywzNy41OTgsMTQuODk4LDM3LjQ5OCwxNS4xNTcsMzcuNDk4eiIvPg0KPHBhdGggZmlsbD0iIzdDN0M3QyIgZD0iTTI0LDM0Yy01LjUxNCwwLTEwLTQuNDg2LTEwLTEwYzAtNS41MTQsNC40ODYtMTAsMTAtMTBjNS41MTQsMCwxMCw0LjQ4NiwxMCwxMEMzNCwyOS41MTQsMjkuNTE2LDM0LDI0LDM0eg0KCSBNMjQsMTZjLTQuNDExLDAtOCwzLjU4OS04LDhzMy41ODksOCw4LDhzOC0zLjU4OSw4LThTMjguNDEyLDE2LDI0LDE2eiIvPg0KPC9zdmc+DQo=);\
				}\
				.icon-markup-simple{\
					width: 25px;\
					height: 20px;\
					background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNS4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAgLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiIFsNCgk8IUVOVElUWSBuc19mbG93cyAiaHR0cDovL25zLmFkb2JlLmNvbS9GbG93cy8xLjAvIj4NCl0+DQo8c3ZnIHZlcnNpb249IjEuMSINCgkgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeG1sbnM6YT0iaHR0cDovL25zLmFkb2JlLmNvbS9BZG9iZVNWR1ZpZXdlckV4dGVuc2lvbnMvMy4wLyINCgkgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSIzNXB4IiBoZWlnaHQ9IjQ3cHgiIHZpZXdCb3g9Ii0wLjE1MSAtMC45NzIgMzUgNDciDQoJIG92ZXJmbG93PSJ2aXNpYmxlIiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IC0wLjE1MSAtMC45NzIgMzUgNDciIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGRlZnM+DQo8L2RlZnM+DQo8cGF0aCBmaWxsPSIjRkZGRkZGIiBkPSJNMjguMjUxLDBIMHY0NS4wNTdoMzQuNjk5VjYuMjVMMjguMjUxLDB6IE0zMi42OTksNDMuMDU1SDJWMmgyNS43MDd2NC43Nmg0Ljk5MlY0My4wNTV6Ii8+DQo8L3N2Zz4NCg==);\background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNS4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB3aWR0aD0iMzVweCIgaGVpZ2h0PSI0N3B4IiB2aWV3Qm94PSIwIDAgMzUgNDciIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDM1IDQ3IiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxnPg0KCTxnIG9wYWNpdHk9IjAuMyI+DQoJCTxwYXRoIGQ9Ik0yOS4yNTEsMUgxdjQ1LjA1N2gzNC42OTlWNy4yNUwyOS4yNTEsMXogTTMzLjY5OSw0NC4wNTVIM1YzaDI1LjcwN3Y0Ljc2aDQuOTkyVjQ0LjA1NXoiLz4NCgk8L2c+DQoJPGc+DQoJCTxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik0yOC4yNTEsMEgwdjQ1LjA1N2gzNC42OTlWNi4yNUwyOC4yNTEsMHogTTMyLjY5OSw0My4wNTVIMlYyaDI1LjcwN3Y0Ljc2aDQuOTkyVjQzLjA1NXoiLz4NCgk8L2c+DQo8L2c+DQo8L3N2Zz4NCg==);\
					margin-right:5px;\
				}\
				.icon-markup-detailed{\
					width: 25px;\
					height: 20px;\
					margin-right:5px;\
					background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNS4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB3aWR0aD0iMzVweCIgaGVpZ2h0PSI0N3B4IiB2aWV3Qm94PSIwIDAgMzUgNDciIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDM1IDQ3IiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxnPg0KCTxnIG9wYWNpdHk9IjAuMyI+DQoJCTxwYXRoIGQ9Ik0yOS4yNTEsMUgxdjQ1LjA1N2gzNC42OTlWNy4yNUwyOS4yNTEsMXogTTMzLjY5OSw0NC4wNTVIM1YzaDI1LjcwN3Y0Ljc2aDQuOTkyVjQ0LjA1NXoiLz4NCgk8L2c+DQoJPGc+DQoJCTxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik0yOC4yNTEsMEgwdjQ1LjA1N2gzNC42OTlWNi4yNUwyOC4yNTEsMHogTTMyLjY5OSw0My4wNTVIMlYyaDI1LjcwN3Y0Ljc2aDQuOTkyVjQzLjA1NXoiLz4NCgk8L2c+DQo8L2c+DQo8Zz4NCgk8ZyBvcGFjaXR5PSIwLjMiPg0KCQk8cGF0aCBkPSJNMjguNTkxLDEyLjE5NEg4LjEwN2MtMC4xMjYsMC0wLjIyOSwwLjA3Ny0wLjIyOSwwLjE3MnYzLjUxM2MwLDAuMDk0LDAuMTAyLDAuMTcxLDAuMjI5LDAuMTcxaDIwLjQ4NA0KCQkJYzAuMTI2LDAsMC4yMjktMC4wNzcsMC4yMjktMC4xNzF2LTMuNTEzQzI4LjgyLDEyLjI3MSwyOC43MTgsMTIuMTk0LDI4LjU5MSwxMi4xOTR6Ii8+DQoJPC9nPg0KCTxnPg0KCQk8cGF0aCBmaWxsPSIjRkZGRkZGIiBkPSJNMjcuNTkxLDExLjE5NEg3LjEwN2MtMC4xMjYsMC0wLjIyOSwwLjA3Ny0wLjIyOSwwLjE3MnYzLjUxM2MwLDAuMDk0LDAuMTAyLDAuMTcxLDAuMjI5LDAuMTcxaDIwLjQ4NA0KCQkJYzAuMTI2LDAsMC4yMjktMC4wNzcsMC4yMjktMC4xNzF2LTMuNTEzQzI3LjgyLDExLjI3MSwyNy43MTgsMTEuMTk0LDI3LjU5MSwxMS4xOTR6Ii8+DQoJPC9nPg0KPC9nPg0KPGc+DQoJPGcgb3BhY2l0eT0iMC4zIj4NCgkJPHBhdGggZD0iTTI4LjU5MSwxOS44Nkg4LjEwN2MtMC4xMjYsMC0wLjIyOSwwLjA3Ny0wLjIyOSwwLjE3MnYzLjUxM2MwLDAuMDk0LDAuMTAyLDAuMTcxLDAuMjI5LDAuMTcxaDIwLjQ4NA0KCQkJYzAuMTI2LDAsMC4yMjktMC4wNzcsMC4yMjktMC4xNzF2LTMuNTEzQzI4LjgyLDE5LjkzOCwyOC43MTgsMTkuODYsMjguNTkxLDE5Ljg2eiIvPg0KCTwvZz4NCgk8Zz4NCgkJPHBhdGggZmlsbD0iI0ZGRkZGRiIgZD0iTTI3LjU5MSwxOC44Nkg3LjEwN2MtMC4xMjYsMC0wLjIyOSwwLjA3Ny0wLjIyOSwwLjE3MnYzLjUxM2MwLDAuMDk0LDAuMTAyLDAuMTcxLDAuMjI5LDAuMTcxaDIwLjQ4NA0KCQkJYzAuMTI2LDAsMC4yMjktMC4wNzcsMC4yMjktMC4xNzF2LTMuNTEzQzI3LjgyLDE4LjkzOCwyNy43MTgsMTguODYsMjcuNTkxLDE4Ljg2eiIvPg0KCTwvZz4NCjwvZz4NCjxnPg0KCTxnIG9wYWNpdHk9IjAuMyI+DQoJCTxwYXRoIGQ9Ik0yOC41OTEsMjcuNDQ4SDguMTA3Yy0wLjEyNiwwLTAuMjI5LDAuMDc3LTAuMjI5LDAuMTcydjMuNTE0YzAsMC4wOTUsMC4xMDIsMC4xNzEsMC4yMjksMC4xNzFoMjAuNDg0DQoJCQljMC4xMjYsMCwwLjIyOS0wLjA3NiwwLjIyOS0wLjE3MVYyNy42MkMyOC44MiwyNy41MjUsMjguNzE4LDI3LjQ0OCwyOC41OTEsMjcuNDQ4eiIvPg0KCTwvZz4NCgk8Zz4NCgkJPHBhdGggZmlsbD0iI0ZGRkZGRiIgZD0iTTI3LjU5MSwyNi40NDhINy4xMDdjLTAuMTI2LDAtMC4yMjksMC4wNzctMC4yMjksMC4xNzJ2My41MTRjMCwwLjA5NSwwLjEwMiwwLjE3MSwwLjIyOSwwLjE3MWgyMC40ODQNCgkJCWMwLjEyNiwwLDAuMjI5LTAuMDc2LDAuMjI5LTAuMTcxVjI2LjYyQzI3LjgyLDI2LjUyNSwyNy43MTgsMjYuNDQ4LDI3LjU5MSwyNi40NDh6Ii8+DQoJPC9nPg0KPC9nPg0KPGc+DQoJPGcgb3BhY2l0eT0iMC4zIj4NCgkJPHBhdGggZD0iTTI4LjU5MSwzNS4zMjdIOC4xMDdjLTAuMTI2LDAtMC4yMjksMC4wNzgtMC4yMjksMC4xNzJ2My41MTVjMCwwLjA5NCwwLjEwMiwwLjE3LDAuMjI5LDAuMTdoMjAuNDg0DQoJCQljMC4xMjYsMCwwLjIyOS0wLjA3NiwwLjIyOS0wLjE3di0zLjUxNUMyOC44MiwzNS40MDUsMjguNzE4LDM1LjMyNywyOC41OTEsMzUuMzI3eiIvPg0KCTwvZz4NCgk8Zz4NCgkJPHBhdGggZmlsbD0iI0ZGRkZGRiIgZD0iTTI3LjU5MSwzNC4zMjdINy4xMDdjLTAuMTI2LDAtMC4yMjksMC4wNzgtMC4yMjksMC4xNzJ2My41MTVjMCwwLjA5NCwwLjEwMiwwLjE3LDAuMjI5LDAuMTdoMjAuNDg0DQoJCQljMC4xMjYsMCwwLjIyOS0wLjA3NiwwLjIyOS0wLjE3di0zLjUxNUMyNy44MiwzNC40MDUsMjcuNzE4LDM0LjMyNywyNy41OTEsMzQuMzI3eiIvPg0KCTwvZz4NCjwvZz4NCjwvc3ZnPg0K);\
				}\
				.icon-markup-layout{\
					width: 25px;\
					height: 20px;\
					margin-right:5px;\
					background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNS4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB3aWR0aD0iMzVweCIgaGVpZ2h0PSI0N3B4IiB2aWV3Qm94PSIwIDAgMzUgNDciIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDM1IDQ3IiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxwYXRoIGZpbGw9IiNCN0I3QjciIGQ9Ik0zNC4zNjYsMC42NEgwLjYyMnY0NS4wNTZoMzMuNzU2TDM0LjM2NiwwLjY0eiBNMzIuNDQsMi42NGwtMC4wMDIsOS4zODNIMi41NjhWMi42NEgzMi40NHogTTIuNTY4LDE0LjUwNg0KCWgxNy4xNjZ2MjkuMTg4SDIuNTY4VjE0LjUwNnogTTIyLjEyNyw0My42OTNWMTQuNTA2aDEwLjMxMmwtMC4wMDYsMjkuMTg4SDIyLjEyN3oiLz4NCjxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik0zMy43NDQsMEgwdjQ1LjA1N2gzMy43NTZMMzMuNzQ0LDB6IE0zMS44MTgsMmwtMC4wMDIsOS4zODRIMS45NDZWMkgzMS44MTh6IE0xLjk0NiwxMy44NjZoMTcuMTY0djI5LjE4OA0KCUgxLjk0NlYxMy44NjZ6IE0yMS41MDUsNDMuMDU1VjEzLjg2NmgxMC4zMTJsLTAuMDA2LDI5LjE4OEgyMS41MDVMMjEuNTA1LDQzLjA1NXoiLz4NCjwvc3ZnPg0K);\
				}\
				.icon-toggle-code{\
					width: 25px;\
					height: 15px;\
					margin-right:5px;\
					background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNS4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAgLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiIFsNCgk8IUVOVElUWSBuc19mbG93cyAiaHR0cDovL25zLmFkb2JlLmNvbS9GbG93cy8xLjAvIj4NCl0+DQo8c3ZnIHZlcnNpb249IjEuMSINCgkgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeG1sbnM6YT0iaHR0cDovL25zLmFkb2JlLmNvbS9BZG9iZVNWR1ZpZXdlckV4dGVuc2lvbnMvMy4wLyINCgkgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI0MTRweCIgaGVpZ2h0PSIyNDBweCIgdmlld0JveD0iMCAtMC41OTUgNDE0IDI0MCINCgkgb3ZlcmZsb3c9InZpc2libGUiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAtMC41OTUgNDE0IDI0MCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQo8ZGVmcz4NCjwvZGVmcz4NCjxnIGlkPSJodG1sLWNvZGUtaWNvbl8xXyI+DQoJPGcgb3BhY2l0eT0iMC4zIj4NCgkJPHBhdGggZD0iTTIzNC4wMjEsMS41aDM5LjY3NGwtOTAuMDQ4LDIzNi44MTJoLTM5LjQ1MkwyMzQuMDIxLDEuNXogTTQxMy41LDE0OC4yOWwtMTE2Ljk2OSw2NS43MzV2LTQwLjc2M2w2OC4xMDgtMzguNDA4DQoJCQlMMjk2LjUzMSw5Ni44NFY1NS45NzNMNDEzLjUsMTIxLjcxVjE0OC4yOXogTTEuNSwxMDkuNzFsMTE2Ljk3LTY1LjczNnY0MC44NjdsLTY4LjExLDM4LjAxM2w2OC4xMDksMzguNDA4djQwLjc2M0wxLjUsMTM2LjI5DQoJCQlWMTA5LjcxeiIvPg0KCQk8cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgZD0iTTIzNC4wMjEsMS41aDM5LjY3NGwtOTAuMDQ4LDIzNi44MTJoLTM5LjQ1MkwyMzQuMDIxLDEuNXoNCgkJCSBNNDEzLjUsMTQ4LjI5bC0xMTYuOTY5LDY1LjczNXYtNDAuNzYzbDY4LjEwOC0zOC40MDhMMjk2LjUzMSw5Ni44NFY1NS45NzNMNDEzLjUsMTIxLjcxVjE0OC4yOXogTTEuNSwxMDkuNzFsMTE2Ljk3LTY1LjczNg0KCQkJdjQwLjg2N2wtNjguMTEsMzguMDEzbDY4LjEwOSwzOC40MDh2NDAuNzYzTDEuNSwxMzYuMjlWMTA5LjcxeiIvPg0KCTwvZz4NCgk8Zz4NCgkJPHBhdGggZmlsbD0iI0ZGRkZGRiIgZD0iTTIzMy4wMjEsMC41aDM5LjY3NGwtOTAuMDQ4LDIzNi44MTJoLTM5LjQ1MkwyMzMuMDIxLDAuNXogTTQxMi41LDE0Ny4yOWwtMTE2Ljk2OSw2NS43MzV2LTQwLjc2Mw0KCQkJbDY4LjEwOC0zOC40MDhMMjk1LjUzMSw5NS44NFY1NC45NzNMNDEyLjUsMTIwLjcxVjE0Ny4yOXogTTAuNSwxMDguNzFsMTE2Ljk3LTY1LjczNnY0MC44NjdsLTY4LjExLDM4LjAxM2w2OC4xMDksMzguNDA4djQwLjc2Mw0KCQkJTDAuNSwxMzUuMjlWMTA4LjcxeiIvPg0KCQk8cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgZD0iTTIzMy4wMjEsMC41aDM5LjY3NGwtOTAuMDQ4LDIzNi44MTJoLTM5LjQ1MkwyMzMuMDIxLDAuNXoNCgkJCSBNNDEyLjUsMTQ3LjI5bC0xMTYuOTY5LDY1LjczNXYtNDAuNzYzbDY4LjEwOC0zOC40MDhMMjk1LjUzMSw5NS44NFY1NC45NzNMNDEyLjUsMTIwLjcxVjE0Ny4yOXogTTAuNSwxMDguNzFsMTE2Ljk3LTY1LjczNg0KCQkJdjQwLjg2N2wtNjguMTEsMzguMDEzbDY4LjEwOSwzOC40MDh2NDAuNzYzTDAuNSwxMzUuMjlWMTA4LjcxeiIvPg0KCTwvZz4NCjwvZz4NCjwvc3ZnPg0K);\
				}\
				.icon-jira{\
					width: 25px;\
					height: 20px;\
					margin-right:5px;\
					background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNS4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAgLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiIFsNCgk8IUVOVElUWSBuc19mbG93cyAiaHR0cDovL25zLmFkb2JlLmNvbS9GbG93cy8xLjAvIj4NCl0+DQo8c3ZnIHZlcnNpb249IjEuMSINCgkgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeG1sbnM6YT0iaHR0cDovL25zLmFkb2JlLmNvbS9BZG9iZVNWR1ZpZXdlckV4dGVuc2lvbnMvMy4wLyINCgkgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSIyMnB4IiBoZWlnaHQ9IjI5cHgiIHZpZXdCb3g9Ii0wLjEyNSAtMC4zMjIgMjIgMjkiDQoJIG92ZXJmbG93PSJ2aXNpYmxlIiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IC0wLjEyNSAtMC4zMjIgMjIgMjkiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGRlZnM+DQo8L2RlZnM+DQo8cGF0aCBmaWxsPSIjRkZGRkZGIiBkPSJNMTAuNjY5LDBjMS4yMjksMCwyLjIyNywwLjk5NywyLjIyNywyLjIyN2MwLDEuMjMtMC45OTcsMi4yMjctMi4yMjcsMi4yMjdTOC40NDIsMy40NTcsOC40NDIsMi4yMjcNCglDOC40NDIsMC45OTcsOS40MzksMCwxMC42NjksMHogTTQuNzMxLDEuNDg0YzEuMjI5LDAsMi4yMjcsMC45OTcsMi4yMjcsMi4yMjdjMCwxLjIzLTAuOTk3LDIuMjI3LTIuMjI3LDIuMjI3DQoJUzIuNTA1LDQuOTQxLDIuNTA1LDMuNzExQzIuNTA1LDIuNDgxLDMuNTAyLDEuNDg0LDQuNzMxLDEuNDg0eiBNMTYuNjA2LDEuNDg0YzEuMjI5LDAsMi4yMjcsMC45OTcsMi4yMjcsMi4yMjcNCgljMCwxLjIzLTAuOTk3LDIuMjI3LTIuMjI3LDIuMjI3UzE0LjM4LDQuOTQxLDE0LjM4LDMuNzExQzE0LjM4LDIuNDgxLDE1LjM3NywxLjQ4NCwxNi42MDYsMS40ODR6IE0xMC4zOTEsMTIuNjE3DQoJQzcuNDIyLDkuNjQ4LDguMTY0LDguMTY0LDguMTY0LDguMTY0aDUuMTk1QzEzLjM1OSwxMC4zOTEsMTAuMzkxLDEyLjYxNywxMC4zOTEsMTIuNjE3eiBNMTMuMzU5LDI3LjQ2MWMwLDAsMC0yLjk2OS01LjkzOC04LjkwNg0KCVMwLjc0MiwxMS4xMzMsMCw2LjY4YzAsMCwwLjU1Ny0wLjc0MiwxLjI5OSwwczIuNDEyLDEuMjk5LDMuODk2LDEuMjk5YzAsMCwxLjQ4NCw0LjYzOSw1LjU2Niw3LjYwN2MwLDAsNS4zODEtNS41NjYsNS4zODEtNy43OTMNCgljMCwwLDEuNjcsMC4zNzEsMy43MTEtMS4xMTNjMCwwLDEuMzkzLTAuNzM2LDEuNDg0LDBjMC4xODYsMS40ODQtMS4yOTksNi42OC03LjQyMiwxMS44NzVjMCwwLDMuODk2LDQuNDUzLDMuNTI1LDguOTA2SDEzLjM1OXoNCgkgTTYuNjgsMjAuMDM5bDMuMTU0LDMuNTI1Yy0xLjQ4NCwxLjQ4NC0xLjY3LDQuNjM5LTEuNjcsNC42MzlIMy43MTFDNC40NTMsMjIuMjY2LDYuNjgsMjAuMDM5LDYuNjgsMjAuMDM5eiIvPg0KPC9zdmc+DQo=);\
				}\
			";

			if(_config.debugType == _config.debugTypes.detailed){
				//styles for extended styled version.
				cssString += "\
					.doc-block{\
						border: 1px solid #ccc;\
						padding: 10px;\
					}\
					.doc-block > * {\
						border: 1px dashed #E1E1E1;\
					}\
					.code-grab {\
						border-bottom-left-radius: 2px;\
						border-bottom-right-radius: 2px;\
						border: 1px solid #CCCCCC;\
						margin: -1px 0px 10px;\
						padding: 1em;\
					}\
					.code-grab-textarea {\
						padding: 10px;\
						margin: 10px;\
						min-width: 50%;\
						border: 1px solid #E1E1E1;\
					}\
					.module-header {\
						margin: 20px 0px -1px;\
						padding: 10px;\
						background-color: #F4F4F4;\
						border: 1px solid #CCCCCC;\
						border-top-left-radius: 2px;\
						border-top-right-radius: 2px;\
						font-family: Helvetica, verdana; \
						font-weight: lighter;\
						color:black;\
					}\
					.ie8 .code-grab-highlight, .ie7 .code-grab-highlight{\
						background-color: #1A1A1A;\
						width:100%;\
						color:white;\
					}\
					.ie8 pre, .ie7 pre{\
						background-color: #1A1A1A;\
						width:100%;\
						color:white;\
					}\
				";
			} else {
				cssString += "\
				.code-grab-textarea {\
					padding: 10px;\
					border: 1px solid #E1E1E1;\
					margin: 20px 0;\
					background-color: #F4F4F4;\
				}\
				";
			}

			// append the stylesheet.
			var codegrabstyle = document.getElementById('codegrabberstyle');
			if(codegrabstyle){
				codegrabstyle.parentNode.removeChild(codegrabstyle);
			}
			_insertStyleTag(cssString, 'codegrabberstyle');

		},
		/**
		 * Insert styletag crossbrowser (since its readonly in IE)
		 * @param css
		 * @param id
		 * @private
		 */
		_insertStyleTag = function(css, id){
			var head = document.head || document.getElementsByTagName('head')[0],
				style = document.createElement('style');

			style.type = 'text/css';
			if(id){
				style.id = id;
			}

			if (style.styleSheet)
				style.styleSheet.cssText = css;
			else
				style.appendChild(document.createTextNode(css));

			head.appendChild(style);
		},
		/**
		 * destroy the whole debug-functionality
		 * @private
		 */
		_destroy = function(){
			var destroyElems = _getElements(['.module-header', '.code-grab']);
			var unwrapElems = _getElements(['.doc-block']);
			if(destroyElems && destroyElems.length > 0 ){
				for(var i=0; i<destroyElems.length; i++){
					destroyElems[i].parentNode.removeChild(destroyElems[i]);
				}
			}
			if(unwrapElems && unwrapElems.length > 0 ){
				for(var i=0; i<unwrapElems.length; i++){
					_unwrapElement(unwrapElems[i]);
				}
			}
		},
		_addPrism = function(){
			/**
			 * Prism: Lightweight, robust, elegant syntax highlighting
			 * MIT license http://www.opensource.org/licenses/mit-license.php/
			 * @author Lea Verou http://lea.verou.me
			 */(function(){var e=/\blang(?:uage)?-(?!\*)(\w+)\b/i,t=self.Prism={util:{type:function(e){return Object.prototype.toString.call(e).match(/\[object (\w+)\]/)[1]},clone:function(e){var n=t.util.type(e);switch(n){case"Object":var r={};for(var i in e)e.hasOwnProperty(i)&&(r[i]=t.util.clone(e[i]));return r;case"Array":return e.slice()}return e}},languages:{extend:function(e,n){var r=t.util.clone(t.languages[e]);for(var i in n)r[i]=n[i];return r},insertBefore:function(e,n,r,i){i=i||t.languages;var s=i[e],o={};for(var u in s)if(s.hasOwnProperty(u)){if(u==n)for(var a in r)r.hasOwnProperty(a)&&(o[a]=r[a]);o[u]=s[u]}return i[e]=o},DFS:function(e,n){for(var r in e){n.call(e,r,e[r]);t.util.type(e)==="Object"&&t.languages.DFS(e[r],n)}}},highlightAll:function(e,n){var r=document.querySelectorAll('code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code');for(var i=0,s;s=r[i++];)t.highlightElement(s,e===!0,n)},highlightElement:function(r,i,s){var o,u,a=r;while(a&&!e.test(a.className))a=a.parentNode;if(a){o=(a.className.match(e)||[,""])[1];u=t.languages[o]}if(!u)return;r.className=r.className.replace(e,"").replace(/\s+/g," ")+" language-"+o;a=r.parentNode;/pre/i.test(a.nodeName)&&(a.className=a.className.replace(e,"").replace(/\s+/g," ")+" language-"+o);var f=r.textContent;if(!f)return;f=f.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/\u00a0/g," ");var l={element:r,language:o,grammar:u,code:f};t.hooks.run("before-highlight",l);if(i&&self.Worker){var c=new Worker(t.filename);c.onmessage=function(e){l.highlightedCode=n.stringify(JSON.parse(e.data),o);t.hooks.run("before-insert",l);l.element.innerHTML=l.highlightedCode;s&&s.call(l.element);t.hooks.run("after-highlight",l)};c.postMessage(JSON.stringify({language:l.language,code:l.code}))}else{l.highlightedCode=t.highlight(l.code,l.grammar,l.language);t.hooks.run("before-insert",l);l.element.innerHTML=l.highlightedCode;s&&s.call(r);t.hooks.run("after-highlight",l)}},highlight:function(e,r,i){return n.stringify(t.tokenize(e,r),i)},tokenize:function(e,n,r){var i=t.Token,s=[e],o=n.rest;if(o){for(var u in o)n[u]=o[u];delete n.rest}e:for(var u in n){if(!n.hasOwnProperty(u)||!n[u])continue;var a=n[u],f=a.inside,l=!!a.lookbehind,c=0;a=a.pattern||a;for(var h=0;h<s.length;h++){var p=s[h];if(s.length>e.length)break e;if(p instanceof i)continue;a.lastIndex=0;var d=a.exec(p);if(d){l&&(c=d[1].length);var v=d.index-1+c,d=d[0].slice(c),m=d.length,g=v+m,y=p.slice(0,v+1),b=p.slice(g+1),w=[h,1];y&&w.push(y);var E=new i(u,f?t.tokenize(d,f):d);w.push(E);b&&w.push(b);Array.prototype.splice.apply(s,w)}}}return s},hooks:{all:{},add:function(e,n){var r=t.hooks.all;r[e]=r[e]||[];r[e].push(n)},run:function(e,n){var r=t.hooks.all[e];if(!r||!r.length)return;for(var i=0,s;s=r[i++];)s(n)}}},n=t.Token=function(e,t){this.type=e;this.content=t};n.stringify=function(e,r,i){if(typeof e=="string")return e;if(Object.prototype.toString.call(e)=="[object Array]")return e.map(function(t){return n.stringify(t,r,e)}).join("");var s={type:e.type,content:n.stringify(e.content,r,i),tag:"span",classes:["token",e.type],attributes:{},language:r,parent:i};s.type=="comment"&&(s.attributes.spellcheck="true");t.hooks.run("wrap",s);var o="";for(var u in s.attributes)o+=u+'="'+(s.attributes[u]||"")+'"';return"<"+s.tag+' class="'+s.classes.join(" ")+'" '+o+">"+s.content+"</"+s.tag+">"};if(!self.document){self.addEventListener("message",function(e){var n=JSON.parse(e.data),r=n.language,i=n.code;self.postMessage(JSON.stringify(t.tokenize(i,t.languages[r])));self.close()},!1);return}var r=document.getElementsByTagName("script");r=r[r.length-1];if(r){t.filename=r.src;document.addEventListener&&!r.hasAttribute("data-manual")&&document.addEventListener("DOMContentLoaded",t.highlightAll)}})();;
			Prism.languages.markup={comment:/&lt;!--[\w\W]*?-->/g,prolog:/&lt;\?.+?\?>/,doctype:/&lt;!DOCTYPE.+?>/,cdata:/&lt;!\[CDATA\[[\w\W]*?]]>/i,tag:{pattern:/&lt;\/?[\w:-]+\s*(?:\s+[\w:-]+(?:=(?:("|')(\\?[\w\W])*?\1|\w+))?\s*)*\/?>/gi,inside:{tag:{pattern:/^&lt;\/?[\w:-]+/i,inside:{punctuation:/^&lt;\/?/,namespace:/^[\w-]+?:/}},"attr-value":{pattern:/=(?:('|")[\w\W]*?(\1)|[^\s>]+)/gi,inside:{punctuation:/=|>|"/g}},punctuation:/\/?>/g,"attr-name":{pattern:/[\w:-]+/g,inside:{namespace:/^[\w-]+?:/}}}},entity:/&amp;#?[\da-z]{1,8};/gi};Prism.hooks.add("wrap",function(e){e.type==="entity"&&(e.attributes.title=e.content.replace(/&amp;/,"&"))});;
			Prism.languages.css={comment:/\/\*[\w\W]*?\*\//g,atrule:{pattern:/@[\w-]+?.*?(;|(?=\s*{))/gi,inside:{punctuation:/[;:]/g}},url:/url\((["']?).*?\1\)/gi,selector:/[^\{\}\s][^\{\};]*(?=\s*\{)/g,property:/(\b|\B)[\w-]+(?=\s*:)/ig,string:/("|')(\\?.)*?\1/g,important:/\B!important\b/gi,ignore:/&(lt|gt|amp);/gi,punctuation:/[\{\};:]/g};Prism.languages.markup&&Prism.languages.insertBefore("markup","tag",{style:{pattern:/(&lt;|<)style[\w\W]*?(>|&gt;)[\w\W]*?(&lt;|<)\/style(>|&gt;)/ig,inside:{tag:{pattern:/(&lt;|<)style[\w\W]*?(>|&gt;)|(&lt;|<)\/style(>|&gt;)/ig,inside:Prism.languages.markup.tag.inside},rest:Prism.languages.css}}});;
			Prism.languages.css.selector={pattern:/[^\{\}\s][^\{\}]*(?=\s*\{)/g,inside:{"pseudo-element":/:(?:after|before|first-letter|first-line|selection)|::[-\w]+/g,"pseudo-class":/:[-\w]+(?:\(.*\))?/g,"class":/\.[-:\.\w]+/g,id:/#[-:\.\w]+/g}};Prism.languages.insertBefore("css","ignore",{hexcode:/#[\da-f]{3,6}/gi,entity:/\\[\da-f]{1,8}/gi,number:/[\d%\.]+/g,"function":/(attr|calc|cross-fade|cycle|element|hsla?|image|lang|linear-gradient|matrix3d|matrix|perspective|radial-gradient|repeating-linear-gradient|repeating-radial-gradient|rgba?|rotatex|rotatey|rotatez|rotate3d|rotate|scalex|scaley|scalez|scale3d|scale|skewx|skewy|skew|steps|translatex|translatey|translatez|translate3d|translate|url|var)/ig});;
			Prism.languages.clike={comment:{pattern:/(^|[^\\])(\/\*[\w\W]*?\*\/|(^|[^:])\/\/.*?(\r?\n|$))/g,lookbehind:!0},string:/("|')(\\?.)*?\1/g,"class-name":{pattern:/((?:(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[a-z0-9_\.\\]+/ig,lookbehind:!0,inside:{punctuation:/(\.|\\)/}},keyword:/\b(if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/g,"boolean":/\b(true|false)\b/g,"function":{pattern:/[a-z0-9_]+\(/ig,inside:{punctuation:/\(/}}, number:/\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee]-?\d+)?)\b/g,operator:/[-+]{1,2}|!|&lt;=?|>=?|={1,3}|(&amp;){1,2}|\|?\||\?|\*|\/|\~|\^|\%/g,ignore:/&(lt|gt|amp);/gi,punctuation:/[{}[\];(),.:]/g};
			;
			Prism.languages.javascript=Prism.languages.extend("clike",{keyword:/\b(var|let|if|else|while|do|for|return|in|instanceof|function|new|with|typeof|try|throw|catch|finally|null|break|continue)\b/g,number:/\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee]-?\d+)?|NaN|-?Infinity)\b/g});Prism.languages.insertBefore("javascript","keyword",{regex:{pattern:/(^|[^/])\/(?!\/)(\[.+?]|\\.|[^/\r\n])+\/[gim]{0,3}(?=\s*($|[\r\n,.;})]))/g,lookbehind:!0}});Prism.languages.markup&&Prism.languages.insertBefore("markup","tag",{script:{pattern:/(&lt;|<)script[\w\W]*?(>|&gt;)[\w\W]*?(&lt;|<)\/script(>|&gt;)/ig,inside:{tag:{pattern:/(&lt;|<)script[\w\W]*?(>|&gt;)|(&lt;|<)\/script(>|&gt;)/ig,inside:Prism.languages.markup.tag.inside},rest:Prism.languages.javascript}}});
			;
//			(function(){if(!self.Prism)return;var e=/\b([a-z]{3,7}:\/\/|tel:)[\w-+%~/.:]+/,t=/\b\S+@[\w.]+[a-z]{2}/,n=/\[([^\]]+)]\(([^)]+)\)/,r=["comment","url","attr-value","string"];for(var i in Prism.languages){var s=Prism.languages[i];Prism.languages.DFS(s,function(i,s){if(r.indexOf(i)>-1){s.pattern||(s=this[i]={pattern:s});s.inside=s.inside||{};i=="comment"&&(s.inside["md-link"]=n);s.inside["url-link"]=e;s.inside["email-link"]=t}});s["url-link"]=e;s["email-link"]=t}Prism.hooks.add("wrap",function(e){if(/-link$/.test(e.type)){e.tag="a";var t=e.content;if(e.type=="email-link")t="mailto:"+t;else if(e.type=="md-link"){var r=e.content.match(n);t=r[2];e.content=r[1]}e.attributes.href=t}})})();
//			;

			// do the highlighting
			Prism.highlightAll();
		},
		_update = function(){
			_destroy();
			var selectors;
			if(_config.debugType == _config.debugTypes.detailed){
				// modules/components overview (create a module/components catalogue).
				selectors = _config.detailedSelectors;
			} else if (_config.debugType == _config.debugTypes.simple){
				// simple version (injects only a textarea)
				selectors = _config.simpleSelectors;
			}
			_config.chosenSelectors = selectors;
			if(selectors !== undefined && selectors !== null && selectors !==''){
				// get the elements on page
				_codeGrabElemsLive = _getElements(selectors);
				_codeGrabElemsRaw = _getElements(selectors, true);
				_createCodeGrab(_codeGrabElemsRaw, _codeGrabElemsLive);
			}
			// Only add PRISM if we are on the detailed version and if ie is above 8.
			if(_config.debugType == _config.debugTypes.detailed && _ieVersion() > 8 || !_ieVersion()){
				Prism.highlightAll();
			}
			_setBasicStyles();
		},
		_init = function(){
				if(_config.useStyles){
					_setBasicStyles();
				}

				_createMenu();
				var codeGrabElems,
					selectors;
				if(_config.debugType == _config.debugTypes.detailed){
					// modules/components overview (create a module/components catalogue).
					selectors = _config.detailedSelectors;
				} else if (_config.debugType == _config.debugTypes.simple){
					// simple version (injects only a textarea)
					selectors = _config.simpleSelectors;
				}
				if(selectors){
					_codeGrabElemsRaw = _getElements(selectors, true);
					_codeGrabElemsLive = _getElements(selectors);
				}

				_config.chosenSelectors = selectors;
				if(selectors !== undefined && selectors !== null && selectors !==''){
					_createCodeGrab(_codeGrabElemsRaw, _codeGrabElemsLive);
				}
				_addKeyboardShortcuts();
				if(_ieVersion()>8 || !_ieVersion()){
					_addPrism();
				}
		}


	// //////////////////////////////////////////////////////////////////////////
	// Prototype
	// //////////////////////////////////////////////////////////////////////////
//	var Codegrabber = function ( options ) {
//
//		return this;
//	};

//	G.extend(Codegrabber.prototype, {
//	});



	// //////////////////////////////////////////////////////////////////////////
	// Public methods & values
	// /////////////////////////////////////////////////////////////////////////
	var codegrabber = {
		add: function ( options ) {

			var _options = options || {};
			// set config vars

			_config = G.extend({
				useStyles: true,
				simpleSelectors: ['data-c-', 'data-m-', 'data-grabcode'],
				detailedSelectors: ['data-c-', 'data-m-', 'data-grabcode'],
				debugTypes: {
					simple:'simple',
					detailed:'detailed'
				},
				debugType: '',
				chosenSelectors:'',
				jiraBaseurl: 'http://jira.lbicph.com/',
				jiraCreatePath : 'secure/CreateIssueDetails!init.jspa',
				jiraPid:false

			}, options || {});

				// init
			_init();

			return this;
		},
		destroy: function(){
			_destroy();
		}
	};

	// add codegrabber to hasList
	G.has.add( 'codegrabber', true );
	return G.extend( Graphite, { codegrabber: codegrabber } );

}));