/*global jQuery, MM, observable*/
MM.ActivityLog = function (maxNumberOfElements) {
	'use strict';
	var activityLog = [], nextId = 1, self = this;
	observable(this);
	this.log = function () {
		var analyticArgs = ['log'];
		if (activityLog.length === maxNumberOfElements) {
			activityLog.shift();
		}
		activityLog.push({
			id: nextId,
			ts: new Date(),
			event: Array.prototype.join.call(arguments, ',')
		});
		nextId += 1;
		Array.prototype.slice.call(arguments).forEach(function (element) {
			if (jQuery.isArray(element)) {
				analyticArgs = analyticArgs.concat(element);
			} else {
				analyticArgs.push(element);
			}
		});
		self.dispatchEvent.apply(self, analyticArgs);
	};
	this.error = function (message) {
		self.log('Error', message);
		self.dispatchEvent('error', message, activityLog);
	};
	this.getLog = activityLog.slice.bind(activityLog);
	this.timer = function (category, action) {
		var start = Date.now();
		return {
			end: function () {
				self.dispatchEvent('timer', category, action, Date.now() - start);
			}
		};
	};
};
jQuery.fn.trackingWidget = function (activityLog) {
	'use strict';
	return this.each(function () {
		var element = jQuery(this),
			category = element.data('category'),
			eventType = element.data('event-type') || '',
			label = element.data('label') || '';
		element.click(function () {
			activityLog.log(category, eventType, label);
		});
	});
};

/*global jQuery, MM, observable, setTimeout */
MM.Alert = function () {
	'use strict';
	var self = this, lastId = 1;
	observable(this);
	this.show = function (message, detail, type) {
		var currentId = lastId;
		lastId += 1;
		self.dispatchEvent('shown', currentId, message, detail, type === 'flash' ? 'info' : type);
		if (type === 'flash') {
			setTimeout(function () { self.hide(currentId); }, 3000);
		}
		return currentId;
	};
	this.hide = this.dispatchEvent.bind(this, 'hidden');
};
jQuery.fn.alertWidget = function (alert) {
	'use strict';
	return this.each(function () {
		var element = jQuery(this);
		alert.addEventListener('shown', function (id, message, detail, type) {
			type = type || 'info';
			detail = detail || '';
			element.append(
				'<div class="alert fade in alert-' + type + ' alert-no-' + id + '">' +
					'<button type="button" class="close" data-dismiss="alert">&#215;</button>' +
					'<strong>' + message + '</strong>' +
					'&nbsp;' + detail +
					'</div>'
			);
		});
		alert.addEventListener('hidden', function (id) {
			element.find('.alert-no-' + id).remove();
		});
	});
};

/*global MM, observable*/
MM.AutoSave = function (mapController, storage, alertDispatcher) {
	'use strict';
	var prefix = 'auto-save-',
		self = this,
		currentMapId,
		currentIdea,
		events = [],
		isWarningShown = false,
		checkForLocalChanges = function (mapId) {
			var value = storage.getItem(prefix + mapId);
			if (value) {
				self.dispatchEvent('unsavedChangesAvailable', mapId);
			}
		},
		trackChanges = function (idea, mapId) {
			events = [];
			idea.addEventListener('changed', function (command, params) {
				events.push({cmd: command, args: params});
				try {
					storage.setItem(prefix + mapId, events);
				} catch (e) {
					if (!isWarningShown) {
						isWarningShown = true;
						alertDispatcher.show('Problem with auto save!', 'We could not autosave the changes - there is not enough free space in your local browser repository.', 'warning');
					}
				}
			});
		};
	observable(this);
	self.applyUnsavedChanges = function () {
		var events = storage.getItem(prefix + currentMapId);
		if (events) {
			events.forEach(function (event) {
				currentIdea.execCommand(event.cmd, event.args);
			});
		}
	};
	self.discardUnsavedChanges = function () {
		events = [];
		storage.remove(prefix + currentMapId);
	};
	mapController.addEventListener('mapSaved', function (mapId, idea) {
		isWarningShown = false;
		if (mapId === currentMapId || idea === currentIdea) {
			self.discardUnsavedChanges();
		}
	});
	mapController.addEventListener('mapLoaded', function (mapId, idea, properties) {

		if (!properties || !properties.autoSave) {
			currentMapId = mapId;
			currentIdea = idea;
			isWarningShown = false;
			checkForLocalChanges(mapId);
			trackChanges(idea, mapId);
		}
	});
};

/*global console, $ */
/*jshint camelcase:false*/
$.fn.background_upload = function (action, start, complete, fail) {
	'use strict';
	var element = this,
		sequence = $('iframe').length,
		active = false;
	start = start || function (name) { console.log('Uploading', name); };
	complete = complete || function (content) { console.log('Uploaded', content); };
	fail = fail || function (error) { console.log('Upload error', error); };
	$('<iframe style="display:none" name="upload-' + sequence + '"></iframe>').appendTo('body').load(
		function () {
			var result, fileType = active;
			if (!active) {
				return;
			}
			active = false;
			try {
				result = $(this.contentWindow.document.body).text();
			} catch (err) {
				fail('problem uploading the file to server', result);
				return;
			}
			complete(result, fileType);
		}
	);
	element.wrap('<form enctype="multipart/form-data" method="post" action="' + action + '" target="upload-' + sequence + '">');
	element.parents('form').submit(
		function () {
			var name = (element.val() || '').replace(/.*[\\\/]/g, '');
			active = name.split('.').pop();
			if (active !== 'mm' && active !== 'mup') {
				fail('unsupported type ' + active);
				active = false;
				return false;
			}
			start(name);
		}
	);
	element.change(function () {
		element.parents('form').submit();
	});
	return element;
};

/*global _, observable, jQuery, MM*/
MM.jsonStorage = function (storage) {
	'use strict';
	var self = {};
	self.setItem = function (key, value) {
		return storage.setItem(key, JSON.stringify(value));
	};
	self.getItem = function (key) {
		var item = storage.getItem(key);
		try {
			return JSON.parse(item);
		} catch (e) {
		}
	};
	self.remove = function (key) {
		storage.removeItem(key);
	};
	return self;
};
MM.Bookmark = function (mapController, storage, storageKey) {
	'use strict';
	var self = observable(this),
		currentMap = false,
		list = [],
		pushToStorage = function () {
			if (storage && storageKey) {
				storage.setItem(storageKey, list);
			}
		};
	if (storage && storageKey) {
		list = storage.getItem(storageKey) || [];
	}
	mapController.addEventListener('mapSaved', function (key, idea) {
		var couldPin = self.canPin();
		currentMap = {
			mapId: key,
			title: idea.title
		};
		self.store({
			mapId: key,
			title: idea.title
		});
		if (couldPin !== self.canPin()) {
			self.dispatchEvent('pinChanged');
		}
	});
	mapController.addEventListener('mapLoaded', function (key, idea) {
		var couldPin = self.canPin();
		currentMap = {
			mapId: key,
			title: idea.title
		};
		if (couldPin !== self.canPin()) {
			self.dispatchEvent('pinChanged');
		}
	});
	self.store = function (bookmark) {
		if (!(bookmark.mapId && bookmark.title)) {
			throw new Error('Invalid bookmark');
		}
		var existing = _.find(list, function (b) {
			return (b.title === bookmark.title) || (b.mapId === bookmark.mapId);
		});
		if (existing) {
			existing.mapId = bookmark.mapId;
			existing.title = bookmark.title;
		} else {
			list.push(_.clone(bookmark));
		}
		pushToStorage();
		self.dispatchEvent('added', bookmark);
	};
	self.remove = function (mapId, suppressAlert) {
		var idx, removed;
		suppressAlert = suppressAlert || false;
		for (idx = 0; idx < list.length; idx++) {
			if (list[idx].mapId === mapId) {
				removed = list.splice(idx, 1)[0];
				pushToStorage();
				self.dispatchEvent('deleted', removed, suppressAlert);
				return;
			}
		}
	};
	self.list = function () {
		return _.clone(list).reverse();
	};
	self.links = function (titleLimit) {
		titleLimit = titleLimit || 30;
		return _.map(self.list(), function (element) {
			return {
				title: element.title,
				shortTitle: element.title.length > titleLimit ? element.title.substr(0, titleLimit) + '...' : element.title,
				mapId: element.mapId
			};
		});
	};
	self.pin = function () {
		if (currentMap) {
			self.store(currentMap);
		}
	};
	self.canPin = function () {
		return currentMap && (list.length === 0 || _.every(list, function (bookmark) {
			return bookmark.mapId !== currentMap.mapId;
		}));
	};
};
jQuery.fn.bookmarkWidget = function (bookmarks, alert, mapController) {
	'use strict';
	return this.each(function () {
		var element = jQuery(this),
			alertId,
			template = element.find('.template').detach(),
			pin = element.find('[data-mm-role=bookmark-pin]'),
			originalContent = element.children().filter('[data-mm-role=bookmark]').clone(),
			updateLinks = function () {
				var list = bookmarks.links(),
					link,
					children,
					addition;
				element.children().filter('[data-mm-role=bookmark]').remove();
				pin.parent().hide();
				if (bookmarks.canPin()) {
					pin.parent().show();
				}
				if (list.length) {
					list.slice(0, 10).forEach(function (bookmark) {
						addition = template.clone().show().attr('data-mm-role', 'bookmark').appendTo(element);
						link = addition.find('a');
						children = link.children().detach();
						link.click(function () {
							mapController.loadMap(bookmark.mapId);
						});
						link.text(bookmark.shortTitle).addClass('repo-' + bookmark.mapId[0]);
						children.appendTo(link);
						addition.find('[data-mm-role=bookmark-delete]').click(function () {
							bookmarks.remove(bookmark.mapId);
							element.parents('.dropdown').find('.dropdown-toggle').dropdown('toggle');
							return false;
						});
					});
				} else {
					element.append(originalContent.clone());
				}
			};
		pin.click(function () {
			bookmarks.pin();
		});
		bookmarks.addEventListener('added', updateLinks);
		bookmarks.addEventListener('pinChanged', updateLinks);
		bookmarks.addEventListener('deleted', function (mark, suppressAlert) {
			updateLinks();
			if (alert && !suppressAlert) {
				if (alertId) {
					alert.hide(alertId);
				}
				alertId = alert.show('Bookmark Removed.', mark.title + ' was removed from the list of your maps. <a href="#"> Undo </a> ', 'success');
				jQuery('.alert-no-' + alertId).find('a').click(function () {
					bookmarks.store(mark);
					alert.hide(alertId);
				});
			}
		});
		updateLinks();
	});
};

/*global window, jQuery*/
jQuery.fn.classCachingWidget = function (keyPrefix, store) {
	'use strict';
	var element = jQuery(this),
		key = keyPrefix + '-' + element.selector;
	jQuery(window).unload(function () {
		store[key] = element.attr('class');
	});
	element.addClass(store[key]);
	return this;
};

/* global MM, jQuery*/
MM.EmbeddedMapUrlGenerator = function (config) {
	'use strict';
	var self = this;
	self.buildMapUrl = function (mapId) {
		var prefix = mapId && mapId[0],
			prefixConfig = prefix && config[prefix],
			deferred = jQuery.Deferred();
		if (prefixConfig) {
			deferred.resolve((prefixConfig.prefix || '') +  mapId.slice(prefixConfig.remove) + (prefixConfig.postfix || ''));
		} else {
			deferred.reject();
		}
		return deferred.promise();
	};
};
/*global jQuery, MM, _, location, window, document */
MM.Extensions = function (storage, storageKey, config, components) {
	'use strict';
	var active = [],
		loadScriptsAsynchronously = function (d, s, urls, callback, errorcallback) {
			urls.forEach(function (url) {
				var js, fjs = d.getElementsByTagName(s)[0];
				js = d.createElement(s);
				js.src = (document.location.protocol === 'file:' ? 'http:' : '') + url;
				js.onload = callback;
				js.onerror = errorcallback;
				fjs.parentNode.insertBefore(js, fjs);
			});
		},
		getScriptsForExtensions = function (extensionNameArray) {
			return _.flatten(_.reject(_.map(extensionNameArray, function (ext) {
				return MM.Extensions.config[ext] && MM.Extensions.config[ext].script.split(' ');
			}), function (e) { return !e; }));
		};
	if (storage[storageKey]) {
		active = storage[storageKey].split(' ');
	}
	this.requiredExtension = function (mapId) {
		var key, ext;
		/*jslint forin:true*/
		for (key in MM.Extensions.config) {
			ext = MM.Extensions.config[key];
			if (ext.providesMapId && ext.providesMapId(mapId)) {
				return key;
			}
		}
	};
	this.scriptsToLoad = function (optionalMapId) {
		var optional = this.requiredExtension(optionalMapId),
			loading = optional ? _.union(active, optional) : active,
			scriptArray = getScriptsForExtensions(loading);
		return _.map(scriptArray, function (script) { if ((/^http[s]?:/).test(script)) { return script; } return '/' + config.cachePreventionKey + script; });
	};
	this.isActive = function (ext) {
		return _.contains(active, ext);
	};
	this.setActive = function (ext, shouldActivate) {
		if (shouldActivate) {
			active = _.union(active, [ext]);
		} else {
			active = _.without(active, ext);
		}
		storage[storageKey] = active.join(' ');
		if (components && components.activityLog) {
			components.activityLog.log('Extensions', ext, 'act-' + shouldActivate);
		}
	};
	this.load = function (optionalMapId) {
		var deferred = jQuery.Deferred(),
			scripts = this.scriptsToLoad(optionalMapId),
			alertId,
			intervalId;
		MM.Extensions.components = components;
		MM.Extensions.mmConfig = config;
		loadScriptsAsynchronously(document, 'script', config.scriptsToLoadAsynchronously.split(' '));
		MM.Extensions.pendingScripts = _.invert(scripts);
		loadScriptsAsynchronously(document, 'script', scripts, function () {
			delete MM.Extensions.pendingScripts[jQuery(this).attr('src')];
		}, function () {
			components.alert.hide(alertId);
			window.clearInterval(intervalId);
			components.alert.show('A required extension failed to load due to a network error.', 'You may continue to use the site but some features may not be available. Please reload the page when you reconnect to the Internet to activate all the features. If the error persists, please contact us at <a href="mailto:contact@mindmup.com">contact@mindmup.com</a>', 'error');
			deferred.resolve();
		});

		if (!_.isEmpty(MM.Extensions.pendingScripts)) {
			alertId = components.alert.show('<i class="icon-spinner icon-spin"></i>&nbsp;Please wait, loading extensions...<span data-mm-role="num-extensions"></span>');
			intervalId = window.setInterval(function () {
				if (_.isEmpty(MM.Extensions.pendingScripts)) {
					components.alert.hide(alertId);
					window.clearInterval(intervalId);
					deferred.resolve();
				} else {
					jQuery('[data-mm-role=num-extensions]').text(_.size(MM.Extensions.pendingScripts) + ' remaining');
				}
			}, 1000);
		} else {
			deferred.resolve();
		}
		return deferred.promise();
	};
};
MM.Extensions.config = {
	'goggle-collaboration' : {
		name: 'Realtime collaboration',
		script: '/e/google-collaboration.js',
		icon: 'icon-group',
		doc: 'http://blog.mindmup.com/p/realtime-collaboration.html',
		desc: 'Realtime collaboration on a map, where several people can concurrently change it and updates are shown to everyone almost instantly. Collaboration is persisted using Google Drive.',
		providesMapId: function (mapId) {
			'use strict';
			return (/^cg/).test(mapId);
		}
	},
	'progress' : {
		name: 'Progress',
		script: '/e/progress.js',
		icon: 'icon-dashboard',
		doc: 'http://blog.mindmup.com/p/monitoring-progress.html',
		desc: 'Progress allows you to manage hierarchies of tasks faster by propagating statuses to parent nodes. For example, when all sub-tasks are completed, the parent task is marked as completed automatically.',
		aggregateAttributeName: 'progress-statuses',
		measurementsConfigName: 'measurements-config',
		isActiveOnMapContent: function (content) {
			'use strict';
			return content.getAttr(MM.Extensions.config.progress.aggregateAttributeName);
		}
	},
	'straight-lines' : {
		name: 'Straight lines',
		script: '/e/straight-lines.js',
		icon: 'icon-reorder',
		doc: 'http://blog.mindmup.com/p/straight-lines.html',
		desc: 'This extension converts funky curve connectors into straight lines, which makes it clearer to see what connects to what on large maps'
	},
	'github' : {
		name: 'Github',
		script: '/e/github.js',
		icon: 'icon-github',
		doc: 'http://www.github.com',
		desc: 'Store your maps on Github',
		providesMapId: function (mapId) {
			'use strict';
			return (/^h/).test(mapId);
		}
	},
	'dropbox' : {
		name: 'Dropbox',
		script: 'https://www.dropbox.com/static/api/1/dropbox-datastores-0.1.0-b3.js /e/dropbox.js',
		icon: 'icon-dropbox',
		doc: 'http://blog.mindmup.com/p/working-with-dropbox.html',
		desc: 'Store your maps on Dropbox',
		providesMapId: function (mapId) {
			'use strict';
			return (/^d1/).test(mapId);
		}
	}
};
jQuery.fn.extensionsWidget = function (extensions, mapController, alert) {
	'use strict';
	var element = this,
		alertId,
		showAlertWithCallBack = function (message, prompt, type, callback) {
			alertId = alert.show(
				message,
				'<a href="#" data-mm-role="alert-callback">' + prompt + '</a>',
				type
			);
			jQuery('[data-mm-role=alert-callback]').click(function () {
				alert.hide(alertId);
				callback();
			});
		},
		listElement = element.find('[data-mm-role=ext-list]'),
		template = listElement.find('[data-mm-role=template]').hide().clone(),
		changed = false,
		causedByMapId;
	_.each(MM.Extensions.config, function (ext, extkey) {
		var item = template.clone().appendTo(listElement).show();
		item.find('[data-mm-role=title]').html('&nbsp;' + ext.name).addClass(ext.icon);
		item.find('[data-mm-role=doc]').attr('href', ext.doc);
		item.find('[data-mm-role=desc]').prepend(ext.desc);
		item.find('input[type=checkbox]').attr('checked', extensions.isActive(extkey)).change(function () {
			extensions.setActive(extkey, this.checked);
			changed = true;
		});
	});
	element.on('hidden', function () {
		if (changed) {
			if (!causedByMapId) {
				location.reload();
			} else {
				window.location = '/map/' + causedByMapId;
			}
		}
		causedByMapId = undefined;
	});

	mapController.addEventListener('mapIdNotRecognised', function (newMapId) {
		var required = extensions.requiredExtension(newMapId);
		alert.hide(alertId);
		if (required) {
			showAlertWithCallBack(
				'This map requires an extension to load!',
				'Click here to enable the ' +  MM.Extensions.config[required].name + ' extension',
				'warning',
				function () {
					causedByMapId = newMapId;
					element.modal('show');
				}
			);
		} else {
			alertId = alert.show('The URL is unrecognised!', 'it might depend on a custom extension that is not available to you.', 'error');
		}

	});
	mapController.addEventListener('mapLoaded', function (mapId, mapContent) {
		var requiredExtensions = _.filter(MM.Extensions.config, function (ext, id) { return ext.isActiveOnMapContent && ext.isActiveOnMapContent(mapContent) && !extensions.isActive(id); }),
			plural = requiredExtensions.length > 1 ? 's' : '';
		alert.hide(alertId);
		if (requiredExtensions.length) {
			showAlertWithCallBack(
				'This map uses additional extensions!',
				'Click here to enable the ' +  _.map(requiredExtensions, function (ext) { return ext.name; }).join(', ') + ' extension' + plural,
				'warning',
				function () {
					causedByMapId = mapId;
					element.modal('show');
				}
			);
		}
	});
	return element;
};



/*global jQuery, navigator, window, MM*/
MM.JotForm = function (formElement, alert) {
	'use strict';
	var nameElement = formElement.find('[name=q1_name]'),
		textAreaElement = formElement.find('textarea'),
		browserInfoElement = jQuery('<input type="hidden" name="q8_browserInfo" />').appendTo(formElement),
		activityLogElement = jQuery('<input type="hidden" name="q9_activityLog" />').appendTo(formElement),
		screenInfoElement = jQuery('<input type="hidden" name="q10_screenInfo" />').appendTo(formElement),
		pageInfoElement = jQuery('<input type="hidden" name="q11_pageInfo" />').appendTo(formElement),
		submitForm = function (log) {
			browserInfoElement.val(navigator.userAgent);
			activityLogElement.val(JSON.stringify(log));
			screenInfoElement.val(JSON.stringify(window.screen) + ' resolution:' + jQuery(window).width() + 'x' + jQuery(window).height());
			pageInfoElement.val(window.location.href);
			formElement.submit();
			textAreaElement.val('');
		};
	this.sendError = function (message, log) {
		textAreaElement.val(message);
		nameElement.val('automated error report');
		submitForm(log);
		nameElement.val('');
	};
	this.sendFeedback = function (log) {
		alert.show('Thank you for your feedback!', 'We\'ll get back to you as soon as possible.');
		submitForm(log);
	};
};
jQuery.fn.feedbackWidget = function (jotForm, activityLog) {
	'use strict';
	return this.each(function () {
		var element = jQuery(this);
		element.find('.sendFeedback').click(function () {
			jotForm.sendFeedback(activityLog.getLog());
			element.modal('hide');
		});
	});
};

/*global MM, MAPJS, jQuery*/
MM.FileSystemMapSource = function FileSystemMapSource(fileSystem) {
	'use strict';
	var self = this,
		jsonMimeType = 'application/json',
		stringToContent = function (fileContent, mimeType) {
			var json;
			if (mimeType === jsonMimeType) {
				json = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;
			} else if (mimeType === 'application/octet-stream') {
				json = JSON.parse(fileContent);
			} else if (mimeType === 'application/x-freemind' || mimeType === 'application/vnd-freemind') {
				json = MM.freemindImport(fileContent);
			}
			return MAPJS.content(json);
		},
		guessMimeType = function (fileName) {
			if (/\.mm$/.test(fileName)) {
				return 'application/x-freemind';
			}
			if (/\.mup$/.test(fileName)) {
				return 'application/json';
			}
			return 'application/octet-stream';
		};
	self.loadMap = function loadMap(mapId, showAuth) {
		var deferred = jQuery.Deferred(),
			editable = { 'application/json': true, 'application/octet-stream': true, 'application/x-freemind': false, 'application/vnd-freemind': false };
		fileSystem.loadMap(mapId, showAuth).then(
			function fileLoaded(stringContent, fileId, mimeType, properties, optionalFileName) {
				if (!mimeType && optionalFileName) {
					mimeType = guessMimeType(optionalFileName);
				}
				properties = jQuery.extend({editable: editable[mimeType]}, properties);
				if (mimeType === 'application/vnd.mindmup.collab') {
					return deferred.reject('map-load-redirect', 'c' + fileId).promise();
				}
				if (editable[mimeType] === undefined) {
					deferred.reject('format-error', 'Unsupported format ' + mimeType);
				} else {
					try {
						deferred.resolve(stringToContent(stringContent, mimeType), fileId, properties);
					} catch (e) {
						deferred.reject('format-error', 'File content not in correct format for this file type');
					}
				}
			},
			deferred.reject,
			deferred.notify
		);
		return deferred.promise();
	};
	self.saveMap = function (map, mapId, showAuth) {
		var deferred = jQuery.Deferred(),
			contentToSave = JSON.stringify(map, null, 2),
			fileName = MM.navigationEscape(map.title) + '.mup';
		fileSystem.saveMap(contentToSave, mapId, fileName, !!showAuth).then(deferred.resolve, deferred.reject, deferred.notify);
		return deferred.promise();
	};
	self.description = fileSystem.description;
	self.recognises = fileSystem.recognises;
};

/*global MM, $, _, escape*/
MM.freemindImport = function (xml, start, progress) {
	'use strict';
	var nodeStyle = function (node, parentStyle) {
		var style = {}, attachment, toStr = function (xmlObj) {
			return $('<div>').append(xmlObj).html();
		};
		if (node.attr('BACKGROUND_COLOR')) {
			style.style = {background : node.attr('BACKGROUND_COLOR')};
		}
		if ((parentStyle && parentStyle.collapsed) || node.attr('FOLDED') === 'true') {
			style.collapsed = 'true';
		}
		attachment = node.children('richcontent').find('body');
		if (attachment.length > 0) {
			style.attachment = { contentType: 'text/html', content: toStr(attachment.children()) };
		}
		return style;
	},
		result,
		xmlToJson = function (xmlNode, parentStyle) {
			var node = $(xmlNode),
				result = {'title' : node.attr('TEXT') || ''},
				childNodes = node.children('node'),
				style = nodeStyle(node, parentStyle),
				children = _.map(childNodes, function (child) {return xmlToJson(child, style); }),
				childObj = {},
				index = 1;
			if (_.size(style) > 0) {
				result.attr = style;
			}
			if (children.length > 0) {
				_.each(children, function (child) {
					var position = $(childNodes[index - 1]).attr('POSITION') === 'left' ? -1 : 1;
					childObj[position * index] = child;
					index += 1;
				});
				result.ideas = childObj;
			} else if (result.attr && result.attr.collapsed) {
				delete result.attr.collapsed;
			}
			if (progress) {
				progress();
			}
			return result;
		},
		xmlDoc = $($.parseXML(xml));
	if (start) {
		start(xmlDoc.find('node').length);
	}
	result = xmlToJson(xmlDoc.find('map').children('node').first());
	result.formatVersion = 2;
	return result;
};

/*jslint nomen: true*/
MM.freemindExport = function (idea) {
	'use strict';
	var formatNode = function (idea) {
		var escapedText = escape(idea.title).replace(/%([0-9A-F][0-9A-F])/g, '&#x$1;').replace(/%u([0-9A-F][0-9A-F][0-9A-F][0-9A-F])/g, '&#x$1;');
		return '<node ID="' + idea.id + '" TEXT="' + escapedText + '">' + (_.size(idea.ideas) > 0 ? _.map(_.sortBy(idea.ideas, function (val, key) { return parseFloat(key); }), formatNode).join('') : '') + '</node>';
	};
	return '<map version="0.7.1">' + formatNode(idea) + '</map>';
};

/* global MM, jQuery, FormData, _ */
MM.GoldApi = function (goldLicenseManager, goldApiUrl, activityLog, goldBucketName) {
	'use strict';
	var self = this,
		LOG_CATEGORY = 'GoldApi',
		apiError = function (serverResult) {
			var recognisedErrors = ['not-authenticated', 'invalid-args', 'server-error', 'user-exists', 'email-exists'];
			if (_.contains(recognisedErrors, serverResult)) {
				return serverResult;
			}
			return 'network-error';
		},
		licenseExec = function (apiProc, showLicenseDialog, args, expectedAccount) {
			var deferred = jQuery.Deferred(),
				onLicenceRetrieved = function (license) {
					var execArgs = _.extend({}, args, {'license': JSON.stringify(license)});
					if (expectedAccount && expectedAccount !== license.account) {
						deferred.reject('not-authenticated');
					} else {
						self.exec(apiProc, execArgs).then(
							function (httpResult) {
								deferred.resolve(httpResult, license.account);
							},
							deferred.reject);
					}
				};
			goldLicenseManager.retrieveLicense(showLicenseDialog).then(onLicenceRetrieved, deferred.reject);
			return deferred.promise();
		};
	self.exec = function (apiProc, args) {
		var deferred = jQuery.Deferred(),
			rejectWithError = function (jxhr) {
				var result = jxhr.responseText;
				activityLog.log(LOG_CATEGORY, 'error', apiProc + ':' + result);
				deferred.reject(apiError(result));
			},
			timer  = activityLog.timer(LOG_CATEGORY, apiProc);
		var formData = new FormData(),
			dataTypes = { 'license/register': 'json', 'file/export_config': 'json', 'file/upload_config': 'json'};
		if (args) {
			_.each(args, function (value, key) {
				formData.append(key, value);
			});
		}
		jQuery.ajax({
			url: goldApiUrl + '/' + apiProc,
			dataType: dataTypes[apiProc],
			data: formData,
			processData: false,
			contentType: false,
			type: 'POST'
		}).then(deferred.resolve, rejectWithError).always(timer.end);
		return deferred.promise();
	};
	self.register = function (accountName, email) {
		return self.exec('license/register', {'to_email': email, 'account_name' : accountName});
	};
	self.getExpiry = function () {
		var license = goldLicenseManager.getLicense();
		return self.exec('license/expiry', {'license': JSON.stringify(license)});
	};
	self.generateExportConfiguration = function (format) {
		var license = goldLicenseManager.getLicense();
		return self.exec('file/export_config', {'license': JSON.stringify(license), 'format': format});
	};
	self.listFiles = function (showLicenseDialog) {
		var deferred = jQuery.Deferred(),
			onListReturned = function (httpResult, account) {
				var parsed = jQuery(httpResult),
					list = [];
				parsed.find('Contents').each(function () {
					var element = jQuery(this),
						key = element.children('Key').text(),
						remove = key.indexOf('/') + 1;
					list.push({
						modifiedDate: element.children('LastModified').text(),
						title:  key.slice(remove)
					});
				});
				deferred.resolve(list, account);
			};
		licenseExec('file/list', showLicenseDialog).then(onListReturned, deferred.reject);
		return deferred.promise();
	};
	self.generateSaveConfig = function (showLicenseDialog) {
		return licenseExec('file/upload_config', showLicenseDialog);
	};
	self.fileUrl = function (showAuthenticationDialog, account, fileNameKey, signedUrl) {
		if (signedUrl) {
			return licenseExec('file/url', showAuthenticationDialog, {'file_key': encodeURIComponent(fileNameKey)}, account);
		} else {
			return jQuery.Deferred().resolve('https://' + goldBucketName + '.s3.amazonaws.com/' + account + '/' + encodeURIComponent(fileNameKey)).promise();
		}

	};
	self.exists = function (fileNameKey) {
		var deferred = jQuery.Deferred(),
			license = goldLicenseManager.getLicense();
		if (license) {
			self.exec('file/exists', {'license': JSON.stringify(license), 'file_key': encodeURIComponent(fileNameKey)}).then(
				function (httpResult) {
					var parsed = jQuery(httpResult);
					deferred.resolve(parsed.find('Contents').length > 0);
				},
				deferred.reject
				);
		} else {
			deferred.reject('not-authenticated');
		}
		return deferred.promise();
	};
};
/*global jQuery, console*/
jQuery.fn.goldLicenseEntryWidget = function (licenseManager, goldApi, activityLog) {
	'use strict';
	var self = this,
		openFromLicenseManager = false,
		hasAction = false,
		remove = self.find('[data-mm-role~=remove]'),
		fileInput = self.find('input[type=file]'),
		uploadButton = self.find('[data-mm-role=upload]'),
		currentSection,
		audit = function (action, label) {
			if (label) {
				activityLog.log('Gold', action, label);
			} else {
				activityLog.log('Gold', action);
			}
		},
		fillInFields = function () {
			var license = licenseManager.getLicense(),
				failExpiry = function (reason) {
					if (currentSection === 'view-license') {
						if (reason === 'not-authenticated') {
							showSection('invalid-license');
						}  else {
							showSection('license-server-unavailable');
						}
					}
				},
				showExpiry = function (expiryString) {
					var expiryTs = expiryString && parseInt(expiryString, 10),
						expiryDate = new Date(expiryTs * 1000);
					if (expiryTs === 0)  {
						failExpiry('not-authenticated');
					} else if (expiryDate && expiryDate < new Date()) {
						if (currentSection === 'view-license') {
							showSection('expired-license');
						}
					} else {
						self.find('input[data-mm-role~=expiry-date]').val((expiryDate && expiryDate.toDateString()) || '');
					}
				};
			self.find('input[data-mm-role~=account-name]').val((license && license.account) || '');
			if (license) {
				self.find('[data-mm-role~=license-text]').val(JSON.stringify(license));
				self.find('input[data-mm-role~=expiry-date]').val('getting expiry date...');
				goldApi.getExpiry().then(showExpiry, failExpiry);
			}  else {
				self.find('[data-mm-role~=license-text]').val('');
				self.find('input[data-mm-role~=expiry-date]').val('');
			}
		},
		setLicense = function (licenseText) {
			audit('license-set');
			if (licenseManager.storeLicense(licenseText)) {
				hasAction = true;
				if (openFromLicenseManager) {
					self.modal('hide');
				} else {
					fillInFields();
					showSection('view-license');
				}
			} else {
				showSection('invalid-license');
			}
		},
		setFileUploadButton = function () {
			var firstVisibleUpload = uploadButton.filter(':visible').first();
			if (firstVisibleUpload.length > 0) {
				fileInput.show().css('opacity', 0).css('position', 'absolute').offset(firstVisibleUpload.offset()).width(firstVisibleUpload.outerWidth())
					.height(firstVisibleUpload.outerHeight());
			} else {
				fileInput.hide();
			}
		},
		showSection = function (sectionName) {
			currentSection = sectionName;
			audit('license-section', sectionName);
			self.find('[data-mm-section]').not('[data-mm-section~=' + sectionName + ']').hide();
			self.find('[data-mm-section~=' + sectionName + ']').show();
			setFileUploadButton();
		},
		initialSection = function (hasLicense, wasEntryRequired) {
			if (wasEntryRequired) {
				return hasLicense ? 'unauthorised-license' : 'license-required';
			}
			return hasLicense ? 'view-license' : 'no-license';
		},
		regSuccess = function (apiResponse) {
			/*jshint sub: true*/
			self.find('[data-mm-role=license-capacity]').text(apiResponse['capacity']);
			self.find('[data-mm-role=license-grace-period]').text(apiResponse['grace-period']);
			self.find('[data-mm-role=license-expiry]').text(new Date(parseInt(apiResponse['expiry'], 10) * 1000).toDateString());
			self.find('[data-mm-role=license-email]').text(apiResponse['email']);
			self.find('[data-mm-role=license-payment-url]').attr('href', apiResponse['payment-url']);
			showSection('registration-success');
		},
		regFail = function (apiReason) {
			self.find('[data-mm-section=registration-fail] .alert [data-mm-role]').hide();
			var message = self.find('[data-mm-section=registration-fail] .alert [data-mm-role~=' + apiReason + ']');
			if (message.length > 0) {
				message.show();
			} else {
				self.find('[data-mm-section=registration-fail] .alert [data-mm-role~=network-error]').show();
			}

			showSection('registration-fail');
		},
		register = function () {
			var registrationForm = self.find('[data-mm-section=register] form'),
				emailField = registrationForm.find('input[name=email]'),
				accountNameField = registrationForm.find('input[name=account-name]'),
				termsField = registrationForm.find('input[name=terms]');
			if (!/@/.test(emailField.val())) {
				emailField.parents('div.control-group').addClass('error');
			} else {
				emailField.parents('div.control-group').removeClass('error');
			}
			if (!/^[a-z][a-z0-9]{3,20}$/.test(accountNameField.val())) {
				accountNameField.parents('div.control-group').addClass('error');
			} else {
				accountNameField.parents('div.control-group').removeClass('error');
			}
			if (!termsField.prop('checked')) {
				termsField.parents('div.control-group').addClass('error');
			} else {
				termsField.parents('div.control-group').removeClass('error');
			}
			if (registrationForm.find('div.control-group').hasClass('error')) {
				return false;
			}
			goldApi.register(accountNameField.val(), emailField.val()).then(regSuccess, regFail);
			showSection('registration-progress');
		};
	self.find('form').submit(function () {return this.action; });
	self.find('[data-mm-role~=form-submit]').click(function () {
		var id = jQuery(this).data('mm-form');
		jQuery(id).submit();
	});
	self.find('[data-mm-role=save-license]').click(function () {
		var licenseText = self.find('textarea[data-mm-role=license-text]').val();
		setLicense(licenseText);
	});
	self.on('show', function () {
		audit('license-show');
		hasAction = false;
		var license = licenseManager.getLicense();
		showSection(initialSection(license, openFromLicenseManager));
		fillInFields(license);
	});
	self.on('shown', setFileUploadButton);


	self.on('hidden', function () {
		if (!hasAction) {
			licenseManager.cancelLicenseEntry();
		}
		remove.show();
		openFromLicenseManager = false;
	});
	remove.click(function () {
		licenseManager.removeLicense();
		hasAction = true;
		fillInFields();
		showSection('no-license');
	});
	self.find('button[data-mm-role~=show-section]').click(function () {
		showSection(jQuery(this).data('mm-target-section'));
	});
	self.find('button[data-mm-role~=register]').click(register);
	licenseManager.addEventListener('license-entry-required', function () {
		openFromLicenseManager = true;
		self.modal('show');
	});
	self.modal({keyboard: true, show: false});
	fileInput.css('opacity', 0).hide();
	/*jshint camelcase: false*/
	fileInput.file_reader_upload(undefined, setLicense, function () {console.log('fail', arguments); showSection('invalid-license'); }, ['txt']);
	self.find('a').click(function () { audit('license-click', this.href); });
	self.find('button').click(function () { audit('license-click', jQuery(this).text()); });
	return self;
};


/* global MM, observable, jQuery */
MM.GoldLicenseManager = function (storage, storageKey) {
	'use strict';
	var self = this,
		currentDeferred,
		validFormat = function (license) {
			return license && license.accountType === 'mindmup-gold';
		};
	observable(this);
	this.getLicense = function () {
		return storage.getItem(storageKey);
	};
	this.retrieveLicense = function (forceAuthentication) {
		currentDeferred = undefined;
		if (!forceAuthentication && this.getLicense()) {
			return jQuery.Deferred().resolve(this.getLicense()).promise();
		}
		currentDeferred = jQuery.Deferred();
		self.dispatchEvent('license-entry-required');
		return currentDeferred.promise();
	};
	this.storeLicense = function (licenseString) {
		var deferred = currentDeferred, license;
		try {
			license = JSON.parse(licenseString);
		} catch (e) {
			return false;
		}
		if (!validFormat(license)) {
			return false;
		}

		storage.setItem(storageKey, license);
		if (currentDeferred) {
			currentDeferred = undefined;
			deferred.resolve(license);
		}
		return true;
	};
	this.removeLicense = function () {
		storage.setItem(storageKey, undefined);
	};
	this.cancelLicenseEntry = function () {
		var deferred = currentDeferred;
		if (currentDeferred) {
			currentDeferred = undefined;
			deferred.reject('user-cancel');
		}
	};
};

/* global MM, jQuery, _*/

MM.GoldStorage = function (goldApi, s3Api, modalConfirmation, options) {
	'use strict';
	var self = this,
		fileProperties = {editable: true},
		privatePrefix,
		isRelatedPrefix = function (mapPrefix) {
			return mapPrefix && options && options[mapPrefix];
		},
		goldMapIdComponents = function (mapId) {
			var mapIdComponents = mapId && mapId.split('/');
			if (mapIdComponents && mapIdComponents.length < 3) {
				return false;
			}
			if (!isRelatedPrefix(mapIdComponents[0])) {
				return false;
			}
			return {
				prefix: mapIdComponents[0],
				account: mapIdComponents[1],
				fileNameKey: decodeURIComponent(mapIdComponents[2])
			};
		},
		buildMapId = function (prefix, account, fileNameKey) {
			return prefix + '/' + account + '/' + encodeURIComponent(fileNameKey);
		};
	options = _.extend({'p': {isPrivate: true}, 'b': {isPrivate: false}, listPrefix: 'b'}, options);
	_.each(options, function (val, key) {
		if (val.isPrivate) {
			privatePrefix = key;
		}
	});
	self.fileSystemFor = function (prefix, description) {
		return {
			recognises: function (mapId) {
				return mapId && mapId[0] === prefix;
			},
			description: description,
			saveMap: function (contentToSave, mapId, fileName, showAuthenticationDialog) {
				return self.saveMap(prefix, contentToSave, mapId, fileName, showAuthenticationDialog);
			},
			loadMap: self.loadMap
		};
	};

	self.list = function (showLicenseDialog) {
		var deferred = jQuery.Deferred(),
			onFileListReturned = function (fileList, account) {
				var prepend = options.listPrefix + '/' + account + '/',
					adaptItem = function (item) {
					return _.extend({id: prepend  + encodeURIComponent(item.title)}, item);
				};
				deferred.resolve(_.map(fileList, adaptItem));
			};
		goldApi.listFiles(showLicenseDialog).then(onFileListReturned, deferred.reject);
		return deferred.promise();
	};
	self.saveMap = function (prefix, contentToSave, mapId, fileName, showAuthenticationDialog) {
		var deferred = jQuery.Deferred(),
			s3FileName = function (goldMapInfo, account) {
				if (goldMapInfo && goldMapInfo.fileNameKey &&  goldMapInfo.account === account) {
					return goldMapInfo.fileNameKey;
				}
				return fileName;

			},
			onSaveConfig = function (saveConfig, account) {
				var goldMapInfo = goldMapIdComponents(mapId),
					s3FileNameKey = s3FileName(goldMapInfo, account),
					config = _.extend({}, saveConfig, {key: account + '/' + s3FileNameKey}),
					shouldCheckForDuplicate = function () {
						if (!goldMapInfo || account !== goldMapInfo.account) {
							return true;
						}
						return false;
					},
					onSaveComplete = function () {
						deferred.resolve(buildMapId(prefix, account, s3FileNameKey), fileProperties);
					},
					doSave = function () {
						s3Api.save(contentToSave, config, options[prefix]).then(onSaveComplete, deferred.reject);
					},
					doConfirm = function () {
						modalConfirmation.showModalToConfirm(
							'Confirm saving',
							'There is already a file with that name in your gold storage. Please confirm that you want to overwrite it, or cancel and rename the map before saving',
							'Overwrite'
						).then(
							doSave,
							deferred.reject.bind(deferred, 'user-cancel')
						);
					},
					checkForDuplicate = function () {
						goldApi.exists(s3FileNameKey).then(
							function (exists) {
								if (exists) {
									doConfirm();
								} else {
									doSave();
								}
							},
							deferred.reject
						);
					};
				if (shouldCheckForDuplicate()) {
					checkForDuplicate();
				} else {
					doSave();
				}

			};

		goldApi.generateSaveConfig(showAuthenticationDialog).then(onSaveConfig, deferred.reject);

		return deferred.promise();
	};
	self.loadMap = function (mapId, showAuthenticationDialog) {
		var deferred = jQuery.Deferred(),
			goldMapInfo = goldMapIdComponents(mapId),
			loadMapInternal = function (mapPrefix, account, fileNameKey) {
				var privateMap = options[mapPrefix].isPrivate;
				goldApi.fileUrl(showAuthenticationDialog, account, fileNameKey, privateMap).then(
					function (url) {
						s3Api.loadUrl(url).then(function (content) {
							deferred.resolve(content, buildMapId(mapPrefix, account, fileNameKey), 'application/json', fileProperties);
						},
						function (reason) {
							if (reason === 'map-not-found' && !privateMap && privatePrefix)  {
								loadMapInternal(privatePrefix, account, fileNameKey);
							} else {
								deferred.reject(reason);
							}
						});
					},
					deferred.reject
				);
			};

		if (goldMapInfo) {
			loadMapInternal(goldMapInfo.prefix, goldMapInfo.account, goldMapInfo.fileNameKey);
		} else {
			deferred.reject('invalid-args');
		}
		return deferred.promise();
	};
};


/*global jQuery, MM, _ */
MM.LayoutExportController = function (mapModel, configurationGenerator, storageApi, activityLog) {
	'use strict';
	var category = 'Map',
		eventType = 'PDF Export';
	this.startExport = function (format, exportProperties) {
		var deferred = jQuery.Deferred(),
			isStopped = function () {
				return deferred.state() !== 'pending';
			},
			reject = function (reason, fileId) {
				activityLog.log(category, eventType + ' failed', reason);
				deferred.reject(reason, fileId);
			},
			layout = _.extend({}, mapModel.getCurrentLayout(), exportProperties);
		activityLog.log(category, eventType + ' started');
		configurationGenerator.generateExportConfiguration(format).then(
			function (exportConfig) {
				var fileId = exportConfig.s3UploadIdentifier;
				storageApi.save(JSON.stringify(layout), exportConfig, {isPrivate: true}).then(
					function () {
						var resolve = function () {
							activityLog.log(category, eventType + ' completed');
							deferred.resolve(exportConfig.signedOutputUrl);
						};
						storageApi.poll(exportConfig.signedErrorListUrl, {stoppedSemaphore: isStopped}).then(function () { reject('generation-error', fileId); });
						storageApi.poll(exportConfig.signedOutputListUrl, {stoppedSemaphore: isStopped}).then(resolve, function (reason) { reject(reason, fileId); });
					},
					reject
				);
			},
			reject
		);
		return deferred.promise();
	};
};

jQuery.fn.layoutExportWidget = function (layoutExportController) {
	'use strict';
	return this.each(function () {
		var self = jQuery(this),
			format = self.data('mm-format'),
			confirmElement = self.find('[data-mm-role=export]'),
			setState = function (state) {
				self.find('.visible').hide();
				self.find('.visible' + '.' + state).show();
			},
			exportComplete = function (url) {
				self.find('[data-mm-role=output-url]').attr('href', url);
				setState('done');
			},
			getExportMetadata = function () {
				var form = self.find('form'),
					exportType = {};
				form.find('button.active').add(form.find('select')).each(function () {
					exportType[jQuery(this).attr('name')] = jQuery(this).val();
				});
				return exportType;
			},
			exportFailed = function (reason, fileId) {
				self.find('[data-mm-role=contact-email]').attr('href', function () { return 'mailto:' + jQuery(this).text() + '?subject=MindMup%20PDF%20Export%20Error%20' + fileId; });
				self.find('[data-mm-role=file-id]').html(fileId);
				self.find('.error span').hide();
				setState('error');

				var predefinedMsg = self.find('[data-mm-role=' + reason + ']');
				if (predefinedMsg.length > 0) {
					predefinedMsg.show();
				} else {
					self.find('[data-mm-role=error-message]').html(reason).show();
				}
			},
			doExport = function () {
				setState('inprogress');
				layoutExportController.startExport(format, {'export': getExportMetadata()}).then(exportComplete, exportFailed);
			};
		self.find('form').submit(function () {return false; });
		confirmElement.click(doExport).keydown('space', doExport);
		self.modal({keyboard: true, show: false});
		self.on('show', function () {
			setState('initial');
		}).on('shown', function () {
			confirmElement.focus();
		});
	});
};

/*global jQuery, MM, observable, XMLHttpRequest*/
MM.MapController = function (initialMapSources) {
	// order of mapSources is important, the first mapSource is default
	'use strict';
	observable(this);
	var self = this,
		dispatchEvent = this.dispatchEvent,
		mapLoadingConfirmationRequired,
		mapInfo = {},
		activeMapSource,
		mapSources = [].concat(initialMapSources),
		lastProperties,
		chooseMapSource = function (identifier) {
			// order of identifiers is important, the first identifier takes precedence
			var mapSourceIndex;
			for (mapSourceIndex = 0; mapSourceIndex < mapSources.length; mapSourceIndex++) {
				if (mapSources[mapSourceIndex].recognises(identifier)) {
					return mapSources[mapSourceIndex];
				}
			}
		},
		mapLoaded = function (idea, mapId, properties) {
			lastProperties = properties;
			mapLoadingConfirmationRequired = false;
			properties = properties || {};
			if (!properties.autoSave) {
				idea.addEventListener('changed', function () {
					mapLoadingConfirmationRequired = true;
				});
			}
			mapInfo = {
				idea: idea,
				mapId: properties.editable && mapId
			};
			dispatchEvent('mapLoaded', mapId, idea, properties);
		};
	self.addMapSource = function (mapSource) {
		mapSources.push(mapSource);
	};
	self.validMapSourcePrefixesForSaving = 'abogp';
	self.setMap = mapLoaded;
	self.isMapLoadingConfirmationRequired = function () {
		return mapLoadingConfirmationRequired;
	};

	self.currentMapId = function () {
		return mapInfo && mapInfo.mapId;
	};

	self.loadMap = function (mapId, force) {
		var progressEvent = function (evt) {
				var done = (evt && evt.loaded) || 0,
					total = (evt && evt.total) || 1,
					message = ((evt && evt.loaded) ? Math.round(100 * done / total) + '%' : evt);
				dispatchEvent('mapLoading', mapId, message);
			},
			mapLoadFailed = function (reason, label) {
				var retryWithDialog = function () {
					dispatchEvent('mapLoading', mapId);
					activeMapSource.loadMap(mapId, true).then(mapLoaded, mapLoadFailed, progressEvent);
				}, mapSourceName = activeMapSource.description ? ' [' + activeMapSource.description + ']' : '';
				if (reason === 'no-access-allowed') {
					dispatchEvent('mapLoadingUnAuthorized', mapId, reason);
				} else if (reason === 'failed-authentication') {
					dispatchEvent('authorisationFailed', activeMapSource.description, retryWithDialog);
				} else if (reason === 'not-authenticated') {
					dispatchEvent('authRequired', activeMapSource.description, retryWithDialog);
				} else if (reason === 'map-load-redirect') {
					self.loadMap(label, force);
				} else if (reason === 'user-cancel') {
					dispatchEvent('mapLoadingCancelled');
				} else {
					label = label ? label + mapSourceName : mapSourceName;
					dispatchEvent('mapLoadingFailed', mapId, reason, label);
				}
			};

		if (mapId === this.currentMapId() && !force) {
			dispatchEvent('mapLoadingCancelled', mapId);
			return;
		}
		if (!force && mapLoadingConfirmationRequired) {
			dispatchEvent('mapLoadingConfirmationRequired', mapId);
			return;
		}
		activeMapSource = chooseMapSource(mapId);
		if (!activeMapSource) {
			dispatchEvent('mapIdNotRecognised', mapId);
			return;
		}
		dispatchEvent('mapLoading', mapId);
		activeMapSource.loadMap(mapId).then(
			mapLoaded,
			mapLoadFailed,
			progressEvent
		);
	};
	this.publishMap = function (mapSourceType) {
		var mapSaved = function (savedMapId, properties) {
				var previousWasReloadOnSave = lastProperties && lastProperties.reloadOnSave;
				properties = properties || {};
				lastProperties = properties;
				mapLoadingConfirmationRequired = false;
				mapInfo.mapId = savedMapId;
				dispatchEvent('mapSaved', savedMapId, mapInfo.idea, properties);
				if (previousWasReloadOnSave || properties.reloadOnSave) {
					self.loadMap(savedMapId, true);
				}
			},
			progressEvent = function (evt) {
				var done = (evt && evt.loaded) || 0,
					total = (evt && evt.total) || 1,
					message = ((evt && evt.loaded) ? Math.round(100 * done / total) + '%' : evt);
				dispatchEvent('mapSaving', activeMapSource.description, message);
			},
			mapSaveFailed = function (reason, label) {
				var retryWithDialog = function () {
					dispatchEvent('mapSaving', activeMapSource.description);
					activeMapSource.saveMap(mapInfo.idea, mapInfo.mapId, true).then(mapSaved, mapSaveFailed, progressEvent);
				}, mapSourceName = activeMapSource.description || '';
				label = label ? label + mapSourceName : mapSourceName;
				if (reason === 'no-access-allowed') {
					dispatchEvent('mapSavingUnAuthorized', function () {
						dispatchEvent('mapSaving', activeMapSource.description, 'Creating a new file');
						activeMapSource.saveMap(mapInfo.idea, 'new', true).then(mapSaved, mapSaveFailed, progressEvent);
					});
				} else if (reason === 'failed-authentication') {
					dispatchEvent('authorisationFailed', label, retryWithDialog);
				} else if (reason === 'not-authenticated') {
					dispatchEvent('authRequired', label, retryWithDialog);
				} else if (reason === 'file-too-large') {
					dispatchEvent('mapSavingTooLarge', activeMapSource.description);
				} else if (reason === 'user-cancel') {
					dispatchEvent('mapSavingCancelled');
				} else {
					dispatchEvent('mapSavingFailed', reason, label);
				}
			};
		activeMapSource = chooseMapSource(mapSourceType || mapInfo.mapId);
		dispatchEvent('mapSaving', activeMapSource.description);
		activeMapSource.saveMap(mapInfo.idea, mapInfo.mapId).then(
			mapSaved,
			mapSaveFailed,
			progressEvent
		);
	};
};
MM.MapController.activityTracking = function (mapController, activityLog) {
	'use strict';
	var startedFromNew = function (idea) {
		return idea.id === 1;
	},
		isNodeRelevant = function (ideaNode) {
			return ideaNode.title && ideaNode.title.search(/MindMup|Lancelot|cunning|brilliant|Press Space|famous|Luke|daddy/) === -1;
		},
		isNodeIrrelevant = function (ideaNode) {
			return !isNodeRelevant(ideaNode);
		},
		isMapRelevant = function (idea) {
			return startedFromNew(idea) && idea.find(isNodeRelevant).length > 5 && idea.find(isNodeIrrelevant).length < 3;
		},
		wasRelevantOnLoad,
		changed = false,
		oldIdea;
	mapController.addEventListener('mapLoaded', function (mapId, idea) {
		activityLog.log('Map', 'View', mapId);
		wasRelevantOnLoad = isMapRelevant(idea);
		if (oldIdea !== idea) {
			oldIdea = idea;
			idea.addEventListener('changed', function (command, args) {
				if (!changed) {
					changed = true;
					activityLog.log('Map', 'Edit');
				}
				activityLog.log(['Map', command].concat(args));
			});
		}
	});
	mapController.addEventListener('mapLoadingFailed', function (mapUrl, reason, label) {
		var message = 'Error loading map document [' + mapUrl + '] ' + JSON.stringify(reason);
		if (label) {
			message = message + ' label [' + label + ']';
		}
		activityLog.error(message);
	});
	mapController.addEventListener('mapSaving', activityLog.log.bind(activityLog, 'Map', 'Save Attempted'));
	mapController.addEventListener('mapSaved', function (id, idea) {
		changed = false;
		if (isMapRelevant(idea) && !wasRelevantOnLoad) {
			activityLog.log('Map', 'Created Relevant', id);
		} else if (wasRelevantOnLoad) {
			activityLog.log('Map', 'Saved Relevant', id);
		} else {
			activityLog.log('Map', 'Saved Irrelevant', id);
		}
	});
	mapController.addEventListener('mapSavingFailed', function (reason, repositoryName) {
		activityLog.error('Map save failed (' + repositoryName + ')' + JSON.stringify(reason));
	});
	mapController.addEventListener('networkError', function (reason) {
		activityLog.log('Map', 'networkError', JSON.stringify(reason));
	});
};
MM.MapController.alerts = function (mapController, alert, modalConfirmation) {
	'use strict';
	var alertId,
		showAlertWithCallBack = function (message, prompt, callback, cancel) {
			alert.hide(alertId);
			modalConfirmation.showModalToConfirm('Please confirm', message, prompt).then(callback, cancel);
		},
		showErrorAlert = function (title, message) {
			alert.hide(alertId);
			alertId = alert.show(title, message, 'error');
		};

	mapController.addEventListener('mapLoadingConfirmationRequired', function (newMapId) {
		showAlertWithCallBack(
			'There are unsaved changes in the current map. Please confirm that you would like to ' + (newMapId === 'new' ? 'create a new map' : 'load a different map.'),
			(newMapId === 'new' ? 'Create New' : 'Load anyway'),
			function () {
				mapController.loadMap(newMapId, true);
			}
		);
	});
	mapController.addEventListener('mapLoading', function (mapUrl, progressMessage) {
		alert.hide(alertId);
		alertId = alert.show('<i class="icon-spinner icon-spin"></i>&nbsp;Please wait, loading the map...', (progressMessage || ''));
	});
	mapController.addEventListener('mapSaving', function (repositoryName, progressMessage) {
		alert.hide(alertId);
		alertId = alert.show('<i class="icon-spinner icon-spin"></i>&nbsp;Please wait, saving the map...', (progressMessage || ''));
	});
	mapController.addEventListener('authRequired', function (providerName, authCallback) {
		showAlertWithCallBack(
			'This operation requires authentication through ' + providerName + ', an external storage provider. ' +
				'Please click on Authenticate below to go to the external provider and allow MindMup to access your account. ' +
				'You can learn more about authentication requirements on our <a href="http://blog.mindmup.com/p/storage-options.html" target="_blank">Storage Options</a> page.',
			'Authenticate',
			authCallback
		);
	});
	mapController.addEventListener('mapSaved mapLoaded', function () {
		alert.hide(alertId);
	});
	mapController.addEventListener('authorisationFailed', function (providerName, authCallback) {
		showAlertWithCallBack(
			'The operation was rejected by ' + providerName + ' storage. Click on Reauthenticate to try using different credentials or license.',
			'Reauthenticate',
			authCallback
		);
	});
	mapController.addEventListener('mapLoadingUnAuthorized', function () {
		showErrorAlert('The map could not be loaded.', 'You do not have the right to view this map');
	});
	mapController.addEventListener('mapSavingUnAuthorized', function (callback) {
		showAlertWithCallBack(
			'You do not have the right to edit this map',
			'Save a copy',
			callback
		);
	});
	mapController.addEventListener('mapLoadingFailed', function (mapId, reason, label) {
		showErrorAlert('Unfortunately, there was a problem loading the map.' + label, 'If you are not experiencing network problems, <a href="http://blog.mindmup.com/p/how-to-resolve-common-networking.html" target="blank">click here for some common ways to fix this</a>');
	});
	mapController.addEventListener('mapSavingCancelled mapLoadingCancelled', function () {
		alert.hide(alertId);
	});
	mapController.addEventListener('mapSavingTooLarge', function (mapSourceDescription) {
		if (mapSourceDescription === 'S3_CORS') {
			showAlertWithCallBack('The map is too large for anonymous MindMup storage. Maps larger than 100 KB can only be stored to MindMup Gold, or a third-party cloud storage. (<a href="http://blog.mindmup.com/p/storage-options.html" target="_blank">more info on storage options</a>)', 'Save to MindMup Gold', function () {
				mapController.publishMap('b');
			}, function () {
				mapController.dispatchEvent('mapSavingCancelled');
			});
		} else {
			showErrorAlert('Unfortunately, the file is too large for the selected storage.', 'Please select a different storage provider from File -&gt; Save As menu');
		}
	});
	mapController.addEventListener('mapSavingFailed', function (reason, label, callback) {
		var messages = {
			'network-error': ['There was a network problem communicating with the server.', 'If you are not experiencing network problems, <a href="http://blog.mindmup.com/p/how-to-resolve-common-networking.html" target="blank">click here for some common ways to fix this</a>. Don\'t worry, you have an auto-saved version in this browser profile that will be loaded the next time you open the map']
		},
			message = messages[reason] || ['Unfortunately, there was a problem saving the map.', 'Please try again later. We have sent an error report and we will look into this as soon as possible'];
		if (callback) {
			showAlertWithCallBack(message[0], message[1], callback);
		} else {
			showErrorAlert(message[0], message[1]);
		}
	});


};
(function () {
	'use strict';
	var oldXHR = jQuery.ajaxSettings.xhr.bind(jQuery.ajaxSettings);
	jQuery.ajaxSettings.xhr = function () {
		var xhr = oldXHR();
		if (xhr instanceof XMLHttpRequest) {
			xhr.addEventListener('progress', this.progress, false);
		}
		if (xhr.upload) {
			xhr.upload.addEventListener('progress', this.progress, false);
		}
		return xhr;
	};
}());

/*global MM, _, observable, jQuery*/
MM.MeasuresModel = function (configAttributeName, valueAttrName, mapController) {
	'use strict';
	var self = observable(this),
		activeContent,
		measures = [],
		latestMeasurementValues = [],
		filter,
		getActiveContentMeasures = function () {
			var value = activeContent && activeContent.getAttr(configAttributeName);
			if (!_.isArray(value)) {
				return [];
			}
			return value;
		},
		mapMeasurements = function (measurements) {
			var map = {};
			_.each(measurements, function (measurement) {
				map[measurement.id] = measurement;
			});
			return map;
		},
		measurementValueDifferences = function (measurement, baseline) {
			var difference = [];
			_.each(measurement.values, function (value, key) {
				var baselineValue = (baseline && baseline.values && baseline.values[key]) || 0;
				if (value !== baselineValue) {
					difference.push(['measureValueChanged', measurement.id, key, value || 0]);
				}
			});
			if (baseline) {
				_.each(baseline.values, function (value, key) {
					var noNewValue = !measurement || !measurement.values || !measurement.values[key];
					if (noNewValue) {
						difference.push(['measureValueChanged', baseline.id, key, 0]);
					}
				});
			}
			return difference;
		},
		measurementDifferences = function (measurements, baslineMeasurements) {
			/*{id: 11, title: 'with values', values: {'Speed': 1, 'Efficiency': 2}}*/
			var baslineMeasurementsMap = mapMeasurements(baslineMeasurements),
				differences = [];
			_.each(measurements, function (measurement) {
				var baseline = baslineMeasurementsMap[measurement.id];
				differences = differences.concat(measurementValueDifferences(measurement, baseline));
			});
			return differences;
		},
		dispatchMeasurementChangedEvents = function () {
			if (self.listeners('measureValueChanged').length === 0) {
				return;
			}
			var oldMeasurementValues = latestMeasurementValues,
				differences = measurementDifferences(self.getMeasurementValues(), oldMeasurementValues);
			_.each(differences, function (changeArgs) {
				self.dispatchEvent.apply(self, changeArgs);
			});
		},
		onActiveContentChange = function () {
			var measuresBefore = measures;
			measures = getActiveContentMeasures();
			if (self.listeners('measureRemoved').length > 0) {
				_.each(_.difference(measuresBefore, measures), function (measure) {
					self.dispatchEvent('measureRemoved', measure);
				});
			}
			if (self.listeners('measureAdded').length > 0) {
				_.each(_.difference(measures, measuresBefore), function (measure) {
					self.dispatchEvent('measureAdded', measure, measures.indexOf(measure));
				});
			}
			dispatchMeasurementChangedEvents();
		};
	mapController.addEventListener('mapLoaded', function (id, content) {
		if (activeContent) {
			activeContent.removeEventListener('changed', onActiveContentChange);
		}
		activeContent = content;
		measures = getActiveContentMeasures();
		activeContent.addEventListener('changed', onActiveContentChange);
	});
	self.getMeasures = function () {
		return measures.slice(0);
	};
	self.editWithFilter = function (newFilter) {
		filter = newFilter;
		self.dispatchEvent('measuresEditRequested');
	};
	self.getMeasurementValues = function () {
		if (!activeContent) {
			return [];
		}
		var result = [];
		activeContent.traverse(function (idea) {
			if (!filter || !filter.nodeIds || _.include(filter.nodeIds, idea.id)) {
				result.push({
					id: idea.id,
					title: idea.title,
					values: _.extend({}, idea.getAttr(valueAttrName))
				});
			}
		});
		latestMeasurementValues = result.slice(0);
		return result;
	};
	self.addMeasure = function (measureName) {
		if (!measureName || measureName.trim() === '') {
			return false;
		}
		measureName = measureName.trim();

		if (_.find(measures, function (measure) { return measure.toUpperCase() === measureName.toUpperCase(); })) {
			return false;
		}
		activeContent.updateAttr(activeContent.id, configAttributeName, measures.concat([measureName]));
	};
	self.removeMeasure = function (measureName) {
		if (!measureName || measureName.trim() === '') {
			return false;
		}
		var updated = _.without(measures, measureName);
		if (_.isEqual(updated, measures)) {
			return;
		}

		activeContent.startBatch();
		activeContent.updateAttr(activeContent.id, configAttributeName, updated);
		activeContent.traverse(function (idea) {
			activeContent.mergeAttrProperty(idea.id, valueAttrName, measureName,  false);
		});
		activeContent.endBatch();
	};
	self.validate = function (value) {
		return !isNaN(parseFloat(value)) && isFinite(value);
	};
	self.setValue = function (nodeId, measureName, value) {
		if (!self.validate(value)) {
			return false;
		}
		return activeContent.mergeAttrProperty(nodeId, valueAttrName, measureName, value);
	};
};



jQuery.fn.editByActivatedNodesWidget = function (keyStroke, mapModel, measuresModel) {
	'use strict';
	return jQuery.each(this, function () {
		var element = jQuery(this),
			showModal = function () {
				if (mapModel.getInputEnabled()) {
					measuresModel.editWithFilter({nodeIds: mapModel.getActivatedNodeIds()});
				}
			};

		element.keydown(keyStroke, showModal).find('[data-mm-role=activatedNodesMeasureSheet]').click(showModal);
	});
};
/*global jQuery, _*/
jQuery.fn.addToRowAtIndex = function (container, index) {
	'use strict';
	var element = jQuery(this),
		current = container.children('[data-mm-role=' + element.data('mm-role') + ']').eq(index);
	if (current.length) {
		element.insertBefore(current);
	} else {
		element.appendTo(container);
	}
	return element;
};

jQuery.fn.numericTotaliser = function () {
	'use strict';
	var element = jQuery(this),
		footer = element.find('tfoot tr'),
		recalculateColumn = function (column) {
			var total = 0;
			if (column === 0) {
				return;
			}
			element.find('tbody tr').each(function () {
				var row = jQuery(this);
				total += parseFloat(row.children().eq(column).text());
			});
			footer.children().eq(column).text(total);
		},
		initialTotal = function () {
			var column;
			for (column = 1; column < footer.children().size(); column++) {
				recalculateColumn(column);
			}
		};
	element.on('change', function (evt, column) {
		var target = jQuery(evt.target);
		if (column !== undefined) {
			recalculateColumn(column);
		} else if (target.is('td')) {
			recalculateColumn(target.index());
		} else {
			initialTotal();
		}
	});
	return this;
};


jQuery.fn.modalMeasuresSheetWidget = function (measuresModel) {
	'use strict';
	return jQuery.each(this, function () {
		var element = jQuery(this),
		    measurementsTable = element.find('[data-mm-role=measurements-table]'),
			measurementTemplate = element.find('[data-mm-role=measurement-template]'),
			measurementContainer = measurementTemplate.parent(),
			ideaTemplate = element.find('[data-mm-role=idea-template]'),
			valueTemplate = ideaTemplate.find('[data-mm-role=value-template]').detach(),
			ideaContainer = ideaTemplate.parent(),
			addMeasureInput = element.find('[data-mm-role=measure-to-add]'),
		    summaryTemplate = element.find('[data-mm-role=summary-template]'),
			summaryContainer = summaryTemplate.parent(),
			getRowForNodeId = function (nodeId) {
				return element.find('[data-mm-nodeid="' + nodeId + '"]');
			},
			getColumnIndexForMeasure = function (measureName) {
				return _.map(measurementContainer.children(), function (column) {
					return jQuery(column).find('[data-mm-role=measurement-name]').text();
				}).indexOf(measureName);
			},
			appendMeasure = function (measureName, index) {
				var measurement = measurementTemplate.clone().addToRowAtIndex(measurementContainer, index);
				measurement.find('[data-mm-role=measurement-name]').text(measureName);
				measurement.find('[data-mm-role=remove-measure]').click(function () {
					measuresModel.removeMeasure(measureName);
				});
				summaryTemplate.clone().addToRowAtIndex(summaryContainer, index).text('0');
			},
			appendMeasureValue = function (container, value, nodeId, measureName, index) {
				var current = container.children('[data-mm-role=value-template]').eq(index),
					valueCell = valueTemplate.clone();
				valueCell
				.text(value || '0')
				.on('change', function (evt, newValue) {
					return measuresModel.setValue(nodeId, measureName, newValue);
				});

				if (current.length) {
					valueCell.insertBefore(current);
				} else {
					valueCell.appendTo(container);
				}
				return valueCell;
			},
			onMeasureValueChanged = function (nodeId, measureChanged, newValue) {
				var row = getRowForNodeId(nodeId),
					col = getColumnIndexForMeasure(measureChanged);
				if (col >= 0) {
					row.children().eq(col).text(newValue);
					measurementsTable.trigger('change', col);
				}
			},
			onMeasureAdded = function (measureName, index) {
				appendMeasure(measureName, index);
				_.each(ideaContainer.children(), function (idea) {
					appendMeasureValue(jQuery(idea), '0', jQuery(idea).data('mm-nodeid'), measureName, index);
				});
			},
			onMeasureRemoved = function (measureName) {
				var col = getColumnIndexForMeasure(measureName);
				if (col < 0) {
					return;
				}
				measurementContainer.children().eq(col).remove();
				summaryContainer.children().eq(col).remove();
				_.each(ideaContainer.children(), function (idea) {
					jQuery(idea).children().eq(col).remove();
				});
			};

		measurementTemplate.detach();
		summaryTemplate.detach();
		ideaTemplate.detach();
		measurementsTable
		.editableTableWidget()
		.on('validate', function (evt, value) {
			return measuresModel.validate(value);
		}).numericTotaliser();

		element.on('shown', function () {
			element.find('[data-dismiss=modal]').focus();
			element.find('[data-mm-role=measurements-table] td').first().focus();
		});
		element.on('show', function () {
			measurementContainer.children('[data-mm-role=measurement-template]').remove();
			summaryContainer.children('[data-mm-role=summary-template]').remove();
			var measures = measuresModel.getMeasures();
			_.each(measures, function (m) {
				appendMeasure(m);
			});
			ideaContainer.children('[data-mm-role=idea-template]').remove();
			_.each(measuresModel.getMeasurementValues(), function (mv) {
				var newIdea = ideaTemplate.clone().appendTo(ideaContainer).attr('data-mm-nodeid', mv.id);
				newIdea.find('[data-mm-role=idea-title]').text(mv.title);
				_.each(measures, function (measure) {
					appendMeasureValue(newIdea, mv.values[measure], mv.id, measure);
				});
			});
			element.find('[data-mm-role=measurements-table]').trigger('change');
			measuresModel.addEventListener('measureValueChanged', onMeasureValueChanged);
			measuresModel.addEventListener('measureAdded', onMeasureAdded);
			measuresModel.addEventListener('measureRemoved', onMeasureRemoved);
		});
		element.on('hide', function () {
			measuresModel.removeEventListener('measureValueChanged', onMeasureValueChanged);
			measuresModel.removeEventListener('measureAdded', onMeasureAdded);
			measuresModel.removeEventListener('measureRemoved', onMeasureRemoved);
		});
		element.modal({keyboard: true, show: false});

		measuresModel.addEventListener('measuresEditRequested', function () {
			element.modal('show');
		});


		element.find('[data-mm-role=measure-to-add]').parent('form').on('submit', function () {
			measuresModel.addMeasure(addMeasureInput.val());
			addMeasureInput.val('');
			return false;
		});
	});
};

/*global MM, window*/
MM.navigationDelimiters = ',;#';

MM.navigationEscape = function (toEscape, escapeChar) {
	'use strict';
	if (!toEscape) {
		return toEscape;
	}
	var regExString = '[' + MM.navigationDelimiters + ']+',
		regEx = new RegExp(regExString, 'g');
	escapeChar = escapeChar || '_';
	return toEscape.replace(regEx, escapeChar);
};

MM.navigation = function (storage, mapController) {
	'use strict';
	var self = this,
		unknownMapId = 'nil',
		mapIdRegExString = '[Mm]:([^' + MM.navigationDelimiters + ']*)',
		mapIdRegEx = new RegExp(mapIdRegExString),
		getMapIdFromHash = function () {
			var windowHash = window && window.location && window.location.hash,
				found = windowHash && mapIdRegEx.exec(windowHash);
			return found && found[1];
		},
		setMapIdInHash = function (mapId) {
			if (mapIdRegEx.test(window.location.hash)) {
				window.location.hash = window.location.hash.replace(mapIdRegEx, 'm:' + mapId);
			} else if (window.location.hash && window.location.hash !== '#') {
				window.location.hash = window.location.hash + ',m:' + mapId;
			} else {
				window.location.hash = 'm:' + mapId;
			}
		},
		changeMapId = function (newMapId) {
			if (newMapId) {
				storage.setItem('mostRecentMapLoaded', newMapId);
			}
			newMapId = newMapId || unknownMapId;
			setMapIdInHash(newMapId);
			return true;
		};
	self.initialMapId = function () {
		var initialMapId = getMapIdFromHash();
		if (!initialMapId || initialMapId === unknownMapId) {
			initialMapId = (storage && storage.getItem && storage.getItem('mostRecentMapLoaded'));
		}
		return initialMapId;
	};
	self.loadInitial = function () {
		var mapId = self.initialMapId();
		mapController.loadMap(mapId || 'new');
		return mapId;
	};
	mapController.addEventListener('mapSaved mapLoaded mapLoadingCancelled', function (newMapId) {
		changeMapId(newMapId);
	});
	self.hashChange = function () {
		var newMapId = getMapIdFromHash();
		if (newMapId === unknownMapId) {
			return;
		}
		if (!newMapId) {
			changeMapId(mapController.currentMapId());
			return false;
		}
		mapController.loadMap(newMapId);
		return true;
	};
	window.addEventListener('hashchange', self.hashChange);
	return self;
};

/*global jQuery, MM, observable*/
MM.OfflineAdapter = function (storage) {
	'use strict';
	var properties = {editable: true};
	this.description = 'OFFLINE';
	this.recognises = function (mapId) {
		return mapId && mapId[0] === 'o';
	};
	this.loadMap = function (mapId) {
		var result = jQuery.Deferred(),
			map = storage.load(mapId);
		if (map) {
			result.resolve(map, mapId, 'application/json', properties);
		} else {
			result.reject('not-found');
		}
		return result.promise();
	};
	this.saveMap = function (contentToSave, mapId, title) {
		var result = jQuery.Deferred(),
			knownErrors = {
				'QuotaExceededError': 'file-too-large',
				'NS_ERROR_DOM_QUOTA_REACHED': 'file-too-large',
				'QUOTA_EXCEEDED_ERR': 'file-too-large'
			};
		try {
			title = title.replace(/\.mup$/, '');
			if (!this.recognises(mapId)) {
				result.resolve(storage.saveNew(contentToSave, title), properties);
			} else {
				storage.save(mapId, contentToSave, title);
				result.resolve(mapId, properties);
			}
		} catch (e) {
			var reason = knownErrors[e.name];
			if (reason) {
				result.reject(reason);
			} else {
				result.reject('local-storage-failed', e.toString()).promise();
			}
		}
		return result.promise();
	};
};
MM.OfflineMapStorage = function (storage, keyPrefix) {
	'use strict';
	observable(this);
	keyPrefix = keyPrefix || 'offline';
	var dispatchEvent = this.dispatchEvent,
		keyName = keyPrefix + '-maps';
	var newFileInformation = function (fileDescription) {
			return {d: fileDescription, t: Math.round(+new Date() / 1000)};
		},
		newFileId = function (nextFileNumber) {
			return keyPrefix + '-map-' + nextFileNumber;
		},
		storedFileInformation = function () {
			var files = storage.getItem(keyName) || { nextMapId: 1, maps: {}};
			files.maps = files.maps || {};
			return files;
		},
		store = function (fileId, fileContent, files, title) {
			title = title || fileContent.title || JSON.parse(fileContent).title;
			files.maps[fileId] = newFileInformation(title);
			storage.setItem(fileId, {map: fileContent});
			storage.setItem(keyName, files);
		};
	this.save = function (fileId, fileContent, title) {
		store(fileId, fileContent, storedFileInformation(), title);
	};
	this.saveNew = function (fileContent, title) {
		var files = storedFileInformation(),
			fileId = newFileId(files.nextMapId);
		files.nextMapId++;
		store(fileId, fileContent, files, title);
		return fileId;
	};
	this.remove = function (fileId) {
		var files = storedFileInformation();
		storage.remove(fileId);
		delete files.maps[fileId];
		storage.setItem(keyName, files);
		dispatchEvent('mapDeleted', fileId);
	};
	this.restore = function (fileId, fileContent, fileInfo) {
		var files = storedFileInformation();
		files.maps[fileId] = fileInfo;
		storage.setItem(fileId, {map: fileContent});
		storage.setItem(keyName, files);
		dispatchEvent('mapRestored', fileId, fileContent, fileInfo);
	};
	this.list = function () {
		return storedFileInformation().maps;
	};
	this.load = function (fileId) {
		var item = storage.getItem(fileId);
		return item && item.map;
	};
	return this;
};

MM.OfflineMapStorageBookmarks = function (offlineMapStorage, bookmarks) {
	'use strict';
	offlineMapStorage.addEventListener('mapRestored', function (mapId, map, mapInfo) {
		bookmarks.store({
			mapId: mapId,
			title: mapInfo.d
		});
	});

	offlineMapStorage.addEventListener('mapDeleted', function (mapId) {
		bookmarks.remove(mapId, true);
	});
};

/*global MM, jQuery, setTimeout*/
MM.retry = function (task, shouldRetry, backoff) {
	'use strict';
	var deferred = jQuery.Deferred(),
		attemptTask = function () {
			task().then(
				deferred.resolve,
				function () {
					if (!shouldRetry || shouldRetry.apply(undefined, arguments)) {
						deferred.notify('Network problem... Will retry shortly');
						if (backoff) {
							setTimeout(attemptTask, backoff());
						} else {
							attemptTask();
						}
					} else {
						deferred.reject.apply(undefined, arguments);
					}
				},
				deferred.notify
			);
		};
	attemptTask();
	return deferred.promise();
};
MM.retryTimes = function (retries) {
	'use strict';
	return function () {
		return retries--;
	};
};
MM.linearBackoff = function () {
	'use strict';
	var calls = 0;
	return function () {
		calls++;
		return 1000 * calls;
	};
};

MM.RetriableMapSourceDecorator = function (adapter) {
	'use strict';
	var	shouldRetry = function (retries) {
			var times = MM.retryTimes(retries);
			return function (status) {
				return times() && status === 'network-error';
			};
		};
	this.loadMap = function (mapId, showAuth) {
		return MM.retry(
			adapter.loadMap.bind(adapter, mapId, showAuth),
			shouldRetry(5),
			MM.linearBackoff()
		);
	};
	this.saveMap = function (contentToSave, mapId, fileName) {
		return MM.retry(
			adapter.saveMap.bind(adapter, contentToSave, mapId, fileName),
			shouldRetry(5),
			MM.linearBackoff()
		);
	};
	this.description = adapter.description;
	this.recognises = adapter.recognises;
	this.autoSave = adapter.autoSave;
};

/*global jQuery, MM, FormData, window, _*/

MM.S3Api = function () {
	'use strict';
	var self = this;
	this.save = function (contentToSave, saveConfiguration, options) {
		var formData = new FormData(),
			savePolicy = options && options.isPrivate ? 'bucket-owner-read' : 'public-read',
			deferred = jQuery.Deferred(),
			saveFailed = function (evt) {
				var errorReasonMap = { 'EntityTooLarge': 'file-too-large' },
					errorDoc,
					errorReason,
					errorLabel;
				if (evt.status === 403) {
					deferred.reject('failed-authentication');
					return;
				}
				try {
					errorDoc = evt && (evt.responseXML || jQuery.parseXML(evt.responseText));
					errorReason = jQuery(errorDoc).find('Error Code').text();
				} catch (e) {
					// just ignore, the network error is set by default
				}
				if (!errorReason) {
					deferred.reject('network-error');
					return;
				}
				errorLabel = jQuery(errorDoc).find('Error Message').text();

				deferred.reject(errorReasonMap[errorReason], errorLabel);
			};

		['key', 'AWSAccessKeyId', 'policy', 'signature'].forEach(function (parameter) {
			formData.append(parameter, saveConfiguration[parameter]);
		});
		formData.append('acl', savePolicy);
		formData.append('Content-Type', 'text/plain');
		formData.append('file', contentToSave);
		jQuery.ajax({
			url: 'https://' + saveConfiguration.s3BucketName + '.s3.amazonaws.com/',
			type: 'POST',
			processData: false,
			contentType: false,
			data: formData
		}).then(deferred.resolve, saveFailed);
		return deferred.promise();
	};
	self.pollerDefaults = {sleepPeriod: 1000, timeoutPeriod: 20000};
	self.poll = function (signedListUrl, options) {
		var sleepTimeoutId,
			timeoutId,
			deferred = jQuery.Deferred(),
			shouldPoll = function () {
				return deferred && !(options.stoppedSemaphore && options.stoppedSemaphore());
			},
			execRequest = function () {
				var setSleepTimeout = function () {
					if (shouldPoll()) {
						options.sleepTimeoutId = window.setTimeout(execRequest, options.sleepPeriod);
					}
				};
				if (shouldPoll()) {
					jQuery.ajax({
						url: signedListUrl,
						timeout: options.sleepPeriod,
						method: 'GET'
					}).then(function success(result) {
						var key = jQuery(result).find('Contents Key').first().text();
						if (deferred && key) {
							window.clearTimeout(timeoutId);
							deferred.resolve(key);
						} else {
							setSleepTimeout();
						}
					}, setSleepTimeout);
				} else {
					window.clearTimeout(timeoutId);
				}
			},
			cancelRequest = function () {
				if (shouldPoll()) {
					deferred.reject('polling-timeout');
				}
				window.clearTimeout(sleepTimeoutId);
				deferred = undefined;
			};
		options = _.extend(self.pollerDefaults, options);

		if (shouldPoll()) {
			timeoutId = window.setTimeout(cancelRequest, options.timeoutPeriod);
			execRequest();
		}
		return deferred.promise();
	};
	self.loadUrl = function  (url) {
		var deferred = jQuery.Deferred();
		jQuery.ajax(
			url, { cache: false}).then(
			deferred.resolve,
			function (err) {
				if (err.status === 404 || err.status === 403) {
					deferred.reject('map-not-found');
				} else {
					deferred.reject('network-error');
				}

			});
		return deferred.promise();
	};
};
/*jslint forin: true*/
/*global jQuery, MM, _*/
MM.S3ConfigGenerator = function (s3Url, publishingConfigUrl, folder) {
	'use strict';
	this.generate = function () {
		var deferred = jQuery.Deferred(),
			options = {
				url: publishingConfigUrl,
				dataType: 'json',
				type: 'POST',
				processData: false,
				contentType: false
			};
		jQuery.ajax(options).then(
			function (jsonConfig) {
				jsonConfig.s3Url = s3Url;
				jsonConfig.mapId = jsonConfig.s3UploadIdentifier;
				deferred.resolve(jsonConfig);
			},
			deferred.reject.bind(deferred, 'network-error')
		);
		return deferred.promise();
	};
	this.buildMapUrl = function (mapId) {
		return jQuery.Deferred().resolve(s3Url + folder + mapId + '.json').promise();
	};
};

MM.S3FileSystem = function (publishingConfigGenerator, prefix, description) {
	'use strict';

	var properties = {editable: true},
		s3Api = new MM.S3Api();
	this.description = description;
	this.prefix = prefix;
	this.recognises = function (mapId) {
		return mapId && mapId[0] === prefix;
	};
	this.loadMap = function (mapId, showAuthentication) {
		var deferred = jQuery.Deferred(),
			onMapLoaded = function (result) {
				deferred.resolve(result, mapId, 'application/json', properties);
			};
		publishingConfigGenerator.buildMapUrl(mapId, prefix, showAuthentication).then(
			function (mapUrl) {
				s3Api.loadUrl(mapUrl).then(onMapLoaded, deferred.reject);
			},
			deferred.reject
		);
		return deferred.promise();
	};
	this.saveMap = function (contentToSave, mapId, fileName, showAuthenticationDialog) {
		var deferred = jQuery.Deferred(),
			submitS3Form = function (publishingConfig) {
				s3Api.save(contentToSave, publishingConfig, {'isPrivate': false}).then(
					function () {
						deferred.resolve(publishingConfig.mapId, _.extend(publishingConfig, properties));
					},
					deferred.reject
				);
			};
		publishingConfigGenerator.generate(mapId, fileName, prefix, showAuthenticationDialog).then(
			submitS3Form,
			deferred.reject
		);
		return deferred.promise();
	};

};


/*global document, jQuery*/
jQuery.fn.scoreWidget = function (activityLog, alert, timeout, storage, storageKey, currentCohort) {
	'use strict';
	return this.each(function () {
		var element = jQuery(this),
			send = function () {
				var val = element.find('button.active').val();
				if (val) {
					activityLog.log('Score', 'send-modal');
					activityLog.log('Score', val, element.find('[name=why]').val());
					element.modal('hide');
				} else {
					element.find('button').effect('pulsate');
				}
				return false;
			},
		    dateToYMD = function (millis) {
				var date = new Date(millis),
					d = date.getDate(),
					m = date.getMonth() + 1,
					y = date.getFullYear();
				return String('') + y + (m <= 9 ? '0' + m : m) + (d <= 9 ? '0' + d : d);
			},
		    alertId,
			showIfNeeded = function () {
				var now = Date.now();
				/*jslint eqeq:true*/
				if (storage[storageKey] || currentCohort != dateToYMD(now)) {
					return;
				}
				activityLog.log('Score', 'show-modal-alert');
				alertId = alert.show('Please help us improve!', '<a data-toggle="modal" data-target="#modalScore">Click here to answer one very quick question</a>, we would appreciate that very much', 'warning');
				storage[storageKey] = now;
			};
		element.on('show', function () {
			activityLog.log('Score', 'show-modal');
			if (alertId) {
				alert.hide(alertId);
			}
			element.find('button').removeClass('active');
			element.find('[name=why]').val('');
		});
		element.find('[data-mm-role=send]').click(send);
		element.find('form').submit(send);
		setTimeout(showIfNeeded, timeout * 1000);
	});
};
/*global document, jQuery*/
jQuery.fn.scoreAlertWidget = function (activityLog, alert, timeout, storage, storageKey, currentCohort) {
	'use strict';
	return this.each(function () {
		var template = jQuery(this).html(),
			element,
		    now = Date.now(),
			send = function () {
				var val = element.find('button.active').val();
				if (val) {
					activityLog.log('Score', 'send-alert');
					activityLog.log('Score', val, element.find('[name=why]').val());
					element.hide();
				} else {
					element.find('button').effect('pulsate');
				}
				return false;
			},
		    dateToYMD = function (millis) {
				var date = new Date(millis),
					d = date.getDate(),
					m = date.getMonth() + 1,
					y = date.getFullYear();
				return String('') + y + (m <= 9 ? '0' + m : m) + (d <= 9 ? '0' + d : d);
			},
		    alertId,
			show = function () {
				activityLog.log('Score', 'show-alert');
				alertId = alert.show('Will you visit MindMup again in the next 7 days?', template, 'warning');
				element = jQuery('.alert-no-' + alertId);
				storage[storageKey] = now;
				element.find('form').submit(send);
			};
		/*jslint eqeq:true*/
		if (storage[storageKey] || currentCohort != dateToYMD(now)) {
			return;
		}
		setTimeout(show, timeout * 1000);
	});
};

/*global MM, MAPJS, _, $, jQuery*/
MM.exportIdeas = function (contentAggregate, exporter) {
	'use strict';
	var traverse = function (iterator, idea, level) {
		level = level || 0;
		iterator(idea, level);
		_.each(idea.sortedSubIdeas(), function (subIdea) {
			traverse(iterator, subIdea, level + 1);
		});
	};
	if (exporter.begin) { exporter.begin(); }
	traverse(exporter.each, contentAggregate);
	if (exporter.end) { exporter.end(); }
	return exporter.contents();
};
MM.TabSeparatedTextExporter = function () {
	'use strict';
	var contents = [];
	this.contents = function () {
		return contents.join('\n');
	};
	this.each = function (idea, level) {
		contents.push(
			_.map(_.range(level), function () {return '\t'; }).join('') + idea.title.replace(/\t|\n|\r/g, ' ')
		);
	};
};
MM.HtmlTableExporter = function () {
	'use strict';
	var result;
	this.begin = function () {
		result = $('<table>').wrap('<div></div>'); /*parent needed for html generation*/
	};
	this.contents = function () {
		return '<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"> </head><body>' +
			$(result).parent().html() +
			'</body></html>';
	};
	this.each = function (idea, level) {
		var row = $('<tr>').appendTo(result),
			cell = $('<td>').appendTo(row).text(idea.title);
		if (idea.attr && idea.attr.style && idea.attr.style.background) {
			cell.css('background-color', idea.attr.style.background);
			cell.css('color', MAPJS.contrastForeground(idea.attr.style.background));
		}
		if (level > 0) {
			$('<td>').prependTo(row).html('&nbsp;').attr('colspan', level);
		}
	};
};
MM.exportToHtmlDocument = function (idea) {
	'use strict';
	var deferred = jQuery.Deferred(),
		createContent = function (imageUrl) {
			var result = $('<div>'), /*parent needed for html generation*/
				appendLinkOrText = function (element, text) {
					if (MAPJS.URLHelper.containsLink(text)) {
						$('<a>').attr('href', MAPJS.URLHelper.getLink(text))
							.text(MAPJS.URLHelper.stripLink(text) || text)
							.appendTo(element);
					} else {
						element.text(text);
					}
				},
				appendAttachment = function (element, anIdea) {
					var attachment = anIdea && anIdea.attr && anIdea.attr.attachment;
					if (attachment && attachment.contentType === 'text/html') {
						$('<div>').addClass('attachment').appendTo(element).html(attachment.content);
					}
				},
				toList = function (ideaList) {
					var list = $('<ul>');
					_.each(ideaList, function (subIdea) {
						var element = $('<li>').appendTo(list);
						appendLinkOrText(element, subIdea.title);
						appendAttachment(element, subIdea);
						if (subIdea.attr && subIdea.attr.style && subIdea.attr.style.background) {
							element.css('background-color', subIdea.attr.style.background);
							element.css('color', MAPJS.contrastForeground(subIdea.attr.style.background));
						}
						if (!_.isEmpty(subIdea.ideas)) {
							toList(subIdea.sortedSubIdeas()).appendTo(element);
						}
					});
					return list;
				},
				heading = $('<h1>').appendTo(result);
			if (imageUrl) {
				$('<img>').addClass('mapimage').attr('src', imageUrl).appendTo(result);
			}
			appendLinkOrText(heading, idea.title);
			appendAttachment(result, idea);
			if (!_.isEmpty(idea.ideas)) {
				toList(idea.sortedSubIdeas()).appendTo(result);
			}
			deferred.resolve('<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">' +
				'<style type="text/css">' +
				'body{font-family:"HelveticaNeue",Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;color:#333333;margin-left:10%;margin-right:10%;}h1{display:block;font-size:38.5px;line-height:40px;font-family:inherit;}li{line-height:20px;padding-left:10px;}ul{list-style-type:none;}div.attachment{border:1px solid black;margin:5px;padding:5px;}img.mapimage{border:1px solid black;max-height:600px;max-width:600px;}</style>' +
				'</head><body>' +
				$(result).html() +
				'</body></html>', 'text/html');
		};
	MAPJS.pngExport(idea).then(createContent);
	return deferred.promise();
};

/*global $, window*/
$.fn.toggleClassWidget = function () {
	'use strict';
	var element = this;
	element.filter('[data-mm-key]').each(function () {
		var button = $(this);
		$(window).keydown(button.data('mm-key'), function (evt) {
			button.click();
			evt.preventDefault();
		});
	});
	element.click(function () {
		var target = $($(this).data('mm-target')),
			targetClass = $(this).data('mm-class');
		target.toggleClass(targetClass);
	});
	return element;
};
