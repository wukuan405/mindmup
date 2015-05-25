/*global beforeEach, describe, expect, it, jasmine, MM*/
describe('MM.IOS.Alert', function () {
	'use strict';
	var alert, mmProxy;
	beforeEach(function () {
		mmProxy = jasmine.createSpyObj('mmProxy', ['sendMessage']);
		alert = new MM.IOS.Alert(mmProxy);
	});
	it('should return a unique alert id each time show method is invoked', function () {
		var result;

		result = alert.show('Thanks for voting', 'We\'ll do our best to roll popular features out quickly', 'success');
		expect(result).toBe(1);

		result = alert.show('Thanks for voting', 'We\'ll do our best to roll popular features out quickly', 'success');
		expect(result).toBe(2);
	});
	it('should send message when show method is invoked', function () {
		alert.show('Thanks for voting', 'We\'ll do our best to roll popular features out quickly', 'success');
		expect(mmProxy.sendMessage).toHaveBeenCalledWith(
			{
				type: 'alert:show',
				args: {
					'type': 'success',
					'message': 'Thanks for voting',
					'detail': 'We\'ll do our best to roll popular features out quickly',
					'currentId': 1
				}
			}
		);
	});
	it('should send message when hide method is invoked', function () {
		alert.hide(23);
		expect(mmProxy.sendMessage).toHaveBeenCalledWith(
			{
				type: 'alert:hide',
				args: {
					'messageId': 23
				}
			}
		);
	});
});

