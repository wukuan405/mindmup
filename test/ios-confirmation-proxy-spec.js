/* global MM, describe, it, beforeEach, expect, jasmine*/
describe('MM.IOS.ConfirmationProxy', function () {
	'use strict';
	var underTest, mmProxy;
	beforeEach(function () {
		mmProxy = jasmine.createSpyObj('mmProxy', ['sendMessage']);
		underTest = new MM.IOS.ConfirmationProxy(mmProxy);
	});
	describe('requestConfirmation', function () {
		var result, buttons;
		beforeEach(function () {
			buttons = {
				'default': 'ok',
				'cancel': 'dont do it',
				'destructive': 'kill them'
			};
		});
		it('returns a pending promise, waiting on ajax to resolve', function () {
			result = underTest.requestConfirmation('What next?', buttons, 'Well?');
			expect(result.state()).toBe('pending');
		});
		it('sends a message asking for confirmation', function () {
			underTest.requestConfirmation('What next?', buttons, 'Well?');
			expect(mmProxy.sendMessage).toHaveBeenCalledWith(
				{
					type: 'confirmation:show',
					args: {
						'confirmationId': 1,
						'title': 'What next?',
						'message': 'Well?',
						'default': 'ok',
						'cancel': 'dont do it',
						'destructive': 'kill them'
					}
				}
			);
		});
		it('removes any invalid keys from buttons object', function () {
			buttons.foo = 'bar';
			underTest.requestConfirmation('What next?', buttons, 'Well?');
			expect(mmProxy.sendMessage).toHaveBeenCalledWith(
				{
					type: 'confirmation:show',
					args: {
						'confirmationId': 1,
						'title': 'What next?',
						'message': 'Well?',
						'default': 'ok',
						'cancel': 'dont do it',
						'destructive': 'kill them'
					}
				}
			);
		});
		it('omits any ommitted buttons', function () {
			underTest.requestConfirmation('What next?', {'default': 'ok'}, 'Well?');
			expect(mmProxy.sendMessage).toHaveBeenCalledWith(
				{
					type: 'confirmation:show',
					args: {
						'confirmationId': 1,
						'title': 'What next?',
						'message': 'Well?',
						'default': 'ok'
					}
				}
			);
		});
		it('omits message if blank', function () {
			buttons = {'default': 'ok'};
			underTest.requestConfirmation('What next?', buttons, ' ');
			expect(mmProxy.sendMessage).toHaveBeenCalledWith(
				{
					type: 'confirmation:show',
					args: {
						'confirmationId': 1,
						'title': 'What next?',
						'default': 'ok'
					}
				}
			);
		});
		describe('if there are no valid buttons', function () {
			beforeEach(function () {
				result = underTest.requestConfirmation('What next?', {'foo': 'bar'}, 'Well?');
			});
			it('returns rejected promise', function () {
				expect(result.state()).toBe('rejected');
			});
			it('does not send message', function () {
				expect(mmProxy.sendMessage).not.toHaveBeenCalled();
			});
		});
		describe('if title is', function () {
			describe('undefined', function () {
				beforeEach(function () {
					result = underTest.requestConfirmation(undefined, buttons, 'Well?');
				});
				it('returns rejected promise', function () {
					expect(result.state()).toBe('rejected');
				});
				it('does not send message', function () {
					expect(mmProxy.sendMessage).not.toHaveBeenCalled();
				});
			});
			describe('blank', function () {
				beforeEach(function () {
					result = underTest.requestConfirmation(' ', buttons, 'Well?');
				});
				it('returns rejected promise', function () {
					expect(result.state()).toBe('rejected');
				});
				it('does not send message', function () {
					expect(mmProxy.sendMessage).not.toHaveBeenCalled();
				});
			});
		});
	});
	describe('handlesCommand', function () {
		var command;
		beforeEach(function () {
			underTest.requestConfirmation('What next?', {'default': 'ok'}, 'Well?');
			command = {type: 'confirmation:choice', args: [1, 'default']};
		});
		it('returns true if command type is confirmation:choice and confirmation id matches', function () {
			expect(underTest.handlesCommand(command)).toBeTruthy();
		});
		it('returns false if command is undefined', function () {
			expect(underTest.handlesCommand()).toBeFalsy();
		});
		it('returns false if command type is not confirmation:choice', function () {
			command.type = 'onfirmation:choice';
			expect(underTest.handlesCommand(command)).toBeFalsy();
		});
		it('returns false if confirmationId does not match', function () {
			command.args = [2, 'default'];
			expect(underTest.handlesCommand(command)).toBeFalsy();
		});
		it('returns false if button type is invalid', function () {
			command.args = [1, 'foo'];
			expect(underTest.handlesCommand(command)).toBeFalsy();
		});
		it('returns false if button type is missing', function () {
			command.args = [1];
			expect(underTest.handlesCommand(command)).toBeFalsy();
		});
	});
	describe('handleCommand', function () {
		var command, resolveListener;
		beforeEach(function () {
			resolveListener = jasmine.createSpy();
			underTest.requestConfirmation('What next?', {'default': 'ok'}, 'Well?').then(resolveListener);
			command = {type: 'confirmation:choice', args: [1, 'default']};
		});
		it('calls resolve on deferred with button type', function () {
			underTest.handleCommand(command);
			expect(resolveListener).toHaveBeenCalledWith('default');
		});
		it('returns true', function () {
			expect(underTest.handleCommand(command)).toBe(true);
		});
		it('returns false and does not resolve if command is not handled', function () {
			underTest.handlesCommand = function () {
				return false;
			};
			expect(underTest.handleCommand(command)).toBe(false);
			expect(resolveListener).not.toHaveBeenCalled();
		});
	});
});
