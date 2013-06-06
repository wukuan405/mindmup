/*global Kinetic*/
Kinetic.Connector.prototype.drawFunc = function (canvas) {
	'use strict';
	var context = canvas.getContext(),
		shapeFrom = this.shapeFrom,
		shapeTo = this.shapeTo;
	if (!this.isVisible()) {
		return;
	}
	context.beginPath();
	context.moveTo(shapeFrom.attrs.x + shapeFrom.getWidth() / 2, shapeFrom.attrs.y + shapeFrom.getHeight() / 2);
	context.lineTo(shapeTo.attrs.x + shapeTo.getWidth() / 2, shapeTo.attrs.y + shapeTo.getHeight() / 2);
	canvas.stroke(this);
};
