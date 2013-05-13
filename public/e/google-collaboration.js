/*global $, MM*/
console.log('google collaboration loaded');
MM.Extensions.googleCollaboration = function () {
	'use strict';
	var menu =
		'<li class="dropdown">' +
		'	<a class="dropdown-toggle" data-toggle="dropdown" href="#">' +
		'	 <i class="icon-group"></i>&nbsp;Collaboration&nbsp;<b class="caret"></b>' +
		'   </a>' +
		'	<ul class="dropdown-menu" role="menu">' +
		'		<li><a><i class="icon-play"></i>&nbsp;Start</a></li>' +
		'	</ul>' +
		'</li>';
	$('#mainMenu').append($(menu));
};
MM.Extensions.googleCollaboration();
