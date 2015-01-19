/*global jQuery, describe, it, beforeEach, afterEach, jasmine, fakeBootstrapModal, expect, spyOn */
describe('LayoutExportWidget', function () {
	'use strict';
	var layoutExportController, underTest, exportDeferred,
			template ='<div data-mm-format="format-from-header">' +
								'	<div id="d1" class="visible initial">initial</div> '+
								'	<div id="d2" class="visible secondary">secondary</div> '+
								'	<div id="d3" class="visible done">done</div> '+
								'	<div id="d4" class="secondary">not touched by visible selection</div> '+
								'	<div id="d5" class="visible inprogress">inprogress</div> '+
								'	<div id="d6" class="visible done">done</div> '+
								'	<div id="d7" class="visible error">error</div> '+
								'	<button id="b1" data-mm-role="set-state" data-mm-state="secondary" />' +
								'	<button id="bexport" data-mm-role="export" />' +
								'	<input data-mm-role="format-selector" value="format-from-input" />' +
								'</div>';
		beforeEach(function () {
			layoutExportController = jasmine.createSpyObj('layoutExportController', ['startExport']);
			exportDeferred = jQuery.Deferred();
			layoutExportController.startExport.and.callFake(function() {
				return exportDeferred.promise();
			});
			underTest= jQuery(template).appendTo('body');
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
				beforeEach(function () {

					underTest.find('#d2').show();
					underTest.find('#d1').hide();
				});
				it('shows the initial state section, marked by visible and initial css classes', function () {
					underTest.modal('show');

					expect(underTest.find('#d1').css('display')).not.toBe('none');
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
					underTest.find('#d1').trigger('show');

					expect(underTest.find('#d1').css('display')).toBe('none');
					expect(underTest.find('#d2').css('display')).not.toBe('none');
				});
				it('does not kick off export automatically', function () {
						expect(layoutExportController.startExport).not.toHaveBeenCalled();
				});
			});
			describe('button roles', function () {
				beforeEach(function () {
					underTest.modal('show');
				});
				describe('set-state', function () {
					it('sets the visible elements using the visible css class and data-mm-state attribute', function (){
						underTest.find('#b1').click();

						expect(underTest.find('#d1').css('display')).toBe('none');
						expect(underTest.find('#d2').css('display')).not.toBe('none');
						expect(underTest.find('#d3').css('display')).toBe('none');
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

					expect(underTest.find('#d1').css('display')).toBe('none');
					expect(underTest.find('#d5').css('display')).not.toBe('none');
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
								size: 'xs',
							}
						});
					});
					it('will concatenate multiple forms', function () {
						jQuery('<form data-mm-role="export-parameters">' +
										'<input name="size" value="huge" />' +
									 '</form> ' +
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
						expect(underTest.find('#d1').css('display')).toBe('none');
						expect(underTest.find('#d5').css('display')).toBe('none');
						expect(underTest.find('#d6').css('display')).not.toBe('none');
					});
					describe('setting data-mm-role=output-url elements', function () {
						it('sets href on links, without changing text', function () {
							var element = jQuery('<a href="#" data-mm-role="output-url">old text</a>').appendTo(underTest);
							exportDeferred.resolve('http://exported');
							expect(element.attr('href')).toEqual('http://exported');
							expect(element.text()).toEqual('old text');
						});
						it('sets value and data-mm-val on inputs', function () {
							var element = jQuery('<input value="old val" data-mm-val="old mm val" data-mm-role="output-url"/>').appendTo(underTest);
							exportDeferred.resolve('http://exported');
							expect(element.attr('data-mm-val')).toEqual('http://exported');
							expect(element.val()).toEqual('http://exported');
						});
						it('works even if elements have more than one role', function() {
							var element = jQuery('<a href="#" data-mm-role="output-url another-role">old text</a>').appendTo(underTest);
							exportDeferred.resolve('http://exported');
							expect(element.attr('href')).toEqual('http://exported');
						});
					});
				});
				describe('when export fails', function () {
					beforeEach(function () {
						underTest.find('#bexport').click();
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
						it('switches state to error', function () {
							exportDeferred.reject('snafu', 'request124');

							expect(underTest.find('#d1').css('display')).toBe('none');
							expect(underTest.find('#d5').css('display')).toBe('none');
							expect(underTest.find('#d7').css('display')).not.toBe('none');
						});
					});
				});
			});
		});
});
