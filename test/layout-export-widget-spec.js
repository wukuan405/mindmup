/*global jQuery, describe, it, beforeEach, afterEach, jasmine, fakeBootstrapModal, expect, spyOn */
describe('LayoutExportWidget', function () {
	'use strict';
	var layoutExportController, underTest, exportDeferred,
			template = '<div data-mm-format="format-from-header">' +
								'	<div id="d-initial" class="visible initial">initial</div> ' +
								'	<div id="d2" class="visible secondary">secondary</div> ' +
								'	<div id="d3" class="visible done">done</div> ' +
								'	<div id="d4" class="secondary">not touched by visible selection</div> ' +
								'	<div id="d-inprogress" class="visible inprogress">inprogress</div> ' +
								' <div class="visible focus-test"><input type="text" data-mm-show-focus id="focus-test-field"/></div>' +
								' <div class="visible not-focus-test"><input type="text" data-mm-show-focus id="not-focus-test-field"/></div>' +
								'	<div id="d-done" class="visible done">done</div> ' +
								'	<div id="d-error" class="visible error">error</div> ' +
								'	<button id="b1" data-mm-role="set-state" data-mm-state="secondary" />' +
								'	<button id="bexport" data-mm-role="start-export" />' +
								'	<input data-mm-role="format-selector" value="format-from-input" />' +
								'	<div id="d-done-a" data-mm-role="key-status key-status-a">done</div> ' +
								'	<div id="d-done-b" data-mm-role="key-status key-status-b">done</div> ' +
								'</div>';
	beforeEach(function () {
		layoutExportController = jasmine.createSpyObj('layoutExportController', ['startExport']);
		exportDeferred = jQuery.Deferred();
		layoutExportController.startExport.and.callFake(function () {
			return exportDeferred.promise();
		});
		underTest = jQuery(template).appendTo('body');
	});
	afterEach(function () {
		underTest.remove();
	});
	it('initialises the modal with a static backdrop, so it will not be dismissed unintentionally by a background click', function () {
		spyOn(jQuery.fn, 'modal').and.callThrough();

		underTest.layoutExportWidget(layoutExportController);

		expect(jQuery.fn.modal.calls.argsFor(0)[0].backdrop).toBe('static');
	});
	describe('after initialization', function () {
		beforeEach(function () {
			underTest.layoutExportWidget(layoutExportController);
			fakeBootstrapModal(underTest);
		});
		describe('when shown as modal on the screen', function () {
			var onStateChangedListener;
			beforeEach(function () {
				onStateChangedListener = jasmine.createSpy('onStateChangedListener');
				underTest.on('stateChanged', onStateChangedListener);
				underTest.find('#d2').show();
				underTest.find('#d-initial').hide();
			});
			it('shows the initial state section, marked by visible and initial css classes', function () {
				underTest.modal('show');
				expect(underTest.find('#d-initial').css('display')).not.toBe('none');
			});
			it('calls the onStateChangedListener when the state is changed', function () {
				underTest.modal('show');
				expect(onStateChangedListener).toHaveBeenCalled();
				var args = onStateChangedListener.calls.mostRecent().args[0];
				expect(args.state).toEqual('initial');
			});
			it('hides all other state sections, marked by visible css class and not marked by initial', function () {
				underTest.modal('show');

				expect(underTest.find('#d2').css('display')).toBe('none');
				expect(underTest.find('#d3').css('display')).toBe('none');
			});
			it('does not play with visibility of anything that does not have the visible css class', function () {
				underTest.modal('show');

				expect(underTest.find('#d4').css('display')).not.toBe('none');
			});
			it('does not change visibility of sections if show is dispatched on a sub-element', function () {
				underTest.find('#d-initial').trigger('show');

				expect(underTest.find('#d-initial').css('display')).toBe('none');
				expect(underTest.find('#d2').css('display')).not.toBe('none');
			});
			it('does not kick off export automatically', function () {
				expect(layoutExportController.startExport).not.toHaveBeenCalled();
			});
		});
		describe('button roles', function () {
			var onStateChangedListener;
			beforeEach(function () {
				onStateChangedListener = jasmine.createSpy('onStateChangedListener');
				underTest.modal('show');
				underTest.on('stateChanged', onStateChangedListener);
			});
			describe('set-state', function () {
				it('sets the visible elements using the visible css class and data-mm-state attribute', function () {
					underTest.find('#b1').click();

					expect(underTest.find('#d-initial').css('display')).toBe('none');
					expect(underTest.find('#d2').css('display')).not.toBe('none');
					expect(underTest.find('#d3').css('display')).toBe('none');
				});
				it('sets the focus on any data-mm-show-focus elements inside the visible area', function () {
					spyOn(jQuery.fn, 'focus');
					underTest.find('#b1').attr('data-mm-state', 'focus-test').click();
					expect(jQuery.fn.focus).toHaveBeenCalledOnJQueryObject(underTest.find('#focus-test-field'));
					expect(jQuery.fn.focus).not.toHaveBeenCalledOnJQueryObject(underTest.find('#not-focus-test-field'));
				});
				it('calls the onStateChangedListener when the state is changed', function () {
					underTest.find('#b1').attr('data-mm-state', 'listener-test').click();
					expect(onStateChangedListener).toHaveBeenCalled();
					var args = onStateChangedListener.calls.mostRecent().args[0];
					expect(args.state).toEqual('listener-test');
				});
			});
			describe('export', function () {

				it('kicks off the export process', function () {
					underTest.find('#bexport').click();
					expect(layoutExportController.startExport).toHaveBeenCalled();
				});
			});
		});
		describe('export workflow', function () {
			beforeEach(function () {
				underTest.modal('show');
			});
			it('switches visible state to inprogress', function () {
				underTest.find('#bexport').click();

				expect(underTest.find('#d-initial').css('display')).toBe('none');
				expect(underTest.find('#d-inprogress').css('display')).not.toBe('none');
			});
			describe('format selection', function () {
				it('uses the value of the format-selector role input element if such element exists', function () {
					underTest.find('#bexport').click();

					expect(layoutExportController.startExport.calls.argsFor(0)[0]).toBe('format-from-input');
				});
				it('uses the value of the header data-mm-format if the format-selector role input does not exist', function () {
					underTest.find('[data-mm-role=format-selector]').remove();
					underTest.find('#bexport').click();

					expect(layoutExportController.startExport.calls.argsFor(0)[0]).toBe('format-from-header');
				});
			});
			describe('export meta-data', function () {
				it('aggregates values of all form fields where form has role export-parameters into an export object', function () {
					jQuery('<form data-mm-role="export-parameters">' +
									'<input name="size" value="huge" />' +
									'<input name="quality" value="great" />' +
								'</form>').appendTo(underTest);
					underTest.find('#bexport').click();

					expect(layoutExportController.startExport.calls.argsFor(0)[1]).toEqual({
						export: {
							size: 'huge',
							quality: 'great'
						}
					});
				});
				it('uses placeholder if a field is empty', function () {
					jQuery('<form data-mm-role="export-parameters">' +
									'<input name="size" placeholder="huge" value="" />' +
								'</form>').appendTo(underTest);
					underTest.find('#bexport').click();

					expect(layoutExportController.startExport.calls.argsFor(0)[1]).toEqual({
						export: {
							size: 'huge'
						}
					});
				});
				it('adds values of active buttons, ignoring inactive', function () {
					jQuery('<form data-mm-role="export-parameters">' +
									'<button class="active" name="size" value="huge" />' +
									'<button name="value" value="billionz" />' +
									'<button class="active" name="quality" value="great" />' +
									'</form>').appendTo(underTest);
					underTest.find('#bexport').click();
					expect(layoutExportController.startExport.calls.argsFor(0)[1]).toEqual({
						export: {
							size: 'huge',
							quality: 'great'
						}
					});
				});
				it('adds values of active select options', function () {
					jQuery('<form data-mm-role="export-parameters">' +
									'<select name="size">' +
									'<option value="xl">huge</option>' +
									'<option value="xs" selected>small</option>' +
									'<option value="xxs">tiny</option>' +
									'</select>' +
								'</form>').appendTo(underTest);
					underTest.find('#bexport').click();
					expect(layoutExportController.startExport.calls.argsFor(0)[1]).toEqual({
						export: {
							size: 'xs'
						}
					});
				});
				it('will concatenate multiple forms', function () {
					jQuery('<form data-mm-role="export-parameters">' +
								'<input name="size" value="huge" />' +
							'</form>' +
							'<form data-mm-role="export-parameters">' +
								'<input name="quality" value="great" />' +
							'</form>').appendTo(underTest);
					underTest.find('#bexport').click();

					expect(layoutExportController.startExport.calls.argsFor(0)[1]).toEqual({
						export: {
							size: 'huge',
							quality: 'great'
						}
					});
				});
				it('does not add values of form elements outside export-parameters forms', function () {
					jQuery('<form data-mm-role="export-parameters">' +
									'<input name="size" value="huge" />' +
							'</form> ' +
							'<form>' +
								'<input name="quality" value="great" />' +
							'</form>').appendTo(underTest);
					underTest.find('#bexport').click();

					expect(layoutExportController.startExport.calls.argsFor(0)[1]).toEqual({
						export: {
							size: 'huge'
						}
					});
				});
			});
			describe('when export succeeds', function () {
				beforeEach(function () {
					underTest.find('#bexport').click();
				});
				it('sets the visible state to done', function () {
					exportDeferred.resolve();
					expect(underTest.find('#d-initial').css('display')).toBe('none');
					expect(underTest.find('#d-inprogress').css('display')).toBe('none');
					expect(underTest.find('#d-done').css('display')).not.toBe('none');
				});
				describe('setting data-mm-role=output-url elements', function () {
					it('sets href on links, without changing text', function () {
						var element = jQuery('<a href="#" data-mm-role="output-url">old text</a>').appendTo(underTest);
						exportDeferred.resolve({'output-url': 'http://exported'});
						expect(element.attr('href')).toEqual('http://exported');
						expect(element.text()).toEqual('old text');
					});
					it('sets value and data-mm-val on inputs', function () {
						var element = jQuery('<input value="old val" data-mm-val="old mm val" data-mm-role="output-url"/>').appendTo(underTest);
						exportDeferred.resolve({'output-url': 'http://exported'});
						expect(element.attr('data-mm-val')).toEqual('http://exported');
						expect(element.val()).toEqual('http://exported');
					});
					it('works even if elements have more than one role', function () {
						var element = jQuery('<a href="#" data-mm-role="output-url another-role">old text</a>').appendTo(underTest);
						exportDeferred.resolve({'output-url': 'http://exported'});
						expect(element.attr('href')).toEqual('http://exported');
					});
					it('fills in all elements matching data-mm-role from the result object', function () {
						var name = jQuery('<input>').attr('data-mm-role', 'name').appendTo(underTest),
							link = jQuery('<a>').attr('data-mm-role', 'link').appendTo(underTest);

						exportDeferred.resolve({name: 'Jim Jom', link: 'http://iron'});

						expect(name.val()).toEqual('Jim Jom');
						expect(name.attr('data-mm-val')).toEqual('Jim Jom');
						expect(link.attr('href')).toEqual('http://iron');
					});
					it('shows div elements where the role includes the key and the value', function () {
						jQuery('#d-done-b').hide();
						exportDeferred.resolve({name: 'Jim Jom', link: 'http://iron', 'key-status': 'key-status-b'});
						expect(jQuery('#d-done-b').css('display')).not.toBe('none');
					});
					it('hides div elements where the role includes the key but not the value', function () {
						exportDeferred.resolve({name: 'Jim Jom', link: 'http://iron', 'key-status': 'key-status-b'});
						expect(jQuery('#d-done-a').css('display')).toBe('none');
					});
					it('ignores div elements where the role includes a substring of the key', function () {
						//<div id="d-done-b" data-mm-role="key-status key-status-b">done</div>
						exportDeferred.resolve({name: 'Jim Jom', link: 'http://iron', 'y-st': 'key-status-b'});
						expect(jQuery('#d-done-b').css('display')).not.toBe('none');
					});
					it('hides div elements where the role includes as substring of the the value', function () {
						//<div id="d-done-b" data-mm-role="key-status key-status-b">done</div>
						exportDeferred.resolve({name: 'Jim Jom', link: 'http://iron', 'key-status': 'status-b'});
						expect(jQuery('#d-done-b').css('display')).toBe('none');
					});
				});
			});
			describe('when export fails', function () {
				var genericError, customError, networkError, emptyError;
				beforeEach(function () {
					underTest.find('#bexport').click();
					var errorDiv = jQuery('<div>').addClass('error').appendTo(underTest);
					genericError = jQuery('<span>').attr('data-mm-role', 'error-message').appendTo(errorDiv);
					customError = jQuery('<span>').attr('data-mm-role', 'nuclear-disaster').appendTo(errorDiv);
					networkError = jQuery('<span>').attr('data-mm-role', 'network-error').appendTo(errorDiv);
					emptyError = jQuery('<span>').attr('data-mm-role', 'empty').appendTo(errorDiv);
				});
				describe('filling in error code fields', function () {
					it('fills in data-mm-role file-id contents with the second argument of the failure rejection', function () {
						var errorFileField = jQuery('<span data-mm-role="file-id"/>').appendTo(underTest);
						exportDeferred.reject('snafu', 'request124');
						expect(errorFileField.text()).toBe('request124');
					});
					it('creates an e-mail contact template', function () {
						var errorContactLink = jQuery('<a data-mm-role="contact-email"/>').appendTo(underTest);
						exportDeferred.reject('snafu', 'request124');
						expect(errorContactLink.attr('href')).toBe('mailto:?subject=MindMup%20FORMAT-FROM-INPUT%20Export%20Error%20request124');
					});
					it('uses the NO-FILE-ID if file ID is not defined', function () {
						var errorContactLink = jQuery('<a data-mm-role="contact-email"/>').appendTo(underTest);
						exportDeferred.reject('snafu');
						expect(errorContactLink.attr('href')).toBe('mailto:?subject=MindMup%20FORMAT-FROM-INPUT%20Export%20Error%20NO-FILE-ID');
					});
					it('switches state to error', function () {
						exportDeferred.reject('snafu', 'request124');

						expect(underTest.find('#d-initial').css('display')).toBe('none');
						expect(underTest.find('#d-inprogress').css('display')).toBe('none');
						expect(underTest.find('#d-error').css('display')).not.toBe('none');
					});
					it('shows a custom error section if one is available', function () {
						exportDeferred.reject('nuclear-disaster', 'request124');
						expect(genericError.css('display')).toBe('none');
						expect(customError.css('display')).not.toBe('none');
					});
					it('shows a generic error section if no available section matches error reason', function () {
						exportDeferred.reject('snafu', 'request124');
						expect(genericError.css('display')).not.toBe('none');
						expect(customError.css('display')).toBe('none');
					});
					it('shows a network error even if a custom section is defined (but not "empty"), but no file ID', function () {
						exportDeferred.reject('nuclear-disaster');
						expect(genericError.css('display')).toBe('none');
						expect(networkError.css('display')).not.toBe('none');
					});
					it('does not shows a network error if the custom section is "empty", regardless of file ID', function () {
						exportDeferred.reject('empty');
						expect(genericError.css('display')).toBe('none');
						expect(emptyError.css('display')).not.toBe('none');
					});
				});
			});
		});
	});
});
