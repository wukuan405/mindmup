/*global _, jQuery, describe, it, expect, beforeEach, jasmine, spyOn, afterEach, sinon */
describe("scoring widget", function () {
	'use strict';
	var activityLog, underTest, element,
		alert,
		html = '<div><div><form><div>' +
		'<div>' +
		'<button value="1">1</button>' +
		'<button value="2">2</button>' +
		'<button value="3">3</button>' +
		'</div>' +
        '<textarea name="why"></textarea> ' +
		'</form> </div> <a href="#" class="btn btn-primary" data-mm-role="send">Send</a></div>',
		oldEffect, oldModal, clock, storage, storageKey = 'scorewidget', thisCalls, timeout = 60, currentCohort = '20120305', currentDate = 1330949965644, alertId = 123;
	beforeEach(function () {
		clock = sinon.useFakeTimers();
		activityLog = { log: jasmine.createSpy('log') };
		alert = { show: function () {}, hide: function () {} };
		storage = [];
		thisCalls = [];
		element = jQuery(html).scoreWidget(activityLog, alert, timeout, storage, storageKey, currentCohort);
		oldEffect = jQuery.fn.effect;
		oldModal = jQuery.fn.modal;
		jQuery.fn.effect = function () { thisCalls.effect = _.toArray(this); };
		jQuery.fn.modal = function () { thisCalls.modal = _.toArray(this); };
		spyOn(jQuery.fn, 'modal').andCallThrough();
		spyOn(jQuery.fn, 'effect').andCallThrough();
		spyOn(alert, 'show').andReturn(alertId);
	});
	afterEach(function () {
		clock.restore();
		jQuery.fn.modal = oldModal;
		jQuery.fn.effect = oldEffect;
	});
	it("sends selected input to activity log when send button is clicked", function () {
		element.find('button[value=2]').addClass('active');
		element.find('[name=why]').val('why not');
		element.find('[data-mm-role=send]').click();
		expect(activityLog.log).toHaveBeenCalledWith('Score', '2', 'why not');
		expect(jQuery.fn.modal).toHaveBeenCalledWith('hide');
		expect(thisCalls.modal).toEqual(_.toArray(element));
	});
	it("sends selected input to activity log when form is submitted", function () {
		element.find('button[value=2]').addClass('active');
		element.find('[name=why]').val('why not');
		element.find('form').submit();
		expect(activityLog.log).toHaveBeenCalledWith('Score', '2', 'why not');
		expect(jQuery.fn.modal).toHaveBeenCalledWith('hide');
		expect(thisCalls.modal).toEqual(_.toArray(element));
	});
	it('pulsates buttons if nothing is selected', function () {
		element.find('form').submit();
		expect(jQuery.fn.effect).toHaveBeenCalledWith('pulsate');
		expect(thisCalls.effect).toEqual(_.toArray(element.find('button')));
		expect(jQuery.fn.modal).not.toHaveBeenCalled();
	});
	it('does not show alert before the timeout', function () {
		spyOn(Date, 'now').andReturn(currentDate);
		clock.tick(timeout * 1000 - 1);
		expect(alert.show).not.toHaveBeenCalled();
	});
	it('shows dialog after the timeout if the user matches current cohort and we have not shown it to him already', function () {
		spyOn(Date, 'now').andReturn(currentDate);
		clock.tick(timeout * 1000 + 1);
		expect(alert.show).toHaveBeenCalledWith('Please help us improve!', '<a data-toggle="modal" data-target="#modalScore">Click here to answer one very quick question</a>, we would appreciate that very much', 'warning');
		expect(storage[storageKey]).toBeTruthy();
	});
	it('does not show the dialog if the user does not match current cohort', function () {
		spyOn(Date, 'now').andReturn(currentDate + 1000 * 60 * 60 * 24);
		clock.tick(timeout * 1000 + 1);
		expect(alert.show).not.toHaveBeenCalled();
	});
	it('does not show the dialog if we have shown it to the user already', function () {
		storage[storageKey] = 'x';
		clock.tick(timeout * 1000 + 1);
		expect(alert.show).not.toHaveBeenCalled();
	});
});
