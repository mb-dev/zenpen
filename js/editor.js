var InlineEditorPopup = (function() {

	// Editor elements
	var editorField, editingElements, selectedElement, cleanSlate, lastType, currentNodeList, savedSelection, updateNotificationFunction, savedElements;

	// Editor Bubble elements
	var textOptions, boldButton, italicButton, quoteButton, urlButton, urlInput;


	function init() {
		bindElements();

		// Load state if storage is supported
		if ( supportsHtmlStorage() ) {
			//loadState();
		}
	}

	function startEditing(elements, updateNotificationFunctionParam) {
		lastRange = 0;
		// Set cursor position
		var range = document.createRange();
		var selection = window.getSelection();
		range.setStart(elements[0], 1);
		selection.removeAllRanges();
		selection.addRange(range);

		createEventBindings(elements);
		updateNotificationFunction = updateNotificationFunctionParam;
		savedElements = elements;
	}

	function stopEditing() {
		savedElements.each(function(index, el) {
			el.onkeyup = null;
			el.onmousedown = null;
			el.onmouseup = null;
		});
	}

	function createEventBindings( elements ) {

		elements.each(function(index, el) {
			el.onkeyup = onKeyUp;

			// Mouse bindings
			el.onmousedown = checkTextHighlighting;
			el.onmouseup = function( event ) {

				setTimeout( function() {
					checkTextHighlighting( event );
				}, 1);
			};
		});
	}

	function bindElements() {

		editorField = document.querySelector( '.editor-popup' );

		boldButton = editorField.querySelector( '.bold' );
		boldButton.onclick = onBoldClick;

		italicButton = editorField.querySelector( '.italic' );
		italicButton.onclick = onItalicClick;

		urlButton = editorField.querySelector( '.url' );
		urlButton.onmousedown = onUrlClick;

		urlInput = editorField.querySelector( '.url-input' );
		urlInput.onblur = onUrlInputBlur;
		urlInput.onkeydown = onUrlInputKeyDown;
	}

	var throttledPerformNotifyUpdate = _.throttle(function () {
			if(updateNotificationFunction) {
				updateNotificationFunction();
			}
		}, 100);

	function notifyInlineEditUpdate() {
		throttledPerformNotifyUpdate();
	}

	function onKeyUp(event) {
		notifyInlineEditUpdate();
		checkTextHighlighting(event);
	}

	function checkTextHighlighting( event ) {

		var selection = window.getSelection();

		if ($(editorField).hasClass("url-input")) {

			currentNodeList = findNodes( selection.focusNode );
			updateBubbleStates();
			return;
		}

		// Check selections exist
		if ( selection.isCollapsed === true && lastType === false ) {

			onSelectorBlur();
		}

		// Text is selected
		if ( selection.isCollapsed === false ) {

			currentNodeList = findNodes( selection.focusNode );

			updateBubbleStates();
			updateBubblePosition();

			// Show the ui bubble
			$(editorField).removeClass('fade').addClass('active');
		}

		lastType = selection.isCollapsed;
	}

	function updateBubblePosition() {
		var selection = window.getSelection();
		var range = selection.getRangeAt(0);
		var boundary = range.getBoundingClientRect();
		
		editorField.style.top = boundary.top - 5 + window.pageYOffset + "px";
		editorField.style.left = (boundary.left + boundary.right)/2 + "px";
	}

	function updateBubbleStates() {

		// It would be possible to use classList here, but I feel that the
		// browser support isn't quite there, and this functionality doesn't
		// warrent a shim.

		if ( hasNode( currentNodeList, 'B') ) {
			boldButton.className = "bold active"
		} else {
			boldButton.className = "bold"
		}

		if ( hasNode( currentNodeList, 'I') ) {
			italicButton.className = "italic active"
		} else {
			italicButton.className = "italic"
		}

		if ( hasNode( currentNodeList, 'A') ) {
			urlButton.className = "url useicons active"
		} else {
			urlButton.className = "url useicons"
		}
	}

	function onSelectorBlur() {

		editorField.className = "editor-popup fade";
		setTimeout( function() {

			if (editorField.className == "editor-popup fade") {

				editorField.className = "editor-popup";
				editorField.style.top = '-999px';
				editorField.style.left = '-999px';
			}
		}, 260 )
	}

	function findNodes( element ) {

		var nodeNames = {};

		while ( element.parentNode ) {

			nodeNames[element.nodeName] = true;
			element = element.parentNode;

			if ( element.nodeName === 'A' ) {
				nodeNames.url = element.href;
			}
		}

		return nodeNames;
	}

	function hasNode( nodeList, name ) {

		return !!nodeList[ name ];
	}

	function saveState( event ) {
		
		localStorage[ 'header' ] = headerField.innerHTML;
		localStorage[ 'content' ] = contentField.innerHTML;
	}

	function loadState() {

		if ( localStorage[ 'header' ] ) {
			headerField.innerHTML = localStorage[ 'header' ];
		}

		if ( localStorage[ 'content' ] ) {
			contentField.innerHTML = localStorage[ 'content' ];
		}
	}

	function onBoldClick(e) {
		e.preventDefault();
		e.stopPropagation();
		document.execCommand( 'bold', false );
		checkTextHighlighting(e);
		notifyInlineEditUpdate();
	}

	function onItalicClick(e) {
		e.preventDefault()
		e.stopPropagation()
		document.execCommand( 'italic', false );
		checkTextHighlighting(e);
		notifyInlineEditUpdate();
	}

	function onUrlClick(e) {
		e.preventDefault();
		e.stopPropagation();

		if ( !$(editorField).hasClass('url-mode') ) {
			$(editorField).addClass('url-mode');

			// Set timeout here to debounce the focus action
			setTimeout( function() {

				var nodeNames = findNodes( window.getSelection().focusNode );

				if ( hasNode( nodeNames , "A" ) ) {
					urlInput.value = nodeNames.url;
				} else {
					// Symbolize text turning into a link, which is temporary, and will never be seen.
					document.execCommand( 'createLink', false, '/' );
				}

				// Since typing in the input box kills the highlighted text we need
				// to save this selection, to add the url link if it is provided.
				lastSelection = window.getSelection().getRangeAt(0);
				lastType = false;

				urlInput.focus();

			}, 10)

		} else {
			console.log('remove class url mode');
			$(editorField).removeClass('url-mode');
		}
		checkTextHighlighting(e);
		notifyInlineEditUpdate();
	}

	function onUrlInputKeyDown( event ) {

		if ( event.keyCode === 13 ) {
			event.preventDefault();
			urlInput.blur();
		}
	}

	function onUrlInputBlur( event ) {

		console.log('onblur');
		$(editorField).removeClass('url-mode');
		applyURL( urlInput.value );
		urlInput.value = '';

		currentNodeList = findNodes( window.getSelection().focusNode );
		checkTextHighlighting();
		notifyInlineEditUpdate();
	}

	function applyURL( url ) {

		rehighlightLastSelection();

		// Unlink any current links
		document.execCommand( 'unlink', false );

		if (url !== "") {

			if ( !url.match("^(http|https)://") ) {
				url = "http://" + url;	
			} 

			document.execCommand( 'createLink', false, url );
			lastSelection = window.getSelection().getRangeAt(0);
		}
	}

	function rehighlightLastSelection() {

		window.getSelection().addRange( lastSelection );
	}

	function getWordCount() {
		
		var text = get_text( contentField );

		if ( text === "" ) {
			return 0
		} else {
			return text.split(/\s+/).length;
		}
	}

	return {
		init: init,
		saveState: saveState,
		getWordCount: getWordCount,
		startEditing: startEditing,
		stopEditing: stopEditing
	}

})();