/*global jQuery, MM, describe, it, afterEach, beforeEach, _, spyOn, jasmine, expect*/
describe('jQuery.fn.sendToGoogleDriveWidget', function () {
	'use strict';
	var template =
		'<div> ' +
			'<div class="visible google-upload">' +
			'		<form>' +
			'			<div class="control-group" id="group">' +
			'			<label class="control-label">File name:</label>' +
			'				<div class="controls">' +
			'					<input data-mm-role="send-to-drive-file-name" id="filename" data-mm-show-focus placeholder="Google drive file name" />' +
			'				</div>' +
			'			</div>' +
			'			<input type="hidden" data-mm-role="output-url send-to-drive-url" id="url"/>' +
			'		</form>' +
			'</div>' +
			'<div class="visible send-to-drive-progress">' +
			'	Please wait, transferring file to Google Drive.<br/>' +
			'	<span data-mm-role="send-to-drive-status"/>' +
			'</div>' +
			'<div class="visible send-to-drive-error">' +
			'	<h4>Unable to send file to Drive:</h4>' +
			'	<span data-mm-role="send-to-drive-status"/>' +
			'</div>' +
			'<div class="visible send-to-drive-unauthorised">' +
			'	<h4>Authorisation required</h4>' +
			'</div>' +
			'<div class="visible send-to-drive-done alert alert-success alert-block">' +
			'</div>' +
			'<a data-mm-role="send-to-drive-result-link" id="open-result">Open</a>' +
			'<a data-mm-role="send-to-drive-share" id="share-google">Share</a>' +
			'<a data-mm-role="send-to-drive-kickoff" id="kickoff-dialogs" data-mm-showdialogs >With dialogs</a> ' +
			'<a data-mm-role="send-to-drive-kickoff" id="kickoff-no-dialogs">No dialogs</a> ' +
		'</div>',
			googleDriveAdapter,
			blobFetchDeferred,
			readyDeferred,
			uploadDeferred,
			underTest;
	beforeEach(function () {
		blobFetchDeferred = jQuery.Deferred();
		readyDeferred = jQuery.Deferred();
		uploadDeferred = jQuery.Deferred();
		spyOn(MM, 'ajaxBlobFetch').and.returnValue(blobFetchDeferred.promise());
		googleDriveAdapter = jasmine.createSpyObj('googleDriveAdapter', ['ready', 'binaryUpload', 'showSharingSettings']);
		googleDriveAdapter.ready.and.returnValue(readyDeferred);
		googleDriveAdapter.binaryUpload.and.returnValue(uploadDeferred);
		underTest = jQuery(template).appendTo('body').sendToGoogleDriveWidget(googleDriveAdapter);
		underTest.find('.visible').hide();
		underTest.find('.visible.google-upload').show();
	});
	afterEach(function () {
		underTest.remove();
	});
	describe('filename field alerting', function () {
		_.each(['input', 'change'], function (eventName) {
			it('adds an error class when the value is empty after ' + eventName + ' event', function () {
				underTest.find('#filename').val('').trigger(eventName);
				expect(underTest.find('#group').hasClass('error')).toBeTruthy();
			});
			it('removes the error class when the value not is empty after ' + eventName + ' event', function () {
				underTest.find('#group').addClass('error');
				underTest.find('#filename').val('non empty').trigger(eventName);
				expect(underTest.find('#group').hasClass('error')).toBeFalsy();
			});
		});
	});
	describe('upload process', function () {
		it('short-circuits to error without switching the visible section when filename is empty', function () {
			underTest.find('#filename').val('');
			underTest.find('#kickoff-no-dialogs').click();
			expect(underTest.find('#group').hasClass('error')).toBeTruthy();
			expect(underTest.find('.visible.google-upload').css('display')).not.toBe('none');
			expect(underTest.find('.visible.send-to-drive-progress').css('display')).toBe('none');
			expect(googleDriveAdapter.ready).not.toHaveBeenCalled();
		});
		describe('authentication', function () {
			beforeEach(function () {
				underTest.find('#filename').val('XXX');
			});
			it('prepares drive adapter without dialogs if data-mm-showdialogs is not set on the triggering button', function () {
				underTest.find('#kickoff-no-dialogs').click();
				expect(underTest.find('#group').hasClass('error')).toBeFalsy();
				expect(underTest.find('.visible.google-upload').css('display')).toBe('none');
				expect(underTest.find('.visible.send-to-drive-progress').css('display')).not.toBe('none');
				expect(googleDriveAdapter.ready).toHaveBeenCalledWith(false);
			});
			it('prepares drive adapter with dialogs if data-mm-showdialogs is set on the triggering button', function () {
				underTest.find('#kickoff-dialogs').click();
				expect(googleDriveAdapter.ready).toHaveBeenCalledWith(true);
			});
			it('shows the section send-to-drive-unauthorised if auth without dialogs fails', function () {
				underTest.find('#kickoff-no-dialogs').click();
				readyDeferred.reject();
				expect(underTest.find('.visible.send-to-drive-progress').css('display')).toBe('none');
				expect(underTest.find('.visible.send-to-drive-unauthorised').css('display')).not.toBe('none');
			});
			it('shows the section send-to-drive-error if auth with dialogs fails', function () {
				underTest.find('#kickoff-dialogs').click();
				readyDeferred.reject();
				expect(underTest.find('.visible.send-to-drive-progress').css('display')).toBe('none');
				expect(underTest.find('.visible.send-to-drive-error').css('display')).not.toBe('none');
			});
			it('does not try to fetch the file before authorisation with google', function () {
				underTest.find('#kickoff-dialogs').click();
				expect(MM.ajaxBlobFetch).not.toHaveBeenCalled();
			});
		});
		describe('blob fetch', function () {
			beforeEach(function () {
				underTest.find('#filename').val('XXX');
				underTest.find('#url').val('url-1');
				underTest.find('#kickoff-dialogs').click();
				readyDeferred.resolve();
			});
			it('fetches the file when google authorisation succeeds', function () {
				expect(MM.ajaxBlobFetch).toHaveBeenCalledWith('url-1');
				expect(underTest.find('.visible.send-to-drive-progress').css('display')).not.toBe('none');
			});
			it('shows the error section without uploading to drive if the blob fetch fails', function () {
				blobFetchDeferred.reject();
				expect(underTest.find('.visible.send-to-drive-progress').css('display')).toBe('none');
				expect(underTest.find('.visible.send-to-drive-error').css('display')).not.toBe('none');
				expect(googleDriveAdapter.binaryUpload).not.toHaveBeenCalled();
			});
		});
		describe('binary upload to drive', function () {
			var blobObject;
			beforeEach(function () {
				blobObject = {
					type: 'some/mime'
				};
				underTest.find('#filename').val('XXX');
				underTest.find('#url').val('url-1');
				underTest.find('#kickoff-dialogs').click();
				readyDeferred.resolve();
			});
			it('uploads to drive when the blob fetch resolves', function () {
				blobFetchDeferred.resolve(blobObject);
				expect(googleDriveAdapter.binaryUpload).toHaveBeenCalledWith(blobObject, 'XXX', 'some/mime', false);
				expect(underTest.find('.visible.send-to-drive-progress').css('display')).not.toBe('none');
			});
			it('asks for conversion if using a convertible type', function () {
				blobObject.type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
				blobFetchDeferred.resolve(blobObject);
				expect(googleDriveAdapter.binaryUpload).toHaveBeenCalledWith(blobObject, 'XXX', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', true);
				expect(underTest.find('.visible.send-to-drive-progress').css('display')).not.toBe('none');
			});

			describe('result processing', function () {
				beforeEach(function () {
					blobFetchDeferred.resolve(blobObject);
				});
				it('shows section send-to-drive-unauthorised if google upload fails with not-authenticated', function () {
					uploadDeferred.reject('not-authenticated');
					expect(underTest.find('.visible.send-to-drive-progress').css('display')).toBe('none');
					expect(underTest.find('.visible.send-to-drive-unauthorised').css('display')).not.toBe('none');
				});
				it('shows section send-to-drive-error if google upload fails with some other error', function () {
					uploadDeferred.reject('not-authenticated');
					expect(underTest.find('.visible.send-to-drive-error').css('display')).toBe('none');
					expect(underTest.find('.visible.send-to-drive-unauthorised').css('display')).not.toBe('none');
				});
				it('switches to send-to-drive-done section when resolved', function () {
					uploadDeferred.resolve({link: 'url-2', id: 'id-r'});
					expect(underTest.find('.visible.send-to-drive-done').css('display')).not.toBe('none');
					expect(underTest.find('.visible.send-to-drive-unauthorised').css('display')).toBe('none');
				});
				it('assigns the link from the blob fetch result to data-mm-role=send-to-drive-result-link', function () {
					uploadDeferred.resolve({link: 'url-2', id: 'id-r'});
					expect(underTest.find('#open-result').attr('href')).toBe('url-2');
				});
				it('opens the google share dialog passing the result ID on share-google click', function () {
					uploadDeferred.resolve({link: 'url-2', id: 'id-r'});
					underTest.find('#share-google').click();
					expect(googleDriveAdapter.showSharingSettings).toHaveBeenCalledWith('id-r');
				});
			});
		});
	});
});
