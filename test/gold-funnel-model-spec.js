/*global describe, it, expect, jasmine, beforeEach, MM */
describe('GoldFunnelModel', function () {
	'use strict';
	var underTest, activityLog;
	beforeEach(function () {
		activityLog = jasmine.createSpyObj('activityLog', ['log']);
		underTest = new MM.GoldFunnelModel(activityLog);
	});
	describe('step', function () {
		it('logs the action with the current funnel id', function () {
			underTest.setFunnelId('pdf-export');
			underTest.step('account-widget', 'payment-initiated');
			expect(activityLog.log).toHaveBeenCalledWith('goldFunnel', 'account-widget:payment-initiated', 'pdf-export');
		});
	});
});
