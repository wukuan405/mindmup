/* global MM, describe, it, beforeEach, expect, jasmine, observable, spyOn*/
describe('MM.IOS.MapModelProxy', function () {
	'use strict';
	var underTest, mapModel, mmProxy, options;
	beforeEach(function () {
		mmProxy = jasmine.createSpyObj('mmProxy', ['sendMessage']);
		mapModel = observable(jasmine.createSpyObj('mapModel', ['someMethod', 'findIdeaById']));
		spyOn(mapModel, 'addEventListener').and.callThrough();
		mapModel.findIdeaById.and.returnValue({'title': 'some text'});
		mapModel.someMethod.and.returnValue(true);
		options = {};
		underTest = new MM.IOS.MapModelProxy(mapModel, mmProxy, options);
	});
	describe('mapModelCommandName', function () {
		it('returns false if command is undefined', function () {
			expect(underTest.mapModelCommandName()).toBeFalsy();
		});
		it('returns false if command.type is undefined', function () {
			expect(underTest.mapModelCommandName({})).toBeFalsy();
		});
		it('returns false if command.type is not a string', function () {
			expect(underTest.mapModelCommandName({type: 1})).toBeFalsy();
		});
		it('returns false if command.type is not demimited with a ":"', function () {
			expect(underTest.mapModelCommandName({type: 'foo'})).toBeFalsy();
			expect(underTest.mapModelCommandName({type: 'foo:'})).toBeFalsy();
		});
		it('returns false if command.type had too many components', function () {
			expect(underTest.mapModelCommandName({type: 'foo:bar:boo'})).toBeFalsy();
		});
		it('returns the command name if command.type is a s string delimited with ":"', function () {
			expect(underTest.mapModelCommandName({type: 'foo:bar'})).toBe('bar');
		});
	});
	describe('handlesCommand', function () {
		it('returns true if command.type starts mapModel: and is a valid mapModel function', function () {
			expect(underTest.handlesCommand({type: 'mapModel:someMethod'})).toBeTruthy();
		});
		it('returns false if command is undefined', function () {
			expect(underTest.handlesCommand()).toBeFalsy();
		});
		it('returns false if command.type does not start with mapModel:', function () {
			expect(underTest.handlesCommand({type: 'foo:bar'})).toBeFalsy();
		});
		it('returns false if command.type does dfine a valid function of mapModel', function () {
			expect(underTest.handlesCommand({type: 'mapModel:notSomeMethod'})).toBeFalsy();
		});
	});
	describe('handleCommand', function () {
		it('calls the defined function on map model', function () {
			underTest.handleCommand({type: 'mapModel:someMethod', args: ['testing', 1, '2', true]});
			expect(mapModel.someMethod).toHaveBeenCalledWith('testing', 1, '2', true);
		});
		it('returns the result of the mapModel function', function () {
			expect(underTest.handleCommand({type: 'mapModel:findIdeaById', args: []})).toEqual({'title': 'some text'});
		});
	});
	describe('should listen to nodeEditRequested event from mapModel', function () {
		it('should subscribe to event', function () {
			expect(mapModel.addEventListener).toHaveBeenCalledWith('nodeEditRequested', jasmine.any(Function));
		});
		it('should ignore event when options are missing', function () {
			underTest = new MM.IOS.MapModelProxy(mapModel, mmProxy);
			mapModel.dispatchEvent('nodeEditRequested', 23, false, true);
			expect(mmProxy.sendMessage).not.toHaveBeenCalled();
		});
		it('options supplied on construction may be altered later', function () {
			mapModel.dispatchEvent('nodeEditRequested', 23, false, true);
			expect(mmProxy.sendMessage).not.toHaveBeenCalled();
			options.inlineEditingDisabled = true;
			mapModel.dispatchEvent('nodeEditRequested', 23, false, true);
			expect(mmProxy.sendMessage).toHaveBeenCalled();
		});
		it('should ignore event when options.inlineEditingDisabled is false', function () {
			options.inlineEditingDisabled = false;
			mapModel.dispatchEvent('nodeEditRequested', 23, false, true);
			expect(mmProxy.sendMessage).not.toHaveBeenCalled();
		});
		it('should send message to mmProxy when options.inlineEditingDisabled is true', function () {
			options.inlineEditingDisabled = true;
			mapModel.dispatchEvent('nodeEditRequested', '23.foo', false, true);
			expect(mmProxy.sendMessage).toHaveBeenCalledWith({
				type: 'nodeEditRequested',
				args: {
					nodeId: '23.foo',
					title: 'some text',
					shouldSelectAll: false,
					editingNew: true
				}
			});
		});
	});
});