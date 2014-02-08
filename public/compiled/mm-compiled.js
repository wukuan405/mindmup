var MAPJS = {};
/*global console*/
var observable = function (base) {
	'use strict';
	var listeners = [];
	base.addEventListener = function (types, listener, priority) {
		types.split(' ').forEach(function (type) {
			if (type) {
				listeners.push({
					type: type,
					listener: listener,
					priority: priority || 0
				});
			}
		});
	};
	base.listeners = function (type) {
		return listeners.filter(function (listenerDetails) {
			return listenerDetails.type === type;
		}).map(function (listenerDetails) {
			return listenerDetails.listener;
		});
	};
	base.removeEventListener = function (type, listener) {
		listeners = listeners.filter(function (details) {
			return details.listener !== listener;
		});
	};
	base.dispatchEvent = function (type) {
		var args = Array.prototype.slice.call(arguments, 1);
		listeners
			.filter(function (listenerDetails) {
				return listenerDetails.type === type;
			})
			.sort(function (firstListenerDetails, secondListenerDetails) {
				return secondListenerDetails.priority - firstListenerDetails.priority;
			})
			.some(function (listenerDetails) {
				try {
					return listenerDetails.listener.apply(undefined, args) === false;
				} catch (e) {
					console.log('dispatchEvent failed', e, listenerDetails);
				}

			});
	};
	return base;
};
/*global MAPJS */
MAPJS.URLHelper = {
	urlPattern: /(https?:\/\/|www\.)[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/i,
	containsLink : function (text) {
		'use strict';
		return MAPJS.URLHelper.urlPattern.test(text);
	},
	getLink : function (text) {
		'use strict';
		var url = text.match(MAPJS.URLHelper.urlPattern);
		if (url && url[0]) {
			url = url[0];
			if (!/https?:\/\//i.test(url)) {
				url = 'http://' + url;
			}
		}
		return url;
	},
	stripLink : function (text) {
		'use strict';
		return text.replace(MAPJS.URLHelper.urlPattern, '');
	}
};
/*jslint eqeq: true, forin: true, nomen: true*/
/*jshint unused:false, loopfunc:true */
/*global _, MAPJS, observable*/
MAPJS.content = function (contentAggregate, sessionKey) {
	'use strict';
	var cachedId,
		invalidateIdCache = function () {
			cachedId = undefined;
		},
		maxId = function maxId(idea) {
			idea = idea || contentAggregate;
			if (!idea.ideas) {
				return parseInt(idea.id, 10) || 0;
			}
			return _.reduce(
				idea.ideas,
				function (result, subidea) {
					return Math.max(result, maxId(subidea));
				},
				parseInt(idea.id, 10) || 0
			);
		},
		nextId = function nextId(originSession) {
			originSession = originSession || sessionKey;
			if (!cachedId) {
				cachedId =  maxId();
			}
			cachedId += 1;
			if (originSession) {
				return cachedId + '.' + originSession;
			}
			return cachedId;
		},
		init = function (contentIdea, originSession) {
			if (!contentIdea.id) {
				contentIdea.id = nextId(originSession);
			} else {
				invalidateIdCache();
			}
			if (contentIdea.ideas) {
				_.each(contentIdea.ideas, function (value, key) {
					contentIdea.ideas[parseFloat(key)] = init(value, originSession);
				});
			}
			if (!contentIdea.title) {
				contentIdea.title = '';
			}
			contentIdea.containsDirectChild = contentIdea.findChildRankById = function (childIdeaId) {
				return parseFloat(
					_.reduce(
						contentIdea.ideas,
						function (res, value, key) {
							return value.id == childIdeaId ? key : res;
						},
						undefined
					)
				);
			};
			contentIdea.findSubIdeaById = function (childIdeaId) {
				var myChild = _.find(contentIdea.ideas, function (idea) {
					return idea.id == childIdeaId;
				});
				return myChild || _.reduce(contentIdea.ideas, function (result, idea) {
					return result || idea.findSubIdeaById(childIdeaId);
				}, undefined);
			};
			contentIdea.find = function (predicate) {
				var current = predicate(contentIdea) ? [_.pick(contentIdea, 'id', 'title')] : [];
				if (_.size(contentIdea.ideas) === 0) {
					return current;
				}
				return _.reduce(contentIdea.ideas, function (result, idea) {
					return _.union(result, idea.find(predicate));
				}, current);
			};
			contentIdea.getAttr = function (name) {
				if (contentIdea.attr && contentIdea.attr[name]) {
					return _.clone(contentIdea.attr[name]);
				}
				return false;
			};
			contentIdea.sortedSubIdeas = function () {
				if (!contentIdea.ideas) {
					return [];
				}
				var result = [],
					childKeys = _.groupBy(_.map(_.keys(contentIdea.ideas), parseFloat), function (key) { return key > 0; }),
					sortedChildKeys = _.sortBy(childKeys[true], Math.abs).concat(_.sortBy(childKeys[false], Math.abs));
				_.each(sortedChildKeys, function (key) {
					result.push(contentIdea.ideas[key]);
				});
				return result;
			};
			contentIdea.traverse = function (iterator) {
				iterator(contentIdea);
				_.each(contentIdea.sortedSubIdeas(), function (subIdea) {
					subIdea.traverse(iterator);
				});
			};
			return contentIdea;
		},
		maxKey = function (kvMap, sign) {
			sign = sign || 1;
			if (_.size(kvMap) === 0) {
				return 0;
			}
			var currentKeys = _.keys(kvMap);
			currentKeys.push(0); /* ensure at least 0 is there for negative ranks */
			return _.max(_.map(currentKeys, parseFloat), function (x) {
				return x * sign;
			});
		},
		nextChildRank = function (parentIdea) {
			var newRank, counts, childRankSign = 1;
			if (parentIdea.id == contentAggregate.id) {
				counts = _.countBy(parentIdea.ideas, function (v, k) {
					return k < 0;
				});
				if ((counts['true'] || 0) < counts['false']) {
					childRankSign = -1;
				}
			}
			newRank = maxKey(parentIdea.ideas, childRankSign) + childRankSign;
			return newRank;
		},
		appendSubIdea = function (parentIdea, subIdea) {
			var rank;
			parentIdea.ideas = parentIdea.ideas || {};
			rank = nextChildRank(parentIdea);
			parentIdea.ideas[rank] = subIdea;
			return rank;
		},
		findIdeaById = function (ideaId) {
			return contentAggregate.id == ideaId ? contentAggregate : contentAggregate.findSubIdeaById(ideaId);
		},
		sameSideSiblingRanks = function (parentIdea, ideaRank) {
			return _(_.map(_.keys(parentIdea.ideas), parseFloat)).reject(function (k) {return k * ideaRank < 0; });
		},
		sign = function (number) {
			/* intentionally not returning 0 case, to help with split sorting into 2 groups */
			return number < 0 ? -1 : 1;
		},
		eventStacks = {},
		redoStacks = {},
		isRedoInProgress = false,
		batches = {},
		notifyChange = function (method, args, originSession) {
			if (originSession) {
				contentAggregate.dispatchEvent('changed', method, args, originSession);
			} else {
				contentAggregate.dispatchEvent('changed', method, args);
			}
		},
		appendChange = function (method, args, undofunc, originSession) {
			var prev;
			if (method === 'batch' || batches[originSession] || !eventStacks || !eventStacks[originSession] || eventStacks[originSession].length === 0) {
				logChange(method, args, undofunc, originSession);
				return;
			} else {
				prev = eventStacks[originSession].pop();
				if (prev.eventMethod === 'batch') {
					eventStacks[originSession].push({
						eventMethod: 'batch',
						eventArgs: prev.eventArgs.concat([[method].concat(args)]),
						undoFunction: function () {
							undofunc();
							prev.undoFunction();
						}
					});
				} else {
					eventStacks[originSession].push({
						eventMethod: 'batch',
						eventArgs: [[prev.eventMethod].concat(prev.eventArgs)].concat([[method].concat(args)]),
						undoFunction: function () {
							undofunc();
							prev.undoFunction();
						}
					});
				}
			}
			if (isRedoInProgress) {
				contentAggregate.dispatchEvent('changed', 'redo', undefined, originSession);
			} else {
				notifyChange(method, args, originSession);
				redoStacks[originSession] = [];
			}
		},
		logChange = function (method, args, undofunc, originSession) {
			var event = {eventMethod: method, eventArgs: args, undoFunction: undofunc};
			if (batches[originSession]) {
				batches[originSession].push(event);
				return;
			}
			if (!eventStacks[originSession]) {
				eventStacks[originSession] = [];
			}
			eventStacks[originSession].push(event);

			if (isRedoInProgress) {
				contentAggregate.dispatchEvent('changed', 'redo', undefined, originSession);
			} else {
				notifyChange(method, args, originSession);
				redoStacks[originSession] = [];
			}
		},
		reorderChild = function (parentIdea, newRank, oldRank) {
			parentIdea.ideas[newRank] = parentIdea.ideas[oldRank];
			delete parentIdea.ideas[oldRank];
		},
		upgrade = function (idea) {
			if (idea.style) {
				idea.attr = {};
				var collapsed = idea.style.collapsed;
				delete idea.style.collapsed;
				idea.attr.style = idea.style;
				if (collapsed) {
					idea.attr.collapsed = collapsed;
				}
				delete idea.style;
			}
			if (idea.ideas) {
				_.each(idea.ideas, upgrade);
			}
		},
		sessionFromId = function (id) {
			var dotIndex = String(id).indexOf('.');
			return dotIndex > 0 && id.substr(dotIndex + 1);
		},
		commandProcessors = {};
	contentAggregate.getSessionKey = function () {
		return sessionKey;
	};
	contentAggregate.nextSiblingId = function (subIdeaId) {
		var parentIdea = contentAggregate.findParent(subIdeaId),
			currentRank,
			candidateSiblingRanks,
			siblingsAfter;
		if (!parentIdea) { return false; }
		currentRank = parentIdea.findChildRankById(subIdeaId);
		candidateSiblingRanks = sameSideSiblingRanks(parentIdea, currentRank);
		siblingsAfter = _.reject(candidateSiblingRanks, function (k) { return Math.abs(k) <= Math.abs(currentRank); });
		if (siblingsAfter.length === 0) { return false; }
		return parentIdea.ideas[_.min(siblingsAfter, Math.abs)].id;
	};
	contentAggregate.sameSideSiblingIds = function (subIdeaId) {
		var parentIdea = contentAggregate.findParent(subIdeaId),
			currentRank = parentIdea.findChildRankById(subIdeaId);
		return _.without(_.map(_.pick(parentIdea.ideas, sameSideSiblingRanks(parentIdea, currentRank)), function (i) { return i.id; }), subIdeaId);
	};
	contentAggregate.getAttrById = function (ideaId, attrName) {
		var idea = findIdeaById(ideaId);
		return idea && idea.getAttr(attrName);
	};
	contentAggregate.previousSiblingId = function (subIdeaId) {
		var parentIdea = contentAggregate.findParent(subIdeaId),
			currentRank,
			candidateSiblingRanks,
			siblingsBefore;
		if (!parentIdea) { return false; }
		currentRank = parentIdea.findChildRankById(subIdeaId);
		candidateSiblingRanks = sameSideSiblingRanks(parentIdea, currentRank);
		siblingsBefore = _.reject(candidateSiblingRanks, function (k) { return Math.abs(k) >= Math.abs(currentRank); });
		if (siblingsBefore.length === 0) { return false; }
		return parentIdea.ideas[_.max(siblingsBefore, Math.abs)].id;
	};
	contentAggregate.clone = function (subIdeaId) {
		var toClone = (subIdeaId && subIdeaId != contentAggregate.id && contentAggregate.findSubIdeaById(subIdeaId)) || contentAggregate;
		return JSON.parse(JSON.stringify(toClone));
	};
	contentAggregate.cloneMultiple = function (subIdeaIdArray) {
		return _.map(subIdeaIdArray, contentAggregate.clone);
	};
	contentAggregate.calculatePath = function (ideaId, currentPath, potentialParent) {
		if (contentAggregate.id == ideaId) {
			return [];
		}
		currentPath = currentPath || [contentAggregate];
		potentialParent = potentialParent || contentAggregate;
		if (potentialParent.containsDirectChild(ideaId)) {
			return currentPath;
		}
		return _.reduce(
			potentialParent.ideas,
			function (result, child) {
				return result || contentAggregate.calculatePath(ideaId, [child].concat(currentPath), child);
			},
			false
		);
	};
	contentAggregate.getSubTreeIds = function (rootIdeaId) {
		var result = [],
			collectIds = function (idea) {
				if (_.isEmpty(idea.ideas)) {
					return [];
				}
				_.each(idea.sortedSubIdeas(), function (child) {
					collectIds(child);
					result.push(child.id);
				});
			};
		collectIds(contentAggregate.findSubIdeaById(rootIdeaId) || contentAggregate);
		return result;
	};
	contentAggregate.findParent = function (subIdeaId, parentIdea) {
		parentIdea = parentIdea || contentAggregate;
		if (parentIdea.containsDirectChild(subIdeaId)) {
			return parentIdea;
		}
		return _.reduce(
			parentIdea.ideas,
			function (result, child) {
				return result || contentAggregate.findParent(subIdeaId, child);
			},
			false
		);
	};

	/**** aggregate command processing methods ****/
	contentAggregate.startBatch = function (originSession) {
		var activeSession = originSession || sessionKey;
		contentAggregate.endBatch(originSession);
		batches[activeSession] = [];
	};
	contentAggregate.endBatch = function (originSession) {
		var activeSession = originSession || sessionKey,
			inBatch = batches[activeSession],
			batchArgs,
			batchUndoFunctions,
			undo;
		batches[activeSession] = undefined;
		if (_.isEmpty(inBatch)) {
			return;
		}
		if (_.size(inBatch) === 1) {
			logChange(inBatch[0].eventMethod, inBatch[0].eventArgs, inBatch[0].undoFunction, activeSession);
		} else {
			batchArgs = _.map(inBatch, function (event) {
				return [event.eventMethod].concat(event.eventArgs);
			});
			batchUndoFunctions = _.sortBy(
				_.map(inBatch, function (event) { return event.undoFunction; }),
				function (f, idx) { return -1 * idx; }
			);
			undo = function () {
				_.each(batchUndoFunctions, function (eventUndo) {
					eventUndo();
				});
			};
			logChange('batch', batchArgs, undo, activeSession);
		}
	};
	contentAggregate.execCommand = function (cmd, args, originSession) {
		if (!commandProcessors[cmd]) {
			return false;
		}
		return commandProcessors[cmd].apply(contentAggregate, [originSession || sessionKey].concat(_.toArray(args)));
	};

	contentAggregate.batch = function (batchOp) {
		contentAggregate.startBatch();
		try {
			batchOp();
		}
		finally {
			contentAggregate.endBatch();
		}
	};

	commandProcessors.batch = function (originSession) {
		contentAggregate.startBatch(originSession);
		try {
			_.each(_.toArray(arguments).slice(1), function (event) {
				contentAggregate.execCommand(event[0], event.slice(1), originSession);
			});
		}
		finally {
			contentAggregate.endBatch(originSession);
		}
	};
	contentAggregate.pasteMultiple = function (parentIdeaId, jsonArrayToPaste) {
		contentAggregate.startBatch();
		var results = _.map(jsonArrayToPaste, function (json) {
			return contentAggregate.paste(parentIdeaId, json);
		});
		contentAggregate.endBatch();
		return results;
	};

	contentAggregate.paste = function (parentIdeaId, jsonToPaste, initialId) {
		return contentAggregate.execCommand('paste', arguments);
	};
	commandProcessors.paste = function (originSession, parentIdeaId, jsonToPaste, initialId) {
		var pasteParent = (parentIdeaId == contentAggregate.id) ?  contentAggregate : contentAggregate.findSubIdeaById(parentIdeaId),
			cleanUp = function (json) {
				var result =  _.omit(json, 'ideas', 'id'), index = 1, childKeys, sortedChildKeys;
				if (json.ideas) {
					childKeys = _.groupBy(_.map(_.keys(json.ideas), parseFloat), function (key) { return key > 0; });
					sortedChildKeys = _.sortBy(childKeys[true], Math.abs).concat(_.sortBy(childKeys[false], Math.abs));
					result.ideas = {};
					_.each(sortedChildKeys, function (key) {
						result.ideas[index++] = cleanUp(json.ideas[key]);
					});
				}
				return result;
			},
			newIdea,
			newRank,
			oldPosition;
		if (initialId) {
			cachedId = parseInt(initialId, 10) - 1;
		}
		newIdea =  jsonToPaste && (jsonToPaste.title || jsonToPaste.attr) && init(cleanUp(jsonToPaste), sessionFromId(initialId));
		if (!pasteParent || !newIdea) {
			return false;
		}
		newRank = appendSubIdea(pasteParent, newIdea);
		if (initialId) {
			invalidateIdCache();
		}
		updateAttr(newIdea, 'position');
		logChange('paste', [parentIdeaId, jsonToPaste, newIdea.id], function () {
			delete pasteParent.ideas[newRank];
		}, originSession);
		return newIdea.id;
	};
	contentAggregate.flip = function (ideaId) {
		return contentAggregate.execCommand('flip', arguments);
	};
	commandProcessors.flip = function (originSession, ideaId) {
		var newRank, maxRank, currentRank = contentAggregate.findChildRankById(ideaId);
		if (!currentRank) {
			return false;
		}
		maxRank = maxKey(contentAggregate.ideas, -1 * sign(currentRank));
		newRank = maxRank - 10 * sign(currentRank);
		reorderChild(contentAggregate, newRank, currentRank);
		logChange('flip', [ideaId], function () {
			reorderChild(contentAggregate, currentRank, newRank);
		}, originSession);
		return true;
	};
	contentAggregate.initialiseTitle = function (ideaId, title) {
		return contentAggregate.execCommand('initialiseTitle', arguments);
	};
	commandProcessors.initialiseTitle = function (originSession, ideaId, title) {
		var idea = findIdeaById(ideaId), originalTitle;
		if (!idea) {
			return false;
		}
		originalTitle = idea.title;
		if (originalTitle == title) {
			return false;
		}
		idea.title = title;
		appendChange('initialiseTitle', [ideaId, title], function () {
			idea.title = originalTitle;
		}, originSession);
		return true;
	};
	contentAggregate.updateTitle = function (ideaId, title) {
		return contentAggregate.execCommand('updateTitle', arguments);
	};
	commandProcessors.updateTitle = function (originSession, ideaId, title) {
		var idea = findIdeaById(ideaId), originalTitle;
		if (!idea) {
			return false;
		}
		originalTitle = idea.title;
		if (originalTitle == title) {
			return false;
		}
		idea.title = title;
		logChange('updateTitle', [ideaId, title], function () {
			idea.title = originalTitle;
		}, originSession);
		return true;
	};
	contentAggregate.addSubIdea = function (parentId, ideaTitle, optionalNewId) {
		return contentAggregate.execCommand('addSubIdea', arguments);
	};
	commandProcessors.addSubIdea = function (originSession, parentId, ideaTitle, optionalNewId) {
		var idea, parent = findIdeaById(parentId), newRank;
		if (!parent) {
			return false;
		}
		if (optionalNewId && findIdeaById(optionalNewId)) {
			return false;
		}
		idea = init({
			title: ideaTitle,
			id: optionalNewId
		});
		newRank = appendSubIdea(parent, idea);
		logChange('addSubIdea', [parentId, ideaTitle, idea.id], function () {
			delete parent.ideas[newRank];
		}, originSession);
		return idea.id;
	};
	contentAggregate.removeMultiple = function (subIdeaIdArray) {
		contentAggregate.startBatch();
		var results = _.map(subIdeaIdArray, contentAggregate.removeSubIdea);
		contentAggregate.endBatch();
		return results;
	};
	contentAggregate.removeSubIdea = function (subIdeaId) {
		return contentAggregate.execCommand('removeSubIdea', arguments);
	};
	commandProcessors.removeSubIdea = function (originSession, subIdeaId) {
		var parent = contentAggregate.findParent(subIdeaId), oldRank, oldIdea, oldLinks;
		if (parent) {
			oldRank = parent.findChildRankById(subIdeaId);
			oldIdea = parent.ideas[oldRank];
			delete parent.ideas[oldRank];
			oldLinks = contentAggregate.links;
			contentAggregate.links = _.reject(contentAggregate.links, function (link) { return link.ideaIdFrom == subIdeaId || link.ideaIdTo == subIdeaId; });
			logChange('removeSubIdea', [subIdeaId], function () {
				parent.ideas[oldRank] = oldIdea;
				contentAggregate.links = oldLinks;
			}, originSession);
			return true;
		}
		return false;
	};
	contentAggregate.insertIntermediateMultiple = function (idArray) {
		contentAggregate.startBatch();
		var newId = contentAggregate.insertIntermediate(idArray[0]);
		_.each(idArray.slice(1), function (id) {
			contentAggregate.changeParent(id, newId);
		});
		contentAggregate.endBatch();
		return newId;
	};
	contentAggregate.insertIntermediate = function (inFrontOfIdeaId, title, optionalNewId) {
		return contentAggregate.execCommand('insertIntermediate', arguments);
	};
	commandProcessors.insertIntermediate = function (originSession, inFrontOfIdeaId, title, optionalNewId) {
		if (contentAggregate.id == inFrontOfIdeaId) {
			return false;
		}
		var childRank, oldIdea, newIdea, parentIdea = contentAggregate.findParent(inFrontOfIdeaId);
		if (!parentIdea) {
			return false;
		}
		if (optionalNewId && findIdeaById(optionalNewId)) {
			return false;
		}
		childRank = parentIdea.findChildRankById(inFrontOfIdeaId);
		if (!childRank) {
			return false;
		}
		oldIdea = parentIdea.ideas[childRank];
		newIdea = init({
			title: title,
			id: optionalNewId
		});
		parentIdea.ideas[childRank] = newIdea;
		newIdea.ideas = {
			1: oldIdea
		};
		logChange('insertIntermediate', [inFrontOfIdeaId, title, newIdea.id], function () {
			parentIdea.ideas[childRank] = oldIdea;
		}, originSession);
		return newIdea.id;
	};
	contentAggregate.changeParent = function (ideaId, newParentId) {
		return contentAggregate.execCommand('changeParent', arguments);
	};
	commandProcessors.changeParent = function (originSession, ideaId, newParentId) {
		var oldParent, oldRank, newRank, idea, parent = findIdeaById(newParentId), oldPosition;
		if (ideaId == newParentId) {
			return false;
		}
		if (!parent) {
			return false;
		}
		idea = contentAggregate.findSubIdeaById(ideaId);
		if (!idea) {
			return false;
		}
		if (idea.findSubIdeaById(newParentId)) {
			return false;
		}
		if (parent.containsDirectChild(ideaId)) {
			return false;
		}
		oldParent = contentAggregate.findParent(ideaId);
		if (!oldParent) {
			return false;
		}
		oldRank = oldParent.findChildRankById(ideaId);
		newRank = appendSubIdea(parent, idea);
		oldPosition = idea.getAttr('position');
		updateAttr(idea, 'position');
		delete oldParent.ideas[oldRank];
		logChange('changeParent', [ideaId, newParentId], function () {
			updateAttr(idea, 'position', oldPosition);
			oldParent.ideas[oldRank] = idea;
			delete parent.ideas[newRank];
		}, originSession);
		return true;
	};
	var updateAttr = function (object, attrName, attrValue) {
		var oldAttr;
		if (!object) {
			return false;
		}
		oldAttr = _.extend({}, object.attr);
		object.attr = _.extend({}, object.attr);
		if (!attrValue || attrValue === 'false' || (_.isObject(attrValue) && _.isEmpty(attrValue))) {
			if (!object.attr[attrName]) {
				return false;
			}
			delete object.attr[attrName];
		} else {
			if (_.isEqual(object.attr[attrName], attrValue)) {
				return false;
			}
			object.attr[attrName] = JSON.parse(JSON.stringify(attrValue));
		}
		if (_.size(object.attr) === 0) {
			delete object.attr;
		}
		return function () {
			object.attr = oldAttr;
		};
	};
	contentAggregate.mergeAttrProperty = function (ideaId, attrName, attrPropertyName, attrPropertyValue) {
		var val = contentAggregate.getAttrById(ideaId, attrName) || {};
		if (attrPropertyValue) {
			val[attrPropertyName] = attrPropertyValue;
		} else {
			delete val[attrPropertyName];
		}
		if (_.isEmpty(val)) { val = false; }
		return contentAggregate.updateAttr(ideaId, attrName, val);
	};
	contentAggregate.updateAttr = function (ideaId, attrName, attrValue) {
		return contentAggregate.execCommand('updateAttr', arguments);
	};
	commandProcessors.updateAttr = function (originSession, ideaId, attrName, attrValue) {
		var idea = findIdeaById(ideaId), undoAction;
		undoAction = updateAttr(idea, attrName, attrValue);
		if (undoAction) {
			logChange('updateAttr', [ideaId, attrName, attrValue], undoAction, originSession);
		}
		return !!undoAction;
	};
	contentAggregate.moveRelative = function (ideaId, relativeMovement) {
		var parentIdea = contentAggregate.findParent(ideaId),
			currentRank = parentIdea && parentIdea.findChildRankById(ideaId),
			siblingRanks = currentRank && _.sortBy(sameSideSiblingRanks(parentIdea, currentRank), Math.abs),
			currentIndex = siblingRanks && siblingRanks.indexOf(currentRank),
			/* we call positionBefore, so movement down is actually 2 spaces, not 1 */
			newIndex = currentIndex + (relativeMovement > 0 ? relativeMovement + 1 : relativeMovement),
			beforeSibling = (newIndex >= 0) && parentIdea && siblingRanks && parentIdea.ideas[siblingRanks[newIndex]];
		if (newIndex < 0 || !parentIdea) {
			return false;
		}
		return contentAggregate.positionBefore(ideaId, beforeSibling && beforeSibling.id, parentIdea);
	};
	contentAggregate.positionBefore = function (ideaId, positionBeforeIdeaId, parentIdea) {
		return contentAggregate.execCommand('positionBefore', arguments);
	};
	commandProcessors.positionBefore = function (originSession, ideaId, positionBeforeIdeaId, parentIdea) {
		parentIdea = parentIdea || contentAggregate;
		var newRank, afterRank, siblingRanks, candidateSiblings, beforeRank, maxRank, currentRank;
		currentRank = parentIdea.findChildRankById(ideaId);
		if (!currentRank) {
			return _.reduce(
				parentIdea.ideas,
				function (result, idea) {
					return result || commandProcessors.positionBefore(originSession, ideaId, positionBeforeIdeaId, idea);
				},
				false
			);
		}
		if (ideaId == positionBeforeIdeaId) {
			return false;
		}
		newRank = 0;
		if (positionBeforeIdeaId) {
			afterRank = parentIdea.findChildRankById(positionBeforeIdeaId);
			if (!afterRank) {
				return false;
			}
			siblingRanks = sameSideSiblingRanks(parentIdea, currentRank);
			candidateSiblings = _.reject(_.sortBy(siblingRanks, Math.abs), function (k) {
				return Math.abs(k) >= Math.abs(afterRank);
			});
			beforeRank = candidateSiblings.length > 0 ? _.max(candidateSiblings, Math.abs) : 0;
			if (beforeRank == currentRank) {
				return false;
			}
			newRank = beforeRank + (afterRank - beforeRank) / 2;
		} else {
			maxRank = maxKey(parentIdea.ideas, currentRank < 0 ? -1 : 1);
			if (maxRank == currentRank) {
				return false;
			}
			newRank = maxRank + 10 * (currentRank < 0 ? -1 : 1);
		}
		if (newRank == currentRank) {
			return false;
		}
		reorderChild(parentIdea, newRank, currentRank);
		logChange('positionBefore', [ideaId, positionBeforeIdeaId], function () {
			reorderChild(parentIdea, currentRank, newRank);
		}, originSession);
		return true;
	};
	observable(contentAggregate);
	(function () {
		var isLinkValid = function (ideaIdFrom, ideaIdTo) {
			var isParentChild, ideaFrom, ideaTo;
			if (ideaIdFrom === ideaIdTo) {
				return false;
			}
			ideaFrom = findIdeaById(ideaIdFrom);
			if (!ideaFrom) {
				return false;
			}
			ideaTo = findIdeaById(ideaIdTo);
			if (!ideaTo) {
				return false;
			}
			isParentChild = _.find(
				ideaFrom.ideas,
				function (node) {
					return node.id === ideaIdTo;
				}
			) || _.find(
				ideaTo.ideas,
				function (node) {
					return node.id === ideaIdFrom;
				}
			);
			if (isParentChild) {
				return false;
			}
			return true;
		};
		contentAggregate.addLink = function (ideaIdFrom, ideaIdTo) {
			return contentAggregate.execCommand('addLink', arguments);
		};
		commandProcessors.addLink = function (originSession, ideaIdFrom, ideaIdTo) {
			var alreadyExists, link;
			if (!isLinkValid(ideaIdFrom, ideaIdTo)) {
				return false;
			}
			alreadyExists = _.find(
				contentAggregate.links,
				function (link) {
					return (link.ideaIdFrom === ideaIdFrom && link.ideaIdTo === ideaIdTo) || (link.ideaIdFrom === ideaIdTo && link.ideaIdTo === ideaIdFrom);
				}
			);
			if (alreadyExists) {
				return false;
			}
			contentAggregate.links = contentAggregate.links || [];
			link = {
				ideaIdFrom: ideaIdFrom,
				ideaIdTo: ideaIdTo,
				attr: {
					style: {
						color: '#FF0000',
						lineStyle: 'dashed'
					}
				}
			};
			contentAggregate.links.push(link);
			logChange('addLink', [ideaIdFrom, ideaIdTo], function () {
				contentAggregate.links.pop();
			}, originSession);
			return true;
		};
		contentAggregate.removeLink = function (ideaIdOne, ideaIdTwo) {
			return contentAggregate.execCommand('removeLink', arguments);
		};
		commandProcessors.removeLink = function (originSession, ideaIdOne, ideaIdTwo) {
			var i = 0, link;

			while (contentAggregate.links && i < contentAggregate.links.length) {
				link = contentAggregate.links[i];
				if (String(link.ideaIdFrom) === String(ideaIdOne) && String(link.ideaIdTo) === String(ideaIdTwo)) {
					contentAggregate.links.splice(i, 1);
					logChange('removeLink', [ideaIdOne, ideaIdTwo], function () {
						contentAggregate.links.push(_.clone(link));
					}, originSession);
					return true;
				}
				i += 1;
			}
			return false;
		};
		contentAggregate.getLinkAttr = function (ideaIdFrom, ideaIdTo, name) {
			var link = _.find(
				contentAggregate.links,
				function (link) {
					return link.ideaIdFrom == ideaIdFrom && link.ideaIdTo == ideaIdTo;
				}
			);
			if (link && link.attr && link.attr[name]) {
				return link.attr[name];
			}
			return false;
		};
		contentAggregate.updateLinkAttr = function (ideaIdFrom, ideaIdTo, attrName, attrValue) {
			return contentAggregate.execCommand('updateLinkAttr', arguments);
		};
		commandProcessors.updateLinkAttr = function (originSession, ideaIdFrom, ideaIdTo, attrName, attrValue) {
			var link = _.find(
				contentAggregate.links,
				function (link) {
					return link.ideaIdFrom == ideaIdFrom && link.ideaIdTo == ideaIdTo;
				}
			), undoAction;
			undoAction = updateAttr(link, attrName, attrValue);
			if (undoAction) {
				logChange('updateLinkAttr', [ideaIdFrom, ideaIdTo, attrName, attrValue], undoAction, originSession);
			}
			return !!undoAction;
		};
	}());
	/* undo/redo */
	contentAggregate.undo = function () {
		return contentAggregate.execCommand('undo', arguments);
	};
	commandProcessors.undo = function (originSession) {
		contentAggregate.endBatch();
		var topEvent;
		topEvent = eventStacks[originSession] && eventStacks[originSession].pop();
		if (topEvent && topEvent.undoFunction) {
			topEvent.undoFunction();
			if (!redoStacks[originSession]) {
				redoStacks[originSession] = [];
			}
			redoStacks[originSession].push(topEvent);
			contentAggregate.dispatchEvent('changed', 'undo', [], originSession);
			return true;
		}
		return false;
	};
	contentAggregate.redo = function () {
		return contentAggregate.execCommand('redo', arguments);
	};
	commandProcessors.redo = function (originSession) {
		contentAggregate.endBatch();
		var topEvent;
		topEvent = redoStacks[originSession] && redoStacks[originSession].pop();
		if (topEvent) {
			isRedoInProgress = true;
			contentAggregate.execCommand(topEvent.eventMethod, topEvent.eventArgs, originSession);
			isRedoInProgress = false;
			return true;
		}
		return false;
	};
	if (contentAggregate.formatVersion != 2) {
		upgrade(contentAggregate);
		contentAggregate.formatVersion = 2;
	}
	init(contentAggregate);
	return contentAggregate;
};
/*jslint nomen: true*/
/*global _, Color, MAPJS*/
MAPJS.defaultStyles = {
	root: {background: '#22AAE0'},
	nonRoot: {background: '#E0E0E0'}
};
MAPJS.layoutLinks = function (idea, visibleNodes) {
	'use strict';
	var result = {};
	_.each(idea.links, function (link) {
		if (visibleNodes[link.ideaIdFrom] && visibleNodes[link.ideaIdTo]) {
			result[link.ideaIdFrom + '_' + link.ideaIdTo] = {
				ideaIdFrom: link.ideaIdFrom,
				ideaIdTo: link.ideaIdTo,
				attr: _.clone(link.attr)
			};
			//todo - clone
		}
	});
	return result;
};
MAPJS.calculateFrame = function (nodes, margin) {
	'use strict';
	margin = margin || 0;
	var result = {
		top: _.min(nodes, function (node) {return node.y; }).y - margin,
		left: _.min(nodes, function (node) {return node.x; }).x - margin
	};
	result.width = margin + _.max(_.map(nodes, function (node) { return node.x + node.width; })) - result.left;
	result.height = margin + _.max(_.map(nodes, function (node) { return node.y + node.height; })) - result.top;
	return result;
};
MAPJS.contrastForeground = function (background) {
	'use strict';
	/*jslint newcap:true*/
	var luminosity = Color(background).luminosity();
	if (luminosity < 0.5) {
		return '#EEEEEE';
	}
	if (luminosity < 0.9) {
		return '#4F4F4F';
	}
	return '#000000';
};
MAPJS.Outline = function (topBorder, bottomBorder) {
	'use strict';
	var shiftBorder = function (border, deltaH) {
		return _.map(border, function (segment) {
			return {
				l: segment.l,
				h: segment.h + deltaH
			};
		});
	};
	this.initialHeight = function () {
		return this.bottom[0].h - this.top[0].h;
	};
	this.borders = function () {
		return _.pick(this, 'top', 'bottom');
	};
	this.spacingAbove = function (outline) {
		var i = 0, j = 0, result = 0, li = 0, lj = 0;
		while (i < this.bottom.length && j < outline.top.length) {
			result = Math.max(result, this.bottom[i].h - outline.top[j].h);
			if (li + this.bottom[i].l < lj + outline.top[j].l) {
				li += this.bottom[i].l;
				i += 1;
			} else if (li + this.bottom[i].l === lj + outline.top[j].l) {
				li += this.bottom[i].l;
				i += 1;
				lj += outline.top[j].l;
				j += 1;
			} else {
				lj += outline.top[j].l;
				j += 1;
			}
		}
		return result;
	};
	this.indent = function (horizontalIndent, margin) {
		if (!horizontalIndent) {
			return this;
		}
		var top = this.top.slice(),
			bottom = this.bottom.slice(),
			vertCenter = (bottom[0].h + top[0].h) / 2;
		top.unshift({h: vertCenter - margin / 2, l: horizontalIndent});
		bottom.unshift({h: vertCenter + margin / 2, l: horizontalIndent});
		return new MAPJS.Outline(top, bottom);
	};
	this.stackBelow = function (outline, margin) {
		var spacing = outline.spacingAbove(this),
			top = MAPJS.Outline.extendBorder(outline.top, shiftBorder(this.top, spacing + margin)),
			bottom = MAPJS.Outline.extendBorder(shiftBorder(this.bottom, spacing + margin), outline.bottom);
		return new MAPJS.Outline(
			top,
			bottom
		);
	};
	this.expand = function (initialTopHeight, initialBottomHeight) {
		var topAlignment = initialTopHeight - this.top[0].h,
			bottomAlignment = initialBottomHeight - this.bottom[0].h,
			top = shiftBorder(this.top, topAlignment),
			bottom = shiftBorder(this.bottom, bottomAlignment);
		return new MAPJS.Outline(
			top,
			bottom
		);
	};
	this.insertAtStart = function (dimensions, margin) {
		var suboutlineHeight = this.initialHeight(),
			alignment = 0, //-1 * this.top[0].h - suboutlineHeight * 0.5,
			topBorder = shiftBorder(this.top, alignment),
			bottomBorder = shiftBorder(this.bottom, alignment),
			easeIn = function (border) {
				border[0].l *= 0.5;
				border[1].l += border[0].l;
			};
		topBorder[0].l += margin;
		bottomBorder[0].l += margin;
		topBorder.unshift({h: -0.5 * dimensions.height, l: dimensions.width});
		bottomBorder.unshift({h: 0.5 * dimensions.height, l: dimensions.width});
		if (topBorder[0].h > topBorder[1].h) {
			easeIn(topBorder);
		}
		if (bottomBorder[0].h < bottomBorder[1].h) {
			easeIn(bottomBorder);
		}
		return new MAPJS.Outline(topBorder, bottomBorder);
	};
	this.top = topBorder.slice();
	this.bottom = bottomBorder.slice();
};
MAPJS.Outline.borderLength = function (border) {
	'use strict';
	return _.reduce(border, function (seed, el) {
		return seed + el.l;
	}, 0);
};
MAPJS.Outline.borderSegmentIndexAt = function (border, length) {
	'use strict';
	var l = 0, i = -1;
	while (l <= length) {
		i += 1;
		if (i >= border.length) {
			return -1;
		}
		l += border[i].l;
	}
	return i;
};
MAPJS.Outline.extendBorder = function (originalBorder, extension) {
	'use strict';
	var result = originalBorder.slice(),
		origLength = MAPJS.Outline.borderLength(originalBorder),
		i = MAPJS.Outline.borderSegmentIndexAt(extension, origLength),
		lengthToCut;
	if (i >= 0) {
		lengthToCut = MAPJS.Outline.borderLength(extension.slice(0, i + 1));
		result.push({h: extension[i].h, l: lengthToCut - origLength});
		result = result.concat(extension.slice(i + 1));
	}
	return result;
};
MAPJS.Tree = function (options) {
	'use strict';
	_.extend(this, options);
	this.toLayout = function (level, x, y, parentId) {
		x = x || 0;
		y = y || 0;
		var result = {
			nodes: {},
			connectors: {}
		}, self;
		self = _.pick(this, 'id', 'title', 'attr', 'width', 'height');
		self.level = level || 1;
		if (self.level === 1) {
			self.x = -0.5 * this.width;
			self.y = -0.5 * this.height;
		} else {
			self.x = x + this.deltaX || 0;
			self.y = y + this.deltaY || 0;
		}
		result.nodes[this.id] = self;
		if (parentId !== undefined) {
			result.connectors[self.id] = {
				from: parentId,
				to: self.id
			};
		}
		if (this.subtrees) {
			this.subtrees.forEach(function (t) {
				var subLayout = t.toLayout(self.level + 1, self.x, self.y, self.id);
				_.extend(result.nodes, subLayout.nodes);
				_.extend(result.connectors, subLayout.connectors);
			});
		}
		return result;
	};
};
MAPJS.Outline.fromDimensions = function (dimensions) {
	'use strict';
	return new MAPJS.Outline([{
		h: -0.5 * dimensions.height,
		l: dimensions.width
	}], [{
		h: 0.5 * dimensions.height,
		l: dimensions.width
	}]);
};
MAPJS.calculateTree = function (content, dimensionProvider, margin, rankAndParentPredicate) {
	'use strict';
	var options = {
		id: content.id,
		title: content.title,
		attr: content.attr,
		deltaY: 0,
		deltaX: 0
	},
		setVerticalSpacing = function (treeArray,  dy) {
			var i,
				tree,
				oldSpacing,
				newSpacing,
				oldPositions = _.map(treeArray, function (t) { return _.pick(t, 'deltaX', 'deltaY'); }),
				referenceTree,
				alignment;
			for (i = 0; i < treeArray.length; i += 1) {
				tree = treeArray[i];
				if (tree.attr && tree.attr.position) {
					tree.deltaY = tree.attr.position[1];
					if (referenceTree === undefined || tree.attr.position[2] > treeArray[referenceTree].attr.position[2]) {
						referenceTree = i;
					}
				} else {
					tree.deltaY += dy;
				}
				if (i > 0) {
					oldSpacing = oldPositions[i].deltaY - oldPositions[i - 1].deltaY;
					newSpacing = treeArray[i].deltaY - treeArray[i - 1].deltaY;
					if (newSpacing < oldSpacing) {
						tree.deltaY += oldSpacing - newSpacing;
					}
				}
			}
			alignment =  referenceTree && (treeArray[referenceTree].attr.position[1] - treeArray[referenceTree].deltaY);
			if (alignment) {
				for (i = 0; i < treeArray.length; i += 1) {
					treeArray[i].deltaY += alignment;
				}
			}
		},
		shouldIncludeSubIdeas = function () {
			return !(_.isEmpty(content.ideas) || (content.attr && content.attr.collapsed));
		},
		includedSubIdeaKeys = function () {
			var allRanks = _.map(_.keys(content.ideas), parseFloat),
				includedRanks = rankAndParentPredicate ? _.filter(allRanks, function (rank) { return rankAndParentPredicate(rank, content.id); }) : allRanks;
			return _.sortBy(includedRanks, Math.abs);
		},
		includedSubIdeas = function () {
			var result = [];
			_.each(includedSubIdeaKeys(), function (key) {
				result.push(content.ideas[key]);
			});
			return result;
		},
		nodeDimensions = dimensionProvider(content),
		appendSubtrees = function (subtrees) {
			var suboutline, deltaHeight, subtreePosition, horizontal, treeOutline;
			_.each(subtrees, function (subtree) {
				subtree.deltaX = nodeDimensions.width + margin;
				subtreePosition = subtree.attr && subtree.attr.position && subtree.attr.position[0];
				if (subtreePosition && subtreePosition > subtree.deltaX) {
					horizontal = subtreePosition - subtree.deltaX;
					subtree.deltaX = subtreePosition;
				} else {
					horizontal = 0;
				}
				if (!suboutline) {
					suboutline = subtree.outline.indent(horizontal, margin);
				} else {
					treeOutline = subtree.outline.indent(horizontal, margin);
					deltaHeight = treeOutline.initialHeight();
					suboutline = treeOutline.stackBelow(suboutline, margin);
					subtree.deltaY = suboutline.initialHeight() - deltaHeight / 2 - subtree.height / 2;
				}
			});
			if (subtrees && subtrees.length) {
				setVerticalSpacing(subtrees, 0.5 * (nodeDimensions.height  - suboutline.initialHeight()));
				suboutline = suboutline.expand(
					subtrees[0].deltaY - nodeDimensions.height * 0.5,
					subtrees[subtrees.length - 1].deltaY + subtrees[subtrees.length - 1].height - nodeDimensions.height * 0.5
				);
			}
			options.outline = suboutline.insertAtStart(nodeDimensions, margin);
		},
		positionFixedSubtrees = function (subtrees) {
			_.each(subtrees, function (subtree) {
				subtree.deltaX = subtree.attr.position[0] + nodeDimensions.width * 0.5 - subtree.width * 0.5;
				subtree.deltaY = subtree.attr.position[1] + nodeDimensions.height * 0.5 - subtree.height * 0.5;
			});
		};
	_.extend(options, nodeDimensions);
	options.outline = new MAPJS.Outline.fromDimensions(nodeDimensions);
	if (shouldIncludeSubIdeas()) {
		options.subtrees = _.map(includedSubIdeas(), function (i) {
			return MAPJS.calculateTree(i, dimensionProvider, margin, rankAndParentPredicate);
		});
		if (!_.isEmpty(options.subtrees)) {
			appendSubtrees(options.subtrees);
		}
	}
	return new MAPJS.Tree(options);
};

MAPJS.calculateLayout = function (idea, dimensionProvider, margin) {
	'use strict';
	var positiveTree, negativeTree, layout, negativeLayout,
		setDefaultStyles = function (nodes) {
			_.each(nodes, function (node) {
				node.attr = node.attr || {};
				node.attr.style = _.extend({}, MAPJS.defaultStyles[(node.level === 1) ? 'root' : 'nonRoot'], node.attr.style);
			});
		},
		positive = function (rank, parentId) { return parentId !== idea.id || rank > 0; },
		negative = function (rank, parentId) { return parentId !== idea.id || rank < 0; };
	margin = margin || 20;
	positiveTree = MAPJS.calculateTree(idea, dimensionProvider, margin, positive);
	negativeTree = MAPJS.calculateTree(idea, dimensionProvider, margin, negative);
	layout = positiveTree.toLayout();
	negativeLayout = negativeTree.toLayout();
	_.each(negativeLayout.nodes, function (n) {
		n.x = -1 * n.x - n.width;
	});
	_.extend(negativeLayout.nodes, layout.nodes);
	_.extend(negativeLayout.connectors, layout.connectors);
	setDefaultStyles(negativeLayout.nodes);
	negativeLayout.links = MAPJS.layoutLinks(idea, negativeLayout.nodes);
	return negativeLayout;
};

/*jslint forin: true, nomen: true*/
/*global _, MAPJS, observable*/
MAPJS.MapModel = function (layoutCalculator, titlesToRandomlyChooseFrom, intermediaryTitlesToRandomlyChooseFrom) {
	'use strict';
	titlesToRandomlyChooseFrom = titlesToRandomlyChooseFrom || ['double click to edit'];
	intermediaryTitlesToRandomlyChooseFrom = intermediaryTitlesToRandomlyChooseFrom || titlesToRandomlyChooseFrom;
	var self = this,
		analytic,
		currentLayout = {
			nodes: {},
			connectors: {}
		},
		idea,
		isInputEnabled = true,
		isEditingEnabled = true,
		currentlySelectedIdeaId,
		activatedNodes = [],
		setActiveNodes = function (activated) {
			var wasActivated = _.clone(activatedNodes);
			activatedNodes = activated;
			self.dispatchEvent('activatedNodesChanged', _.difference(activatedNodes, wasActivated), _.difference(wasActivated, activatedNodes));
		},
		getRandomTitle = function (titles) {
			return titles[Math.floor(titles.length * Math.random())];
		},
		horizontalSelectionThreshold = 300,
		moveNodes = function (nodes, deltaX, deltaY) {
			if (deltaX || deltaY) {
				_.each(nodes, function (node) {
					node.x += deltaX;
					node.y += deltaY;
					self.dispatchEvent('nodeMoved', node);
				});
			}
		},
		isAddLinkMode,
		updateCurrentLayout = function (newLayout) {
			var nodeId, newNode, oldNode, newConnector, oldConnector, linkId, newLink, oldLink;
			for (nodeId in currentLayout.connectors) {
				newConnector = newLayout.connectors[nodeId];
				oldConnector = currentLayout.connectors[nodeId];
				if (!newConnector || newConnector.from !== oldConnector.from || newConnector.to !== oldConnector.to) {
					self.dispatchEvent('connectorRemoved', oldConnector);
				}
			}
			for (nodeId in currentLayout.nodes) {
				oldNode = currentLayout.nodes[nodeId];
				newNode = newLayout.nodes[nodeId];
				if (!newNode) {
					/*jslint eqeq: true*/
					if (nodeId == currentlySelectedIdeaId) {
						self.selectNode(idea.id);
					}
					self.dispatchEvent('nodeRemoved', oldNode, nodeId);
				}
			}
			for (nodeId in newLayout.nodes) {
				oldNode = currentLayout.nodes[nodeId];
				newNode = newLayout.nodes[nodeId];
				if (!oldNode) {
					self.dispatchEvent('nodeCreated', newNode);
				} else {
					if (newNode.x !== oldNode.x || newNode.y !== oldNode.y) {
						self.dispatchEvent('nodeMoved', newNode);
					}
					if (newNode.title !== oldNode.title) {
						self.dispatchEvent('nodeTitleChanged', newNode);
					}
					if (!_.isEqual(newNode.attr || {}, oldNode.attr || {})) {
						self.dispatchEvent('nodeAttrChanged', newNode);
					}
				}
			}
			for (nodeId in newLayout.connectors) {
				newConnector = newLayout.connectors[nodeId];
				oldConnector = currentLayout.connectors[nodeId];
				if (!oldConnector || newConnector.from !== oldConnector.from || newConnector.to !== oldConnector.to) {
					self.dispatchEvent('connectorCreated', newConnector);
				}
			}
			for (linkId in newLayout.links) {
				newLink = newLayout.links[linkId];
				oldLink = currentLayout.links && currentLayout.links[linkId];
				if (oldLink) {
					if (!_.isEqual(newLink.attr || {}, (oldLink && oldLink.attr) || {})) {
						self.dispatchEvent('linkAttrChanged', newLink);
					}
				} else {
					self.dispatchEvent('linkCreated', newLink);
				}
			}
			for (linkId in currentLayout.links) {
				oldLink = currentLayout.links[linkId];
				newLink = newLayout.links && newLayout.links[linkId];
				if (!newLink) {
					self.dispatchEvent('linkRemoved', oldLink);
				}
			}
			currentLayout = newLayout;
			self.dispatchEvent('layoutChangeComplete');
		},
		revertSelectionForUndo,
		revertActivatedForUndo,
		editNewIdea = function (newIdeaId) {
			revertSelectionForUndo = currentlySelectedIdeaId;
			revertActivatedForUndo = activatedNodes.slice(0);
			self.selectNode(newIdeaId);
			self.editNode(false, true, true);
		},
		getCurrentlySelectedIdeaId = function () {
			return currentlySelectedIdeaId || idea.id;
		},
		onIdeaChanged = function () {
			revertSelectionForUndo = false;
			revertActivatedForUndo = false;
			updateCurrentLayout(self.reactivate(layoutCalculator(idea)));
		},
		currentlySelectedIdea = function () {
			return (idea.findSubIdeaById(currentlySelectedIdeaId) || idea);
		},
		ensureNodeIsExpanded = function (source, nodeId) {
			var node = idea.findSubIdeaById(nodeId) || idea;
			if (node.getAttr('collapsed')) {
				idea.updateAttr(nodeId, 'collapsed', false);
			}
		};
	observable(this);
	analytic = self.dispatchEvent.bind(self, 'analytic', 'mapModel');
	self.getIdea = function () {
		return idea;
	};
	self.isEditingEnabled = function () {
		return isEditingEnabled;
	};
	self.getCurrentLayout = function () {
		return currentLayout;
	};
	self.analytic = analytic;
	self.getCurrentlySelectedIdeaId = getCurrentlySelectedIdeaId;
	this.setIdea = function (anIdea) {
		if (idea) {
			idea.removeEventListener('changed', onIdeaChanged);
			self.dispatchEvent('nodeSelectionChanged', currentlySelectedIdeaId, false);
			currentlySelectedIdeaId = undefined;
		}
		idea = anIdea;
		idea.addEventListener('changed', onIdeaChanged);
		onIdeaChanged();
		self.selectNode(idea.id, true);
		self.dispatchEvent('mapViewResetRequested');
	};
	this.setEditingEnabled = function (value) {
		isEditingEnabled = value;
	};
	this.getEditingEnabled = function () {
		return isEditingEnabled;
	};
	this.setInputEnabled = function (value) {
		if (isInputEnabled !== value) {
			isInputEnabled = value;
			self.dispatchEvent('inputEnabledChanged', value);
		}
	};
	this.getInputEnabled = function () {
		return isInputEnabled;
	};
	this.selectNode = function (id, force) {
		if (force || (isInputEnabled && (id !== currentlySelectedIdeaId || !self.isActivated(id)))) {
			if (currentlySelectedIdeaId) {
				self.dispatchEvent('nodeSelectionChanged', currentlySelectedIdeaId, false);
			}
			currentlySelectedIdeaId = id;
			self.dispatchEvent('nodeSelectionChanged', id, true);
		}
	};
	this.clickNode = function (id, event) {
		var button = event && event.button;
		if (event && (event.altKey || event.ctrlKey || event.metaKey)) {
			self.addLink('mouse', id);
		} else if (event && event.shiftKey) {
			/*don't stop propagation, this is needed for drop targets*/
			self.toggleActivationOnNode('mouse', id);
		} else if (isAddLinkMode && !button) {
			this.addLink('mouse', id);
			this.toggleAddLinkMode();
		} else {
			this.selectNode(id);
			if (button && isInputEnabled) {
				self.dispatchEvent('contextMenuRequested', id, event.layerX, event.layerY);
			}
		}
	};
	this.findIdeaById = function (id) {
		/*jslint eqeq:true */
		if (idea.id == id) {
			return idea;
		}
		return idea.findSubIdeaById(id);
	};
	this.getSelectedStyle = function (prop) {
		return this.getStyleForId(currentlySelectedIdeaId, prop);
	};
	this.getStyleForId = function (id, prop) {
		var node = currentLayout.nodes && currentLayout.nodes[id];
		return node && node.attr && node.attr.style && node.attr.style[prop];
	};
	this.toggleCollapse = function (source) {
		var selectedIdea = currentlySelectedIdea(),
			isCollapsed;
		if (self.isActivated(selectedIdea.id) && _.size(selectedIdea.ideas) > 0) {
			isCollapsed = selectedIdea.getAttr('collapsed');
		} else {
			isCollapsed = self.everyActivatedIs(function (id) {
				var node = self.findIdeaById(id);
				if (node && _.size(node.ideas) > 0) {
					return node.getAttr('collapsed');
				}
				return true;
			});
		}
		this.collapse(source, !isCollapsed);
	};
	this.collapse = function (source, doCollapse) {
		analytic('collapse:' + doCollapse, source);
		var contextNodeId = getCurrentlySelectedIdeaId(),
			contextNode = function () {
				return contextNodeId && currentLayout && currentLayout.nodes && currentLayout.nodes[contextNodeId];
			},
			oldContext,
			newContext;
		oldContext = contextNode();
		if (isInputEnabled) {
			self.applyToActivated(function (id) {
				var node = self.findIdeaById(id);
				if (node && (!doCollapse || (node.ideas && _.size(node.ideas) > 0))) {
					idea.updateAttr(id, 'collapsed', doCollapse);
				}
			});
		}
		newContext = contextNode();
		if (oldContext && newContext) {
			moveNodes(
				currentLayout.nodes,
				oldContext.x - newContext.x,
				oldContext.y - newContext.y
			);
		}
		self.dispatchEvent('layoutChangeComplete');
	};
	this.updateStyle = function (source, prop, value) {
		/*jslint eqeq:true */
		if (!isEditingEnabled) {
			return false;
		}
		if (isInputEnabled) {
			analytic('updateStyle:' + prop, source);
			self.applyToActivated(function (id) {
				if (self.getStyleForId(id, prop) != value) {
					idea.mergeAttrProperty(id, 'style', prop, value);
				}
			});
		}
	};
	this.updateLinkStyle = function (source, ideaIdFrom, ideaIdTo, prop, value) {
		if (!isEditingEnabled) {
			return false;
		}
		if (isInputEnabled) {
			analytic('updateLinkStyle:' + prop, source);
			var merged = _.extend({}, idea.getLinkAttr(ideaIdFrom, ideaIdTo, 'style'));
			merged[prop] = value;
			idea.updateLinkAttr(ideaIdFrom, ideaIdTo, 'style', merged);
		}
	};
	this.addSubIdea = function (source, parentId) {
		if (!isEditingEnabled) {
			return false;
		}
		var target = parentId || currentlySelectedIdeaId, newId;
		analytic('addSubIdea', source);
		if (isInputEnabled) {
			idea.batch(function () {
				ensureNodeIsExpanded(source, target);
				newId = idea.addSubIdea(target, getRandomTitle(titlesToRandomlyChooseFrom));
			});
			if (newId) {
				editNewIdea(newId);
			}
		}

	};
	this.insertIntermediate = function (source) {
		if (!isEditingEnabled) {
			return false;
		}
		if (!isInputEnabled || currentlySelectedIdeaId === idea.id) {
			return false;
		}
		var activeNodes = [], newId;
		analytic('insertIntermediate', source);
		self.applyToActivated(function (i) { activeNodes.push(i); });
		newId = idea.insertIntermediateMultiple(activeNodes);
		if (newId) {
			editNewIdea(newId);
		}
	};
	this.addSiblingIdea = function (source) {
		var newId, parent;
		if (!isEditingEnabled) {
			return false;
		}
		analytic('addSiblingIdea', source);
		if (isInputEnabled) {
			parent = idea.findParent(currentlySelectedIdeaId) || idea;
			idea.batch(function () {
				ensureNodeIsExpanded(source, parent.id);
				newId = idea.addSubIdea(parent.id, getRandomTitle(titlesToRandomlyChooseFrom));
			});
			if (newId) {
				editNewIdea(newId);
			}
		}
	};
	this.removeSubIdea = function (source) {
		if (!isEditingEnabled) {
			return false;
		}
		analytic('removeSubIdea', source);
		if (isInputEnabled) {
			var shouldSelectParent,
				previousSelectionId = getCurrentlySelectedIdeaId(),
				parent = idea.findParent(previousSelectionId);
			self.applyToActivated(function (id) {
				var removed  = idea.removeSubIdea(id);
				/*jslint eqeq: true*/
				if (previousSelectionId == id) {
					shouldSelectParent = removed;
				}
			});
			if (shouldSelectParent) {
				self.selectNode(parent.id);
			}
		}
	};
	this.updateTitle = function (ideaId, title, isNew) {
		if (isNew) {
			idea.initialiseTitle(ideaId, title);
		} else {
			idea.updateTitle(ideaId, title);
		}
	};
	this.editNode = function (source, shouldSelectAll, editingNew) {
		if (!isEditingEnabled) {
			return false;
		}
		if (source) {
			analytic('editNode', source);
		}
		if (!isInputEnabled) {
			return false;
		}
		var title = currentlySelectedIdea().title;
		if (title === 'Press Space or double-click to edit' || intermediaryTitlesToRandomlyChooseFrom.indexOf(title) !== -1 || titlesToRandomlyChooseFrom.indexOf(title) !== -1) {
			shouldSelectAll = true;
		}
		self.dispatchEvent('nodeEditRequested', currentlySelectedIdeaId, shouldSelectAll, !!editingNew);
	};
	this.editIcon = function (source) {
		if (!isEditingEnabled) {
			return false;
		}
		if (source) {
			analytic('editIcon', source);
		}
		if (!isInputEnabled) {
			return false;
		}
		self.dispatchEvent('nodeIconEditRequested', currentlySelectedIdeaId);
	};
	this.scaleUp = function (source) {
		self.scale(source, 1.25);
	};
	this.scaleDown = function (source) {
		self.scale(source, 0.8);
	};
	this.scale = function (source, scaleMultiplier, zoomPoint) {
		if (isInputEnabled) {
			self.dispatchEvent('mapScaleChanged', scaleMultiplier, zoomPoint);
			analytic(scaleMultiplier < 1 ? 'scaleDown' : 'scaleUp', source);
		}
	};
	this.move = function (source, deltaX, deltaY) {
		if (isInputEnabled) {
			self.dispatchEvent('mapMoveRequested', deltaX, deltaY);
			analytic('move', source);
		}
	};
	this.resetView = function (source) {
		if (isInputEnabled) {
			self.selectNode(idea.id);
			self.dispatchEvent('mapViewResetRequested');
			analytic('resetView', source);
		}

	};
	this.openAttachment = function (source, nodeId) {
		analytic('openAttachment', source);
		nodeId = nodeId || currentlySelectedIdeaId;
		var node = currentLayout.nodes[nodeId],
			attachment = node && node.attr && node.attr.attachment;
		if (node) {
			self.dispatchEvent('attachmentOpened', nodeId, attachment);
		}
	};
	this.setAttachment = function (source, nodeId, attachment) {
		if (!isEditingEnabled) {
			return false;
		}
		analytic('setAttachment', source);
		var hasAttachment = !!(attachment && attachment.content);
		idea.updateAttr(nodeId, 'attachment', hasAttachment && attachment);
	};
	this.addLink = function (source, nodeIdTo) {
		if (!isEditingEnabled) {
			return false;
		}
		analytic('addLink', source);
		idea.addLink(currentlySelectedIdeaId, nodeIdTo);
	};
	this.selectLink = function (source, link, selectionPoint) {
		if (!isEditingEnabled) {
			return false;
		}
		analytic('selectLink', source);
		if (!link) {
			return false;
		}
		self.dispatchEvent('linkSelected', link, selectionPoint, idea.getLinkAttr(link.ideaIdFrom, link.ideaIdTo, 'style'));
	};
	this.removeLink = function (source, nodeIdFrom, nodeIdTo) {
		if (!isEditingEnabled) {
			return false;
		}
		analytic('removeLink', source);
		idea.removeLink(nodeIdFrom, nodeIdTo);
	};

	this.toggleAddLinkMode = function (source) {
		if (!isEditingEnabled) {
			return false;
		}
		if (!isInputEnabled) {
			return false;
		}
		analytic('toggleAddLinkMode', source);
		isAddLinkMode = !isAddLinkMode;
		self.dispatchEvent('addLinkModeToggled', isAddLinkMode);
	};
	this.cancelCurrentAction = function (source) {
		if (!isInputEnabled) {
			return false;
		}
		if (!isEditingEnabled) {
			return false;
		}
		if (isAddLinkMode) {
			this.toggleAddLinkMode(source);
		}
	};
	self.undo = function (source) {
		if (!isEditingEnabled) {
			return false;
		}

		analytic('undo', source);
		var undoSelectionClone = revertSelectionForUndo,
			undoActivationClone = revertActivatedForUndo;
		if (isInputEnabled) {
			idea.undo();
			if (undoSelectionClone) {
				self.selectNode(undoSelectionClone);
			}
			if (undoActivationClone) {
				setActiveNodes(undoActivationClone);
			}

		}
	};
	self.redo = function (source) {
		if (!isEditingEnabled) {
			return false;
		}

		analytic('redo', source);
		if (isInputEnabled) {
			idea.redo();
		}
	};
	self.moveRelative = function (source, relativeMovement) {
		if (!isEditingEnabled) {
			return false;
		}
		analytic('moveRelative', source);
		if (isInputEnabled) {
			idea.moveRelative(currentlySelectedIdeaId, relativeMovement);
		}
	};
	self.cut = function (source) {
		if (!isEditingEnabled) {
			return false;
		}
		analytic('cut', source);
		if (isInputEnabled) {
			var activeNodeIds = [], parents = [], firstLiveParent;
			self.applyToActivated(function (nodeId) {
				activeNodeIds.push(nodeId);
				parents.push(idea.findParent(nodeId).id);
			});
			self.clipBoard = idea.cloneMultiple(activeNodeIds);
			idea.removeMultiple(activeNodeIds);
			firstLiveParent = _.find(parents, idea.findSubIdeaById);
			self.selectNode(firstLiveParent || idea.id);
		}
	};
	self.copy = function (source) {
		var activeNodeIds = [];
		if (!isEditingEnabled) {
			return false;
		}
		analytic('copy', source);
		if (isInputEnabled) {
			self.applyToActivated(function (node) {
				activeNodeIds.push(node);
			});
			self.clipBoard = idea.cloneMultiple(activeNodeIds);
		}
	};
	self.paste = function (source) {
		if (!isEditingEnabled) {
			return false;
		}
		analytic('paste', source);
		if (isInputEnabled) {
			var result = idea.pasteMultiple(currentlySelectedIdeaId, self.clipBoard);
			if (result && result[0]) {
				self.selectNode(result[0]);
			}
		}
	};
	self.pasteStyle = function (source) {
		if (!isEditingEnabled) {
			return false;
		}
		analytic('pasteStyle', source);
		if (isInputEnabled && self.clipBoard && self.clipBoard[0]) {
			var pastingStyle = self.clipBoard[0].attr && self.clipBoard[0].attr.style;
			self.applyToActivated(function (id) {
				idea.updateAttr(id, 'style', pastingStyle);
			});
		}
	};
	self.getIcon = function (nodeId) {
		var node = currentLayout.nodes[nodeId || currentlySelectedIdeaId];
		if (!node) {
			return false;
		}
		return node.attr && node.attr.icon;
	};
	self.setIcon = function (source, url, imgWidth, imgHeight, position, nodeId) {
		if (!isEditingEnabled) {
			return false;
		}
		analytic('setIcon', source);
		nodeId = nodeId || currentlySelectedIdeaId;
		var nodeIdea = self.findIdeaById(nodeId);
		if (!nodeIdea) {
			return false;
		}
		if (url) {
			idea.updateAttr(nodeId, 'icon', {
				url: url,
				width: imgWidth,
				height: imgHeight,
				position: position
			});
		} else if (nodeIdea.title || nodeId === idea.id) {
			idea.updateAttr(nodeId, 'icon', false);
		} else {
			idea.removeSubIdea(nodeId);
		}
	};
	self.moveUp = function (source) { self.moveRelative(source, -1); };
	self.moveDown = function (source) { self.moveRelative(source, 1); };
	self.getSelectedNodeId = function () {
		return getCurrentlySelectedIdeaId();
	};
	//node activation and selection
	(function () {
			var isRootOrRightHalf = function (id) {
				return currentLayout.nodes[id].x >= currentLayout.nodes[idea.id].x;
			},
			isRootOrLeftHalf = function (id) {
				return currentLayout.nodes[id].x <= currentLayout.nodes[idea.id].x;
			},
			nodesWithIDs = function () {
				return _.map(currentLayout.nodes,
					function (n, nodeId) {
						return _.extend({ id: parseInt(nodeId, 10)}, n);
					});
			},
			applyToNodeLeft = function (source, analyticTag, method) {
				var node,
					rank,
					isRoot = currentlySelectedIdeaId === idea.id,
					targetRank = isRoot ? -Infinity : Infinity;
				if (!isInputEnabled) {
					return;
				}
				analytic(analyticTag, source);
				if (isRootOrLeftHalf(currentlySelectedIdeaId)) {
					node = idea.id === currentlySelectedIdeaId ? idea : idea.findSubIdeaById(currentlySelectedIdeaId);
					ensureNodeIsExpanded(source, node.id);
					for (rank in node.ideas) {
						rank = parseFloat(rank);
						if ((isRoot && rank < 0 && rank > targetRank) || (!isRoot && rank > 0 && rank < targetRank)) {
							targetRank = rank;
						}
					}
					if (targetRank !== Infinity && targetRank !== -Infinity) {
						method.apply(self, [node.ideas[targetRank].id]);
					}
				} else {
					method.apply(self, [idea.findParent(currentlySelectedIdeaId).id]);
				}
			},
			applyToNodeRight = function (source, analyticTag, method) {
				var node, rank, minimumPositiveRank = Infinity;
				if (!isInputEnabled) {
					return;
				}
				analytic(analyticTag, source);
				if (isRootOrRightHalf(currentlySelectedIdeaId)) {
					node = idea.id === currentlySelectedIdeaId ? idea : idea.findSubIdeaById(currentlySelectedIdeaId);
					ensureNodeIsExpanded(source, node.id);
					for (rank in node.ideas) {
						rank = parseFloat(rank);
						if (rank > 0 && rank < minimumPositiveRank) {
							minimumPositiveRank = rank;
						}
					}
					if (minimumPositiveRank !== Infinity) {
						method.apply(self, [node.ideas[minimumPositiveRank].id]);
					}
				} else {
					method.apply(self, [idea.findParent(currentlySelectedIdeaId).id]);
				}
			},
			applyToNodeUp = function (source, analyticTag, method) {
				var previousSibling = idea.previousSiblingId(currentlySelectedIdeaId),
					nodesAbove,
					closestNode,
					currentNode = currentLayout.nodes[currentlySelectedIdeaId];
				if (!isInputEnabled) {
					return;
				}
				analytic(analyticTag, source);
				if (previousSibling) {
					method.apply(self, [previousSibling]);
				} else {
					if (!currentNode) { return; }
					nodesAbove = _.reject(nodesWithIDs(), function (node) {
						return node.y >= currentNode.y || Math.abs(node.x - currentNode.x) > horizontalSelectionThreshold;
					});
					if (_.size(nodesAbove) === 0) {
						return;
					}
					closestNode = _.min(nodesAbove, function (node) {
						return Math.pow(node.x - currentNode.x, 2) + Math.pow(node.y - currentNode.y, 2);
					});
					method.apply(self, [closestNode.id]);
				}
			},
			applyToNodeDown = function (source, analyticTag, method) {
				var nextSibling = idea.nextSiblingId(currentlySelectedIdeaId),
					nodesBelow,
					closestNode,
					currentNode = currentLayout.nodes[currentlySelectedIdeaId];
				if (!isInputEnabled) {
					return;
				}
				analytic(analyticTag, source);
				if (nextSibling) {
					method.apply(self, [nextSibling]);
				} else {
					if (!currentNode) { return; }
					nodesBelow = _.reject(nodesWithIDs(), function (node) {
						return node.y <= currentNode.y || Math.abs(node.x - currentNode.x) > horizontalSelectionThreshold;
					});
					if (_.size(nodesBelow) === 0) {
						return;
					}
					closestNode = _.min(nodesBelow, function (node) {
						return Math.pow(node.x - currentNode.x, 2) + Math.pow(node.y - currentNode.y, 2);
					});
					method.apply(self, [closestNode.id]);
				}
			},
			applyFuncs = { 'Left': applyToNodeLeft, 'Up': applyToNodeUp, 'Down': applyToNodeDown, 'Right': applyToNodeRight };
			self.getActivatedNodeIds = function () {
				return activatedNodes.slice(0);
			};
			self.activateSiblingNodes = function (source) {
				var parent = idea.findParent(currentlySelectedIdeaId),
					siblingIds;
				analytic('activateSiblingNodes', source);
				if (!parent || !parent.ideas) {
					return;
				}
				siblingIds = _.map(parent.ideas, function (child) { return child.id; });
				setActiveNodes(siblingIds);
			};
			self.activateNodeAndChildren = function (source) {
				analytic('activateNodeAndChildren', source);
				var contextId = getCurrentlySelectedIdeaId(),
					subtree = idea.getSubTreeIds(contextId);
				subtree.push(contextId);
				setActiveNodes(subtree);
			};
			_.each(['Left', 'Right', 'Up', 'Down'], function (position) {
				self['activateNode' + position] = function (source) {
					applyFuncs[position](source, 'activateNode' + position, function (nodeId) {
						self.activateNode(source, nodeId);
						currentlySelectedIdeaId = nodeId;
					});
				};
				self['selectNode' + position] = function (source) {
					applyFuncs[position](source, 'selectNode' + position, self.selectNode);
				};
			});
			self.toggleActivationOnNode = function (source, nodeId) {
				analytic('toggleActivated', source);
				if (!self.isActivated(nodeId)) {
					setActiveNodes([nodeId].concat(activatedNodes));
				} else {
					setActiveNodes(_.without(activatedNodes, nodeId));
				}
			};
			self.activateNode = function (source, nodeId) {
				analytic('activateNode', source);
				if (!self.isActivated(nodeId)) {
					activatedNodes.push(nodeId);
					self.dispatchEvent('activatedNodesChanged', [nodeId], []);
				}
			};
			self.activateChildren = function (source) {
				analytic('activateChildren', source);
				var context = currentlySelectedIdea();
				if (!context || _.isEmpty(context.ideas) || context.getAttr('collapsed')) {
					return;
				}
				setActiveNodes(idea.getSubTreeIds(context.id));
			};
			self.activateSelectedNode = function (source) {
				analytic('activateSelectedNode', source);
				setActiveNodes([getCurrentlySelectedIdeaId()]);
			};
			self.isActivated = function (id) {
				/*jslint eqeq:true*/
				return _.find(activatedNodes, function (activeId) { return id == activeId; });
			};
			self.applyToActivated = function (toApply) {
				idea.batch(function () {_.each(activatedNodes, toApply); });
			};
			self.everyActivatedIs = function (predicate) {
				return _.every(activatedNodes, predicate);
			};
			self.activateLevel = function (source, level) {
				analytic('activateLevel', source);
				var toActivate = _.map(
					_.filter(
						currentLayout.nodes,
						function (node) {
							/*jslint eqeq:true*/
							return node.level == level;
						}
					),
					function (node) {return node.id; }
				);
				if (!_.isEmpty(toActivate)) {
					setActiveNodes(toActivate);
				}
			};
			self.reactivate = function (layout) {
				_.each(layout.nodes, function (node) {
					if (_.contains(activatedNodes, node.id)) {
						node.activated = true;
					}
				});
				return layout;
			};
			self.addEventListener('nodeSelectionChanged', function (id, isSelected) {
				if (!isSelected) {
					setActiveNodes([]);
					return;
				}
				setActiveNodes([id]);
			}, 1);
			self.addEventListener('nodeRemoved', function (node, id) {
				var selectedId = getCurrentlySelectedIdeaId();
				if (self.isActivated(id) && !self.isActivated(selectedId)) {
					setActiveNodes(activatedNodes.concat([selectedId]));
				}
			});
		}());
};
/*global _, MAPJS, jQuery*/
/*jslint forin:true*/
MAPJS.dragdrop = function (mapModel, stage, imageInsertController) {
	'use strict';
	var currentDroppable,
		findNodeOnStage = function (nodeId) {
			return stage.get('#node_' + nodeId)[0];
		},
		showAsDroppable = function (nodeId, isDroppable) {
			var node = findNodeOnStage(nodeId);
			node.setIsDroppable(isDroppable);
		},
		updateCurrentDroppable = function (nodeId) {
			if (currentDroppable !== nodeId) {
				if (currentDroppable) {
					showAsDroppable(currentDroppable, false);
				}
				currentDroppable = nodeId;
				if (currentDroppable) {
					showAsDroppable(currentDroppable, true);
				}
			}
		},
		isPointOverNode = function (x, y, node) { //move to mapModel candidate
			/*jslint eqeq: true*/
			return x >= node.x &&
				y >= node.y &&
				x <= node.x + node.width &&
				y <= node.y + node.height;
		},
		canDropOnNode = function (id, x, y, node) {
			/*jslint eqeq: true*/
			return id != node.id && isPointOverNode(x, y, node);
		},
		tryFlip = function (rootNode, nodeBeingDragged, nodeDragEndX) {

			var flipRightToLeft = rootNode.x < nodeBeingDragged.x && nodeDragEndX < rootNode.x,
				flipLeftToRight = rootNode.x > nodeBeingDragged.x && rootNode.x < nodeDragEndX;
			if (flipRightToLeft || flipLeftToRight) {
				return mapModel.getIdea().flip(nodeBeingDragged.id);
			}
			return false;
		},
		nodeDragMove = function (id, x, y) {
			var nodeId, node;
			if (!mapModel.isEditingEnabled()) {
				return;
			}
			for (nodeId in mapModel.getCurrentLayout().nodes) {
				node = mapModel.getCurrentLayout().nodes[nodeId];
				if (canDropOnNode(id, x, y, node)) {
					updateCurrentDroppable(nodeId);
					return;
				}
			}
			updateCurrentDroppable(undefined);
		},
		getRootNode = function () {
			return mapModel.getCurrentLayout().nodes[mapModel.getIdea().id];
		},
		nodeDragEnd = function (id, x, y, nodeX, nodeY, shouldCopy, shouldPositionAbsolutely) {
			var nodeBeingDragged = mapModel.getCurrentLayout().nodes[id],
				nodeId,
				node,
				rootNode = getRootNode(),
				verticallyClosestNode = {
					id: null,
					y: Infinity
				},
				clone,
				idea = mapModel.getIdea(),
				parentIdea = idea.findParent(id),
				parentNode = mapModel.getCurrentLayout().nodes[parentIdea.id],
				maxSequence = 1,
				validReposition = function () {
					return nodeBeingDragged.level === 2 ||
						((nodeBeingDragged.x - parentNode.x) * (x - parentNode.x) > 0);
				};
			if (!mapModel.isEditingEnabled()) {
				mapModel.dispatchEvent('nodeMoved', nodeBeingDragged, 'failed');
				return;
			}
			updateCurrentDroppable(undefined);
			mapModel.dispatchEvent('nodeMoved', nodeBeingDragged);
			for (nodeId in mapModel.getCurrentLayout().nodes) {
				node = mapModel.getCurrentLayout().nodes[nodeId];
				if (canDropOnNode(id, x, y, node)) {
					if (shouldCopy) {
						clone = mapModel.getIdea().clone(id);
						if (!clone || !mapModel.getIdea().paste(nodeId, clone)) {
							mapModel.dispatchEvent('nodeMoved', nodeBeingDragged, 'failed');
							mapModel.analytic('nodeDragCloneFailed');
						}
					} else if (!mapModel.getIdea().changeParent(id, nodeId)) {
						mapModel.dispatchEvent('nodeMoved', nodeBeingDragged, 'failed');
						mapModel.analytic('nodeDragParentFailed');
						idea.updateAttr(id, 'position');
					}
					return;
				}

			}
			idea.startBatch();
			if (nodeBeingDragged.level === 2) {
				tryFlip(rootNode, nodeBeingDragged, x);
			}
			_.each(idea.sameSideSiblingIds(id), function (nodeId) {
				node = mapModel.getCurrentLayout().nodes[nodeId];
				if (y < node.y && node.y < verticallyClosestNode.y) {
					verticallyClosestNode = node;
				}
			});
			idea.positionBefore(id, verticallyClosestNode.id);
			if (shouldPositionAbsolutely && validReposition()) {
				mapModel.analytic('nodeManuallyPositioned');
				mapModel.selectNode(id);
				maxSequence = _.max(_.map(parentIdea.ideas, function (i) { return (i.id !== id && i.attr && i.attr.position && i.attr.position[2]) || 0; }));
				idea.updateAttr(
					id,
					'position',
					[Math.abs(nodeX - parentNode.x), nodeY - parentNode.y, maxSequence + 1]
				);
			}
			idea.endBatch();
		},
		screenToStageCoordinates = function (x, y) {
			return {
				x: (x - stage.getX()) / (stage.getScale().x || 1),
				y: (y - stage.getY()) / (stage.getScale().y || 1)
			};
		},
		getInteractionPoint = function (evt) {
			if (evt.changedTouches && evt.changedTouches[0]) {
				return screenToStageCoordinates(evt.changedTouches[0].clientX, evt.changedTouches[0].clientY);
			}
			return screenToStageCoordinates(evt.layerX, evt.layerY);
		},
		dropImage =	function (dataUrl, imgWidth, imgHeight, evt) {
			var node,
				nodeId,
				content = mapModel.getIdea(),
				point = getInteractionPoint(evt),
				dropOn = function (ideaId, position) {
					var scaleX = Math.min(imgWidth, 300) / imgWidth,
						scaleY = Math.min(imgHeight, 300) / imgHeight,
						scale = Math.min(scaleX, scaleY);
					mapModel.setIcon('drag and drop', dataUrl, Math.round(imgWidth * scale), Math.round(imgHeight * scale), position, ideaId);
				},
				addNew = function () {
					content.startBatch();
					dropOn(content.addSubIdea(mapModel.getSelectedNodeId()), 'center');
					content.endBatch();
				};
			for (nodeId in mapModel.getCurrentLayout().nodes) {
				node = mapModel.getCurrentLayout().nodes[nodeId];
				if (isPointOverNode(point.x, point.y, node)) {
					return dropOn(nodeId, 'left');
				}
			}
			addNew();
		};
	jQuery(stage.getContainer()).imageDropWidget(imageInsertController);
	imageInsertController.addEventListener('imageInserted', dropImage);
	mapModel.addEventListener('nodeCreated', function (n) {
		var node = findNodeOnStage(n.id), shouldPositionAbsolutely;
		node.on('dragstart', function (evt) {
			shouldPositionAbsolutely = evt.shiftKey;
			node.moveToTop();
			node.setShadowOffset(8);
			node.setOpacity(0.3);
		});
		node.on('dragmove', function (evt) {
			var stagePoint = getInteractionPoint(evt);
			nodeDragMove(
				n.id,
				stagePoint.x,
				stagePoint.y
			);
		});
		node.on('dragend', function (evt) {
			var stagePoint = getInteractionPoint(evt);
			node.setShadowOffset(4);
			node.setOpacity(1);
			nodeDragEnd(
				n.id,
				stagePoint.x,
				stagePoint.y,
				node.getX(),
				node.getY(),
				evt.shiftKey,
				shouldPositionAbsolutely
			);
		});
	});
};
/*global _, Kinetic, MAPJS*/
/*jslint nomen: true*/
(function () {
	'use strict';
	var horizontalConnector, calculateConnector, calculateConnectorInner;
	Kinetic.Connector = function (config) {
		this.shapeFrom = config.shapeFrom;
		this.shapeTo = config.shapeTo;
		this.shapeType = 'Connector';
		Kinetic.Shape.call(this, config);
		this._setDrawFuncs();
	};
	horizontalConnector = function (parentX, parentY, parentWidth, parentHeight,
			childX, childY, childWidth, childHeight) {
		var childHorizontalOffset = parentX < childX ? 0.1 : 0.9,
			parentHorizontalOffset = 1 - childHorizontalOffset;
		return {
			from: {
				x: parentX + parentHorizontalOffset * parentWidth,
				y: parentY + 0.5 * parentHeight
			},
			to: {
				x: childX + childHorizontalOffset * childWidth,
				y: childY + 0.5 * childHeight
			},
			controlPointOffset: 0
		};
	};
	calculateConnector = function (parent, child) {
		return calculateConnectorInner(parent.getX(), parent.getY(), parent.getWidth(), parent.getHeight(),
			child.getX(), child.getY(), child.getWidth(), child.getHeight());
	};
	calculateConnectorInner = _.memoize(function (parentX, parentY, parentWidth, parentHeight,
			childX, childY, childWidth, childHeight) {
		var tolerance = 10,
			childMid = childY + childHeight * 0.5,
			parentMid = parentY + parentHeight * 0.5,
			childHorizontalOffset;
		if (Math.abs(parentMid - childMid) + tolerance < Math.max(childHeight, parentHeight * 0.75)) {
			return horizontalConnector(parentX, parentY, parentWidth, parentHeight, childX, childY, childWidth, childHeight);
		}
		childHorizontalOffset = parentX < childX ? 0 : 1;
		return {
			from: {
				x: parentX + 0.5 * parentWidth,
				y: parentY + 0.5 * parentHeight
			},
			to: {
				x: childX + childHorizontalOffset * childWidth,
				y: childY + 0.5 * childHeight
			},
			controlPointOffset: 0.75
		};
	}, function () {
		return Array.prototype.join.call(arguments, ',');
	});
	Kinetic.Connector.prototype = {
		isVisible: function (offset) {
			var stage = this.getStage(),
				conn = calculateConnector(this.shapeFrom, this.shapeTo),
				x = Math.min(conn.from.x, conn.to.x),
				y = Math.min(conn.from.y, conn.to.y),
				rect = new MAPJS.Rectangle(x, y, Math.max(conn.from.x, conn.to.x) - x, Math.max(conn.from.y, conn.to.y) - y);
			return stage && stage.isRectVisible(rect, offset);
		},
		drawFunc: function (canvas) {
			var context = canvas.getContext(),
				shapeFrom = this.shapeFrom,
				shapeTo = this.shapeTo,
				conn,
				offset,
				maxOffset;
			if (!this.isVisible()) {
				return;
			}
			conn = calculateConnector(shapeFrom, shapeTo);
			if (!conn) {
				return;
			}
			context.beginPath();
			context.moveTo(conn.from.x, conn.from.y);
			offset = conn.controlPointOffset * (conn.from.y - conn.to.y);
			maxOffset = Math.min(shapeTo.getHeight(), shapeFrom.getHeight()) * 1.5;
			offset = Math.max(-maxOffset, Math.min(maxOffset, offset));
			context.quadraticCurveTo(conn.from.x, conn.to.y - offset, conn.to.x, conn.to.y);
			canvas.stroke(this);
		}
	};
	Kinetic.Util.extend(Kinetic.Connector, Kinetic.Shape);
}());
/*global _, Kinetic*/
/*jslint nomen: true*/
(function () {
	'use strict';
	Kinetic.Link = function (config) {
		this.shapeFrom = config.shapeFrom;
		this.shapeTo = config.shapeTo;
		this.shapeType = 'Link';
		Kinetic.Shape.call(this, config);
		this._setDrawFuncs();
	};
	var calculateConnectorInner = _.memoize(
		function (parentX, parentY, parentWidth, parentHeight, childX, childY, childWidth, childHeight) {
			var parent = [
				{
					x: parentX + 0.5 * parentWidth,
					y: parentY
				},
				{
					x: parentX + parentWidth,
					y: parentY + 0.5 * parentHeight
				},
				{
					x: parentX + 0.5 * parentWidth,
					y: parentY + parentHeight
				},
				{
					x: parentX,
					y: parentY + 0.5 * parentHeight
				}
			], child = [
				{
					x: childX + 0.5 * childWidth,
					y: childY
				},
				{
					x: childX + childWidth,
					y: childY + 0.5 * childHeight
				},
				{
					x: childX + 0.5 * childWidth,
					y: childY + childHeight
				},
				{
					x: childX,
					y: childY + 0.5 * childHeight
				}
			], i, j, min = Infinity, bestParent, bestChild, dx, dy, current;
			for (i = 0; i < parent.length; i += 1) {
				for (j = 0; j < child.length; j += 1) {
					dx = parent[i].x - child[j].x;
					dy = parent[i].y - child[j].y;
					current = dx * dx + dy * dy;
					if (current < min) {
						bestParent = i;
						bestChild = j;
						min = current;
					}
				}
			}
			return {
				from: parent[bestParent],
				to: child[bestChild]
			};
		},
		function () {
			return Array.prototype.join.call(arguments, ',');
		}
	),
		calculateConnector = function (parent, child) {
			return calculateConnectorInner(parent.getX(), parent.getY(), parent.getWidth(), parent.getHeight(),
				child.getX(), child.getY(), child.getWidth(), child.getHeight());
		};
	Kinetic.Link.prototype = {
		drawHitFunc: function (canvas) {
			var context = canvas.getContext(),
				shapeFrom = this.shapeFrom,
				shapeTo = this.shapeTo,
				conn,
				strokeWidth = this.getStrokeWidth();
			this.setStrokeWidth(strokeWidth * 9);
			conn = calculateConnector(shapeFrom, shapeTo);
			context.fillStyle = this.getStroke();
			context.beginPath();
			context.moveTo(conn.from.x, conn.from.y);
			context.lineTo(conn.to.x, conn.to.y);
			canvas.stroke(this);
			this.setStrokeWidth(strokeWidth);
		},
		drawFunc: function (canvas) {
			var context = canvas.getContext(),
				shapeFrom = this.shapeFrom,
				shapeTo = this.shapeTo,
				conn,
				n = Math.tan(Math.PI / 9);
			conn = calculateConnector(shapeFrom, shapeTo);
			context.fillStyle = this.getStroke();
			context.beginPath();
			context.moveTo(conn.from.x, conn.from.y);
			context.lineTo(conn.to.x, conn.to.y);
			canvas.stroke(this);
			if (this.attrs.arrow) {
				var a1x, a1y, a2x, a2y, len = 14, iy, m,
					dx = conn.to.x - conn.from.x,
					dy = conn.to.y - conn.from.y;
				if (dx === 0) {
					iy = dy < 0 ? -1 : 1;
					a1x = conn.to.x + len * Math.sin(n) * iy;
					a2x = conn.to.x - len * Math.sin(n) * iy;
					a1y = conn.to.y - len * Math.cos(n) * iy;
					a2y = conn.to.y - len * Math.cos(n) * iy;
				} else {
					m = dy / dx;
					if (conn.from.x < conn.to.x) {
						len = -len;
					}
					a1x = conn.to.x + (1 - m * n) * len / Math.sqrt((1 + m * m) * (1 + n * n));
					a1y = conn.to.y + (m + n) * len / Math.sqrt((1 + m * m) * (1 + n * n));
					a2x = conn.to.x + (1 + m * n) * len / Math.sqrt((1 + m * m) * (1 + n * n));
					a2y = conn.to.y + (m - n) * len / Math.sqrt((1 + m * m) * (1 + n * n));
				}
				context.moveTo(a1x, a1y);
				context.lineTo(conn.to.x, conn.to.y);
				context.lineTo(a2x, a2y);
				context.lineTo(a1x, a1y);
				context.fill();
			}
		}
	};
	Kinetic.Util.extend(Kinetic.Link, Kinetic.Shape);
}());
Kinetic.Link.prototype.setMMAttr = function (newMMAttr) {
	'use strict';
	var style = newMMAttr && newMMAttr.style,
		dashTypes = {
			solid: [],
			dashed: [8, 8]
		};
	this.setStroke(style && style.color || 'red');
	this.setDashArray(dashTypes[style && style.lineStyle || 'dashed']);
	this.attrs.arrow = style && style.arrow || false;
};
/*global Kinetic*/
Kinetic.Clip = function (config) {
	'use strict';
	this.createAttrs();
	Kinetic.Shape.call(this, config);
	this.shapeType = 'Clip';
	this._setDrawFuncs();
};
Kinetic.Clip.prototype.drawFunc = function (canvas) {
	'use strict';
	var context = canvas.getContext(),
		xClip = this.getWidth() * 2 - this.getRadius() * 2;
	context.beginPath();
	context.moveTo(0, this.getClipTo());
	context.arcTo(0, 0, this.getWidth() * 2, 0,  this.getWidth());
	context.arcTo(this.getWidth() * 2, 0, this.getWidth() * 2, this.getHeight(),  this.getWidth());
	context.arcTo(this.getWidth() * 2, this.getHeight(), 0, this.getHeight(), this.getRadius());
	context.arcTo(xClip, this.getHeight(), xClip, 0, this.getRadius());
	context.lineTo(xClip, this.getClipTo() * 0.5);
	canvas.fillStroke(this);
};
Kinetic.Node.addGetterSetter(Kinetic.Clip, 'clipTo', 0);
Kinetic.Node.addGetterSetter(Kinetic.Clip, 'radius', 0);
Kinetic.Util.extend(Kinetic.Clip, Kinetic.Shape);
/*global MAPJS, Color, _, jQuery, Kinetic*/
/*jslint nomen: true, newcap: true, browser: true*/
(function () {
	'use strict';
	/*shamelessly copied from http://james.padolsey.com/javascript/wordwrap-for-javascript */
	var COLUMN_WORD_WRAP_LIMIT = 25;
	function wordWrap(str, width, brk, cut) {
		brk = brk || '\n';
		width = width || 75;
		cut = cut || false;
		if (!str) {
			return str;
		}
		var regex = '.{1,' + width + '}(\\s|$)' + (cut ? '|.{' + width + '}|.+$' : '|\\S+?(\\s|$)');
		return str.match(new RegExp(regex, 'g')).join(brk);
	}
	function breakWords(string) {
		var lines = string.split('\n'),
			formattedLines = _.map(lines, function (line) {
				return wordWrap(line, COLUMN_WORD_WRAP_LIMIT, '\n', false);
			});
		return formattedLines.join('\n');
	}
	function createLink() {
		var link = new Kinetic.Group(),
			rectProps = {
				width: 10,
				height: 20,
				rotation: 0.6,
				stroke: '#555555',
				strokeWidth: 3,
				cornerRadius: 6,
				shadowOffset: [2, 2],
				shadow: '#CCCCCC',
				shadowBlur: 0.4,
				shadowOpacity: 0.4
			},
			rect = new Kinetic.Rect(rectProps),
			rect2 = new Kinetic.Rect(rectProps);
		rect2.setX(7);
		rect2.setY(-7);
		link.add(rect);
		link.add(rect2);
		link.setActive = function (isActive) {
			rect2.setStroke(isActive ? 'black' : '#555555');
			rect.setStroke(rect2.getStroke());
			link.getLayer().draw();
		};
		return link;
	}

	function createClip() {
		var group, clip, props = {width: 5, height: 25, radius: 3, rotation: 0.1, strokeWidth: 2, clipTo: 10};
		group = new Kinetic.Group();
		group.getClipMargin = function () {
			return props.clipTo;
		};
		group.add(new Kinetic.Clip(_.extend({stroke: 'darkslategrey', x: 1, y: 1}, props)));
		clip = new Kinetic.Clip(_.extend({stroke: 'skyblue', x: 0, y: 0}, props));
		group.add(clip);
		group.on('mouseover', function () {
			clip.setStroke('black');
			group.getLayer().draw();
		});
		group.on('mouseout', function () {
			clip.setStroke('skyblue');
			group.getLayer().draw();
		});
		return group;
	}
	function createIcon() {
		var	icon = new Kinetic.Image({
			x: 0,
			y: 0,
			width: 0,
			height: 0
		});
		icon.oldDrawScene = icon.drawScene;
		icon.updateMapjsAttribs = function (iconHash) {
			var safeIconProp = function (name) {
					return iconHash && iconHash[name];
				},
				imgUrl = safeIconProp('url'),
				imgWidth = safeIconProp('width'),
				imgHeight = safeIconProp('height');
			if (this.getAttr('image') && this.getAttr('image').src !== imgUrl) {
				this.getAttr('image').src = imgUrl || '';
			}
			this.setAttr('mapjs-image-url', imgUrl);
			if (this.getAttr('width') !== imgWidth) {
				this.setAttr('width', imgWidth);
			}
			if (this.getAttr('height') !== imgHeight) {
				this.setAttr('height', imgHeight);
			}
			this.setVisible(imgUrl);
		};
		icon.initMapjsImage = function () {
			var self = this,
				imageSrc = this.getAttr('mapjs-image-url');
			if (!imageSrc) {
				return;
			}
			if (!this.getAttr('image')) {
				this.setAttr('image', new Image());
				this.getAttr('image').onload = function loadImage() {
					self.getLayer().draw();
				};
				this.getAttr('image').src = imageSrc;
			}
		};
		icon.drawScene = function () {
			if (!this.getAttr('image')) {
				this.initMapjsImage();
			}
			if (this.getAttr('mapjs-image-url')) {
				this.oldDrawScene.apply(this, arguments);
			}
		};
		return icon;
	}

	Kinetic.Idea = function (config) {
		var ENTER_KEY_CODE = 13,
			ESC_KEY_CODE = 27,
			self = this,
			unformattedText = config.text,
			bgRect = function (offset) {
				return new Kinetic.Rect({
					strokeWidth: 1,
					cornerRadius: 10,
					x: offset,
					y: offset,
					visible: false
				});
			};
		this.level = config.level;
		this.mmAttr = config.mmAttr;
		this.isSelected = false;
		this.isActivated = !!config.activated;
		config.draggable = config.level > 1;
		config.name = 'Idea';
		Kinetic.Group.call(this, config);
		this.rectAttrs = {stroke: '#888', strokeWidth: 1};
		this.rect = new Kinetic.Rect({
			strokeWidth: 1,
			cornerRadius: 10
		});
		this.rectbg1 = bgRect(8);
		this.rectbg2 = bgRect(4);
		this.link = createLink();
		this.link.on('click tap', function () {
			var url = MAPJS.URLHelper.getLink(unformattedText);
			if (url) {
				window.open(url, '_blank');
			}
		});
		this.link.on('mouseover', function () {
			self.link.setActive(true);
		});
		this.link.on('mouseout', function () {
			self.link.setActive(false);
		});
		this.text = new Kinetic.Text({
			fontSize: 12,
			fontFamily: 'Helvetica',
			lineHeight: 1.5,
			fontStyle: 'bold',
			align: 'center'
		});
		this.clip = createClip();
		this.clip.on('click tap', function () {
			self.fire(':request', {type: 'openAttachment', source: 'mouse'});
		});
		this.icon = createIcon();
		this.add(this.rectbg1);
		this.add(this.rectbg2);
		this.add(this.rect);
		this.add(this.icon);
		this.add(this.text);
		this.add(this.link);
		this.add(this.clip);
		this.setText = function (text) {
			var replacement = breakWords(MAPJS.URLHelper.stripLink(text)) ||
					(text.length < COLUMN_WORD_WRAP_LIMIT ? text : (text.substring(0, COLUMN_WORD_WRAP_LIMIT) + '...'));
			unformattedText = text;
			self.text.setText(replacement);
			self.link.setVisible(MAPJS.URLHelper.containsLink(text));
			self.setStyle();
		};
		this.setText(config.text);
		this.classType = 'Idea';
		this.getNodeAttrs = function () {
			return self.attrs;
		};
		this.isVisible = function (offset) {
			var stage = self.getStage();
			return stage && stage.isRectVisible(new MAPJS.Rectangle(self.getX(), self.getY(), self.getWidth(), self.getHeight()), offset);
		};
		this.editNode = function (shouldSelectAll, deleteOnCancel) {
			self.fire(':editing');
			var canvasPosition = jQuery(self.getLayer().getCanvas().getElement()).offset(),
				ideaInput,
				onStageMoved = _.throttle(function () {
					ideaInput.css({
						top: canvasPosition.top + self.getAbsolutePosition().y,
						left: canvasPosition.left + self.getAbsolutePosition().x
					});
				}, 10),
				updateText = function (newText) {
					self.setStyle();
					self.getStage().draw();
					self.fire(':textChanged', {
						text: newText || unformattedText,
						isNew: deleteOnCancel
					});
					ideaInput.remove();
					self.stopEditing = undefined;
					self.getStage().off('xChange yChange', onStageMoved);
				},
				onCommit = function () {
					if (ideaInput.val() === '') {
						onCancelEdit();
					} else {
						updateText(ideaInput.val());
					}
				},
				onCancelEdit = function () {
					updateText(unformattedText);
					if (deleteOnCancel) {
						self.fire(':request', {type: 'undo', source: 'internal'});
					}
				},
				scale = self.getStage().getScale().x || 1;
			ideaInput = jQuery('<textarea type="text" wrap="soft" class="ideaInput"></textarea>')
				.css({
					top: canvasPosition.top + self.getAbsolutePosition().y,
					left: canvasPosition.left + self.getAbsolutePosition().x,
					width: (6 + self.getWidth()) * scale,
					height: (6 + self.getHeight()) * scale,
					'padding': 3 * scale + 'px',
					'font-size': self.text.getFontSize() * scale + 'px',
					'line-height': '150%',
					'background-color': self.getBackground(),
					'margin': -3 * scale,
					'border-radius': self.rect.getCornerRadius() * scale + 'px',
					'border': self.rectAttrs.strokeWidth * (2 * scale) + 'px dashed ' + self.rectAttrs.stroke,
					'color': self.text.getFill(),
					'overflow': 'hidden'
				})
				.val(unformattedText)
				.appendTo('body')
				.keydown(function (e) {
					if (e.shiftKey && e.which === ENTER_KEY_CODE) {
						return; // allow shift+enter to break lines
					}
					else if (e.which === ENTER_KEY_CODE) {
						onCommit();
					} else if (e.which === ESC_KEY_CODE) {
						onCancelEdit();
					} else if (e.which === 9) {
						onCommit();
						e.preventDefault();
						self.fire(':request', {type: 'addSubIdea', source: 'keyboard'});
						return;
					} else if (e.which === 83 && (e.metaKey || e.ctrlKey)) {
						e.preventDefault();
						onCommit();
						return; /* propagate to let the environment handle ctrl+s */
					} else if (!e.shiftKey && e.which === 90 && (e.metaKey || e.ctrlKey)) {
						if (ideaInput.val() === unformattedText) {
							onCancelEdit();
						}
					}
					e.stopPropagation();
				})
				.blur(onCommit)
				.focus(function () {
					if (shouldSelectAll) {
						if (ideaInput[0].setSelectionRange) {
							ideaInput[0].setSelectionRange(0, unformattedText.length);
						} else {
							ideaInput.select();
						}
					} else if (ideaInput[0].setSelectionRange) {
						ideaInput[0].setSelectionRange(unformattedText.length, unformattedText.length);
					}
				})
				.on('input', function () {
					var text = new Kinetic.Idea({
						text: ideaInput.val()
					});
					ideaInput.width(Math.max(ideaInput.width(), text.getWidth() * scale));
					ideaInput.height(Math.max(ideaInput.height(), text.getHeight() * scale));
				});
			self.stopEditing = onCancelEdit;
			ideaInput.focus();
			self.getStage().on('xChange yChange', onStageMoved);
		};
	};
}());

Kinetic.Idea.prototype.setShadowOffset = function (offset) {
	'use strict';
	offset = this.getMMScale().x * offset;
	_.each([this.rect, this.rectbg1, this.rectbg2], function (r) {
		r.setShadowOffset([offset, offset]);
	});
};

Kinetic.Idea.prototype.getMMScale = function () {
	'use strict';
	var stage = this.getStage(),
		scale = (stage && stage.getScaleX()) || this.getScaleX() || 1;
	return {x: scale, y: scale};
};


Kinetic.Idea.prototype.setupShadows = function () {
	'use strict';
	var scale = this.getMMScale().x,
		isSelected = this.isSelected,
		offset = this.isCollapsed() ? 3 * scale : 4 * scale,
		normalShadow = {
			color: 'black',
			blur: 10 * scale,
			offset: [offset, offset],
			opacity: 0.4 * scale
		},
		selectedShadow = {
			color: 'black',
			blur: 0,
			offset: [offset, offset],
			opacity: 1
		},
		shadow = isSelected ? selectedShadow : normalShadow;

	if (this.oldShadow && this.oldShadow.selected === isSelected && this.oldShadow.scale === scale && this.oldShadow.offset === offset) {
		return;
	}
	this.oldShadow = {selected: isSelected, scale: scale, offset: offset};
	_.each([this.rect, this.rectbg1, this.rectbg2], function (r) {
		r.setShadowColor(shadow.color);
		r.setShadowBlur(shadow.blur);
		r.setShadowOpacity(shadow.opacity);
		r.setShadowOffset(shadow.offset);
	});
};

Kinetic.Idea.prototype.getBackground = function () {
	'use strict';
	/*jslint newcap: true*/
	var isRoot = this.level === 1,
		defaultBg = MAPJS.defaultStyles[isRoot ? 'root' : 'nonRoot'].background,
		validColor = function (color, defaultColor) {
			if (!color) {
				return defaultColor;
			}
			var parsed = Color(color).hexString();
			return color.toUpperCase() === parsed.toUpperCase() ? color : defaultColor;
		};
	return validColor(this.mmAttr && this.mmAttr.style && this.mmAttr.style.background, defaultBg);
};


Kinetic.Idea.prototype.setStyle = function () {
	'use strict';
	/*jslint newcap: true*/
	var self = this,
		isDroppable = this.isDroppable,
		isSelected = this.isSelected,
		isActivated = this.isActivated,
		background = this.getBackground(),
		tintedBackground = Color(background).mix(Color('#EEEEEE')).hexString(),
		rectOffset,
		rectIncrement = 4,
		padding = 8,
		isClipVisible = self.mmAttr && self.mmAttr.attachment,
		clipMargin = isClipVisible ? self.clip.getClipMargin() : 0,
		getDash = function () {
			if (!self.isActivated) {
				return [];
			}
			return [5, 3];
		},
		textSize = {
			width: this.text.getWidth(),
			height: this.text.getHeight()
		},
		calculatedSize,
		pad = function (box) {
			return {
				width: box.width + 2 * padding,
				height: box.height + 2 * padding
			};
		},
		positionTextAndIcon = function () {
			var iconPos = self.mmAttr && self.mmAttr.icon && self.mmAttr.icon.position;
			if (!iconPos || iconPos === 'center') {
				self.text.setX((calculatedSize.width - self.text.getWidth()) / 2);
				self.text.setY((calculatedSize.height - self.text.getHeight()) / 2 + clipMargin);
				self.icon.setY((calculatedSize.height - self.icon.getHeight()) / 2 + clipMargin);
				self.icon.setX((calculatedSize.width - self.icon.getWidth()) / 2);
			} else if (iconPos === 'bottom') {
				self.text.setX((calculatedSize.width - self.text.getWidth()) / 2);
				self.text.setY(clipMargin + padding);
				self.icon.setY(clipMargin + calculatedSize.height - self.icon.getHeight() - padding);
				self.icon.setX((calculatedSize.width - self.icon.getWidth()) / 2);
			} else if (iconPos === 'top') {
				self.text.setX((calculatedSize.width - self.text.getWidth()) / 2);
				self.icon.setY(clipMargin + padding);
				self.text.setY(clipMargin + calculatedSize.height - self.text.getHeight() - padding);
				self.icon.setX((calculatedSize.width - self.icon.getWidth()) / 2);
			} else if (iconPos === 'left') {
				self.text.setX(calculatedSize.width - self.text.getWidth() - padding);
				self.text.setY((calculatedSize.height - self.text.getHeight()) / 2 + clipMargin);
				self.icon.setY((calculatedSize.height - self.icon.getHeight()) / 2 + clipMargin);
				self.icon.setX(padding);
			} else if (iconPos === 'right') {
				self.text.setY((calculatedSize.height - self.text.getHeight()) / 2 + clipMargin);
				self.text.setX(padding);
				self.icon.setY((calculatedSize.height - self.icon.getHeight()) / 2 + clipMargin);
				self.icon.setX(calculatedSize.width - self.icon.getWidth() - padding);
			}
		},
		calculateMergedBoxSize = function (box1, box2) {
			if (box2.position === 'bottom' || box2.position === 'top') {
				return {
					width: Math.max(box1.width, box2.width) + 2 * padding,
					height: box1.height + box2.height + 3 * padding
				};
			}
			if (box2.position === 'left' || box2.position === 'right') {
				return {
					width: box1.width + box2.width + 3 * padding,
					height: Math.max(box1.height, box2.height) + 2 * padding
				};
			}
			return pad({
				width: Math.max(box1.width, box2.width),
				height: Math.max(box1.height, box2.height)
			});
		};
	if (this.mmAttr && this.mmAttr.icon && this.mmAttr.icon.url) {
		calculatedSize = calculateMergedBoxSize(textSize, this.mmAttr.icon);
	} else {
		calculatedSize = pad(textSize);
	}
	this.icon.updateMapjsAttribs(self.mmAttr && self.mmAttr.icon);

	this.clip.setVisible(clipMargin);
	this.setWidth(calculatedSize.width);
	this.setHeight(calculatedSize.height + clipMargin);
	this.link.setX(calculatedSize.width - 2 * padding + 10);
	this.link.setY(calculatedSize.height - 2 * padding + 5 + clipMargin);
	positionTextAndIcon();
	rectOffset = clipMargin;
	_.each([this.rect, this.rectbg2, this.rectbg1], function (r) {
		r.setWidth(calculatedSize.width);
		r.setHeight(calculatedSize.height);
		r.setY(rectOffset);
		rectOffset += rectIncrement;
		if (isDroppable) {
			r.setStroke('#9F4F4F');
			r.setFill('#EF6F6F');
		} else if (isSelected) {
			r.setFill(background);
		} else {
			r.setStroke(self.rectAttrs.stroke);
			r.setFill(background);
		}
	});
	if (isActivated) {
		this.rect.setStroke('#2E9AFE');
		var dashes = [[5, 3, 0, 0], [4, 3, 1, 0], [3, 3, 2, 0], [2, 3, 3, 0], [1, 3, 4, 0], [0, 3, 5, 0], [0, 2, 5, 1], [0, 1, 5, 2]];
		if (true || this.disableAnimations) {
			self.rect.setDashArray(dashes[0]);
		} else {
			if (!this.activeAnimation) {
				this.activeAnimation = new Kinetic.Animation(
			        function (frame) {
						var da = dashes[Math.floor(frame.time / 30) % 8];
						self.rect.setDashArray(da);
			        },
			        self.getLayer()
			    );
			}
			this.activeAnimation.start();
		}
	} else {
		if (this.activeAnimation) {
			this.activeAnimation.stop();
		}
		this.rect.setDashArray([]);
	}
	this.rect.setDashArray(getDash());
	this.rect.setStrokeWidth(this.isActivated ? 3 : self.rectAttrs.strokeWidth);
	this.rectbg1.setVisible(this.isCollapsed());
	this.rectbg2.setVisible(this.isCollapsed());
	this.clip.setX(calculatedSize.width - padding);
	this.setupShadows();
	this.text.setFill(MAPJS.contrastForeground(tintedBackground));
};

Kinetic.Idea.prototype.setMMAttr = function (newMMAttr) {
	'use strict';
	this.mmAttr = newMMAttr;
	this.setStyle();
//	this.getLayer().draw();
};

Kinetic.Idea.prototype.getIsSelected = function () {
	'use strict';
	return this.isSelected;
};

Kinetic.Idea.prototype.isCollapsed = function () {
	'use strict';
	return this.mmAttr && this.mmAttr.collapsed || false;
};

Kinetic.Idea.prototype.setIsSelected = function (isSelected) {
	'use strict';
	this.isSelected = isSelected;
	this.setStyle();
	this.getLayer().draw();
	if (!isSelected && this.stopEditing) {
		this.stopEditing();
	}
};

Kinetic.Idea.prototype.setIsActivated = function (isActivated) {
	'use strict';
	this.isActivated = isActivated;
	this.setStyle();
//	this.getLayer().draw();
};

Kinetic.Idea.prototype.setIsDroppable = function (isDroppable) {
	'use strict';
	this.isDroppable = isDroppable;
	this.setStyle(this.attrs);
};

Kinetic.Util.extend(Kinetic.Idea, Kinetic.Group);
/*global _, Kinetic, MAPJS*/
if (Kinetic.Stage.prototype.isRectVisible) {
	throw ('isRectVisible already exists, should not mix in our methods');
}

Kinetic.Tween.prototype.reset = function () {
	'use strict';
	this.tween.reset();
	return this;
};

MAPJS.Rectangle = function (x, y, width, height) {
	'use strict';
	this.scale = function (scale) {
		return new MAPJS.Rectangle(x * scale, y * scale, width * scale, height * scale);
	};
	this.translate = function (dx, dy) {
		return new MAPJS.Rectangle(x + dx, y + dy, width, height);
	};
	this.inset = function (margin) {
		return new MAPJS.Rectangle(x + margin, y + margin, width - (margin * 2), height - (margin * 2));
	};
	this.xscale = function (scale) {
		this.x *= scale;
		this.y *= scale;
		this.width *= scale;
		this.height *= scale;
		return this;
	};
	this.xtranslate = function (dx, dy) {
		this.x += dx;
		this.y += dy;
		return this;
	};
	this.xinset = function (margin) {
		this.x += margin;
		this.y += margin;
		this.width -= margin * 2;
		this.height -= margin * 2;
		return this;
	};
	this.x = x;
	this.y = y;
	this.height = height;
	this.width = width;
};
Kinetic.Stage.prototype.isRectVisible = function (rect, offset) {
	'use strict';
	offset = offset || {x: 0, y: 0, margin: 0};
	var scale = this.getScale().x || 1;
	rect = rect.xscale(scale).xtranslate(offset.x, offset.y).xinset(offset.margin);
	return !(
		rect.x + this.getX() > this.getWidth() ||
		rect.x + rect.width + this.getX() < 0  ||
		rect.y + this.getY() > this.getHeight() ||
		rect.y + rect.height + this.getY() < 0
	);
};

MAPJS.KineticMediator = function (mapModel, stage) {
	'use strict';
	window.stage = stage;
	var layer = new Kinetic.Layer(),
		nodeByIdeaId = {},
		connectorByFromIdeaIdToIdeaId = {},
		connectorKey = function (fromIdeaId, toIdeaId) {
			return fromIdeaId + '_' + toIdeaId;
		},
		atLeastOneVisible = function (list, deltaX, deltaY) {
			var margin = Math.min(stage.getHeight(), stage.getWidth()) * 0.1;
			return _.find(list, function (node) {
				return node.isVisible({x: deltaX, y: deltaY, margin: margin});
			});
		},
		moveStage = function (deltaX, deltaY) {
			var visibleAfterMove, visibleBeforeMove;
			if (!stage) {
				return;
			}

			visibleBeforeMove = atLeastOneVisible(nodeByIdeaId, 0, 0) || atLeastOneVisible(connectorByFromIdeaIdToIdeaId, 0, 0);
			visibleAfterMove = atLeastOneVisible(nodeByIdeaId, deltaX, deltaY) || atLeastOneVisible(connectorByFromIdeaIdToIdeaId, deltaX, deltaY);
			if (visibleAfterMove || (!visibleBeforeMove)) {
				if (deltaY !== 0) { stage.setY(stage.getY() + deltaY); }
				if (deltaX !== 0) { stage.setX(stage.getX() + deltaX); }
				stage.draw();
			}
		},
		resetStage = function () {
			new Kinetic.Tween({
				node: stage,
				x: 0.5 * stage.getWidth(),
				y: 0.5 * stage.getHeight(),
				scaleX: 1,
				scaleY: 1,
				easing: Kinetic.Easings.EaseInOut,
				duration: 0.05,
				onFinish: function () {
					stage.fire(':scaleChangeComplete');
				}
			}).play();
		},
		ensureSelectedNodeVisible = function (node) {
			var scale = stage.getScale().x || 1,
				offset = 100,
				move = { x: 0, y: 0 };
			if (!node.getIsSelected()) {
				return;
			}
			if (node.getAbsolutePosition().x + node.getWidth() * scale + offset > stage.getWidth()) {
				move.x = stage.getWidth() - (node.getAbsolutePosition().x + node.getWidth() * scale + offset);
			} else if (node.getAbsolutePosition().x < offset) {
				move.x  = offset - node.getAbsolutePosition().x;
			}
			if (node.getAbsolutePosition().y + node.getHeight() * scale + offset > stage.getHeight()) {
				move.y = stage.getHeight() - (node.getAbsolutePosition().y + node.getHeight() * scale + offset);
			} else if (node.getAbsolutePosition().y < offset) {
				move.y = offset - node.getAbsolutePosition().y;
			}
			new Kinetic.Tween({
				node: stage,
				x: stage.getX() + move.x,
				y: stage.getY() + move.y,
				duration: 0.4,
				easing: Kinetic.Easings.EaseInOut
			}).play();
		};
	stage.add(layer);
	layer.on('mouseover', function () {
		stage.getContainer().style.cursor = 'pointer';
	});
	layer.on('mouseout', function () {
		stage.getContainer().style.cursor = 'auto';
	});
	mapModel.addEventListener('addLinkModeToggled', function (isOn) {
		stage.getContainer().style.cursor = isOn ? 'crosshair' : 'auto';
		layer.off('mouseover mouseout');
		layer.on('mouseover', function () {
			stage.getContainer().style.cursor = isOn ? 'alias' : 'pointer';
		});
		layer.on('mouseout', function () {
			stage.getContainer().style.cursor = isOn ? 'crosshair' : 'auto';
		});
	});
	mapModel.addEventListener('nodeEditRequested', function (nodeId, shouldSelectAll, editingNew) {
		var node = nodeByIdeaId[nodeId];
		if (node) {
			node.editNode(shouldSelectAll, editingNew);
		}
	});
	mapModel.addEventListener('nodeCreated', function (n) {
		var node = new Kinetic.Idea({
			level: n.level,
			x: n.x,
			y: n.y,
			text: n.title,
			mmAttr: n.attr,
			opacity: 1,
			id: 'node_' + n.id,
			activated: n.activated
		});
		node.on('click tap', function (evt) { mapModel.clickNode(n.id, evt); });
		node.on('dblclick dbltap', function () {
			if (!mapModel.getEditingEnabled()) {
				mapModel.toggleCollapse('mouse');
				return;
			}
			mapModel.editNode('mouse', false, false);
		});
		node.on(':textChanged', function (event) {
			mapModel.updateTitle(n.id, event.text, event.isNew);
			mapModel.setInputEnabled(true);
		});
		node.on(':editing', function () {
			mapModel.setInputEnabled(false);
		});
		node.on(':request', function (event) {
			mapModel[event.type](event.source, n.id);
		});
		if (n.level > 1) {
			node.on('mouseover touchstart', stage.setDraggable.bind(stage, false));
			node.on('mouseout touchend', stage.setDraggable.bind(stage, true));
		}
		layer.add(node);
		stage.on(':scaleChangeComplete', function () {
			node.setupShadows();
		});
		nodeByIdeaId[n.id] = node;
	}, 1);
	mapModel.addEventListener('nodeSelectionChanged', function (ideaId, isSelected) {
		var node = nodeByIdeaId[ideaId];
		if (!node) {
			return;
		}
		node.setIsSelected(isSelected);
		if (!isSelected) {
			return;
		}
		ensureSelectedNodeVisible(node);
	});
	mapModel.addEventListener('nodeAttrChanged', function (n) {
		var node = nodeByIdeaId[n.id];
		node.setMMAttr(n.attr);
	});
	mapModel.addEventListener('nodeDroppableChanged', function (ideaId, isDroppable) {
		var node = nodeByIdeaId[ideaId];
		node.setIsDroppable(isDroppable);
	});
	mapModel.addEventListener('nodeRemoved', function (n) {
		var node = nodeByIdeaId[n.id];
		delete nodeByIdeaId[n.id];
		node.off('click dblclick tap dbltap dragstart dragmove dragend mouseover mouseout touchstart touchend :openAttachmentRequested :editing :textChanged ');
	//	node.destroy();
		new Kinetic.Tween({
			node: node,
			opacity: 0.25,
			easing: Kinetic.Easings.EaseInOut,
			duration: 0.2,
			onFinish: node.destroy.bind(node)
		}).play();
	});
	mapModel.addEventListener('nodeMoved', function (n, reason) {
		var node = nodeByIdeaId[n.id];
		new Kinetic.Tween({
			node: node,
			x: n.x,
			y: n.y,
			easing: reason === 'failed' ? Kinetic.Easings.BounceEaseOut: Kinetic.Easings.EaseInOut,
			duration: 0.4,
			onFinish: ensureSelectedNodeVisible.bind(undefined, node)
		}).play();
	});
	mapModel.addEventListener('nodeTitleChanged', function (n) {
		var node = nodeByIdeaId[n.id];
		node.setText(n.title);
	});
	mapModel.addEventListener('connectorCreated', function (n) {
		var connector = new Kinetic.Connector({
			id: 'connector_' + n.to,
			shapeFrom: nodeByIdeaId[n.from],
			shapeTo: nodeByIdeaId[n.to],
			stroke: '#888',
			strokeWidth: 1,
			opacity: 0
		});
		connectorByFromIdeaIdToIdeaId[connectorKey(n.from, n.to)] = connector;
		layer.add(connector);
		connector.moveToBottom();
		new Kinetic.Tween({
			node: connector,
			opacity: 1,
			easing: Kinetic.Easings.EaseInOut,
			duration: 0.1
		}).play();
	});
	mapModel.addEventListener('layoutChangeComplete', function () {
		stage.draw();
	});
	mapModel.addEventListener('connectorRemoved', function (n) {
		var key = connectorKey(n.from, n.to),
			connector = connectorByFromIdeaIdToIdeaId[key];
		delete connectorByFromIdeaIdToIdeaId[key];
		new Kinetic.Tween({
			node: connector,
			opacity: 0,
			easing: Kinetic.Easings.EaseInOut,
			duration: 0.1,
			onFinish: connector.destroy.bind(connector)
		}).play();
	});
	mapModel.addEventListener('linkCreated', function (l) {
		var link = new Kinetic.Link({
			id: 'link_' + l.ideaIdFrom + '_' + l.ideaIdTo,
			shapeFrom: nodeByIdeaId[l.ideaIdFrom],
			shapeTo: nodeByIdeaId[l.ideaIdTo],
			dashArray: [8, 8],
			stroke: '#800',
			strokeWidth: 1.5
		});
		link.on('click tap', function (event) {
			mapModel.selectLink('mouse', l, { x: event.layerX, y: event.layerY });
		});
		layer.add(link);
		link.moveToBottom();
		link.setMMAttr(l.attr);
	});
	mapModel.addEventListener('linkRemoved', function (l) {
		var link = layer.get('#link_' + l.ideaIdFrom + '_' + l.ideaIdTo)[0];
		link.destroy();
//		layer.draw();
	});
	mapModel.addEventListener('linkAttrChanged', function (l) {
		var link = layer.get('#link_' + l.ideaIdFrom + '_' + l.ideaIdTo)[0];
		link.setMMAttr(l.attr);
	});
	mapModel.addEventListener('mapScaleChanged', function (scaleMultiplier, zoomPoint) {
		var currentScale = stage.getScale().x || 1,
			targetScale = Math.max(Math.min(currentScale * scaleMultiplier, 5), 0.2);
		if (currentScale === targetScale) {
			return;
		}
		zoomPoint = zoomPoint || {x:  0.5 * stage.getWidth(), y: 0.5 * stage.getHeight()};
		new Kinetic.Tween({
			node: stage,
			x: zoomPoint.x + (stage.getX() - zoomPoint.x) * targetScale / currentScale,
			y: zoomPoint.y + (stage.getY() - zoomPoint.y) * targetScale / currentScale,
			scaleX: targetScale,
			scaleY: targetScale,
			easing: Kinetic.Easings.EaseInOut,
			duration: 0.01,
			onFinish: function () {
				stage.fire(':scaleChangeComplete');
			}
		}).play();
	});
	mapModel.addEventListener('mapViewResetRequested', function () {
		resetStage();
	});
	mapModel.addEventListener('mapMoveRequested', function (deltaX, deltaY) {
		moveStage(deltaX, deltaY);
	});
	mapModel.addEventListener('activatedNodesChanged', function (activatedNodes, deactivatedNodes) {
		var setActivated = function (active, id) {
			var node = nodeByIdeaId[id];
			if (!node) {
				return;
			}
			node.setIsActivated(active);
		};
		_.each(activatedNodes, setActivated.bind(undefined, true));
		_.each(deactivatedNodes, setActivated.bind(undefined, false));
		stage.draw();
	});
	(function () {
		var x, y;
		stage.on('dragmove', function () {
			var deltaX = x - stage.getX(),
				deltaY = y - stage.getY(),
				visibleAfterMove = atLeastOneVisible(nodeByIdeaId, 0, 0) || atLeastOneVisible(connectorByFromIdeaIdToIdeaId, 0, 0),
				shouldMoveBack = !visibleAfterMove && !(atLeastOneVisible(nodeByIdeaId, deltaX, deltaY) || atLeastOneVisible(connectorByFromIdeaIdToIdeaId, deltaX, deltaY));
			if (shouldMoveBack) {
				moveStage(deltaX, deltaY);
			} else {
				x = stage.getX();
				y = stage.getY();
			}
		});
	}());
};
MAPJS.calculateMergedBoxSize = function (box1, box2) {
	'use strict';
	if (box2.position === 'bottom' || box2.position === 'top') {
		return {
			width: Math.max(box1.width, box2.width),
			height: box1.height + box2.height
		};
	}
	if (box2.position === 'left' || box2.position === 'right') {
		return {
			width: box1.width + box2.width,
			height: Math.max(box1.height, box2.height)
		};
	}
	return {
		width: Math.max(box1.width, box2.width),
		height: Math.max(box1.height, box2.height)
	};
};
MAPJS.KineticMediator.dimensionProvider = _.memoize(
	function (content) {
		'use strict';
		var shape = new Kinetic.Idea({
			text: content.title,
			mmAttr: content.attr
		});
		return {
			width: shape.getWidth(),
			height: shape.getHeight()
		};
	},
	function (content) {
		'use strict';
		var iconSize = (content.attr && content.attr.icon && (':' + content.attr.icon.width + 'x' + content.attr.icon.height + 'x' + content.attr.icon.position)) || ':0x0x0';
		return content.title + iconSize;
	}
);

MAPJS.KineticMediator.layoutCalculator = function (idea) {
	'use strict';
	return MAPJS.calculateLayout(idea, MAPJS.KineticMediator.dimensionProvider);
};
/*global jQuery*/
jQuery.fn.mapToolbarWidget = function (mapModel) {
	'use strict';
	var clickMethodNames = ['insertIntermediate', 'scaleUp', 'scaleDown', 'addSubIdea', 'editNode', 'removeSubIdea', 'toggleCollapse', 'addSiblingIdea', 'undo', 'redo',
			'copy', 'cut', 'paste', 'resetView', 'openAttachment', 'toggleAddLinkMode', 'activateChildren', 'activateNodeAndChildren', 'activateSiblingNodes', 'editIcon'],
		changeMethodNames = ['updateStyle'];
	return this.each(function () {
		var element = jQuery(this), preventRoundtrip = false;
		mapModel.addEventListener('nodeSelectionChanged', function () {
			preventRoundtrip = true;
			element.find('.updateStyle[data-mm-target-property]').val(function () {
				return mapModel.getSelectedStyle(jQuery(this).data('mm-target-property'));
			}).change();
			preventRoundtrip = false;
		});
		mapModel.addEventListener('addLinkModeToggled', function () {
			element.find('.toggleAddLinkMode').toggleClass('active');
		});
		clickMethodNames.forEach(function (methodName) {
			element.find('.' + methodName).click(function () {
				if (mapModel[methodName]) {
					mapModel[methodName]('toolbar');
				}
			});
		});
		changeMethodNames.forEach(function (methodName) {
			element.find('.' + methodName).change(function () {
				if (preventRoundtrip) {
					return;
				}
				var tool = jQuery(this);
				if (tool.data('mm-target-property')) {
					mapModel[methodName]('toolbar', tool.data('mm-target-property'), tool.val());
				}
			});
		});
	});
};
/*jslint nomen: true*/
/*global _, jQuery, MAPJS, Kinetic */
MAPJS.pngExport = function (idea) {
	'use strict';
	var deferred = jQuery.Deferred(),
		layout = MAPJS.calculateLayout(idea, MAPJS.KineticMediator.dimensionProvider),
		frame = MAPJS.calculateFrame(layout.nodes, 10),
		hiddencontainer = jQuery('<div></div>').css('visibility', 'hidden')
			.appendTo('body').width(frame.width).height(frame.height).attr('id', 'hiddencontainer'),
		hiddenstage = new Kinetic.Stage({ container: 'hiddencontainer' }),
		layer = new Kinetic.Layer(),
		backgroundLayer = new Kinetic.Layer(),
		nodeByIdeaId = {},
		bg = new Kinetic.Rect({
			fill: '#ffffff',
			x: frame.left,
			y: frame.top,
			width: frame.width,
			height: frame.height
		});
	hiddenstage.add(backgroundLayer);
	backgroundLayer.add(bg);
	hiddenstage.add(layer);
	hiddenstage.setWidth(frame.width);
	hiddenstage.setHeight(frame.height);
	hiddenstage.setX(-1 * frame.left);
	hiddenstage.setY(-1 * frame.top);
	_.each(layout.nodes, function (n) {
		var node = new Kinetic.Idea({
			level: n.level,
			x: n.x,
			y: n.y,
			text: n.title,
			mmAttr: n.attr
		});
		nodeByIdeaId[n.id] = node;
		layer.add(node);
	});
	_.each(layout.connectors, function (n) {
		var connector = new Kinetic.Connector({
			shapeFrom: nodeByIdeaId[n.from],
			shapeTo: nodeByIdeaId[n.to],
			stroke: '#888',
			strokeWidth: 1
		});
		layer.add(connector);
		connector.moveToBottom();
	});
	_.each(layout.links, function (l) {
		var link = new Kinetic.Link({
			shapeFrom: nodeByIdeaId[l.ideaIdFrom],
			shapeTo: nodeByIdeaId[l.ideaIdTo],
			dashArray: [8, 8],
			stroke: '#800',
			strokeWidth: 1.5
		});
		layer.add(link);
		link.moveToBottom();
		link.setMMAttr(l.attr);
	});
	hiddenstage.draw();
	hiddenstage.toDataURL({
		callback: function (url) {
			deferred.resolve(url);
			hiddencontainer.remove();
		}
	});
	return deferred.promise();
};
/*global _, jQuery, Kinetic, MAPJS, window, document, $*/
jQuery.fn.mapWidget = function (activityLog, mapModel, touchEnabled, imageInsertController) {
	'use strict';
	return this.each(function () {
		var element = jQuery(this),
			stage = new Kinetic.Stage({
				container: this.id,
				draggable: true
			}),
			mediator = new MAPJS.KineticMediator(mapModel, stage),
			setStageDimensions = function () {
				stage.setWidth(element.width());
				stage.setHeight(element.height());
				stage.draw();
			},
			lastGesture,
			actOnKeys = true,
			discrete = function (gesture) {
				var result = (lastGesture && lastGesture.type !== gesture.type && (gesture.timeStamp - lastGesture.timeStamp < 250));
				lastGesture = gesture;
				return !result;
			},
			hotkeyEventHandlers = {
				'return': 'addSiblingIdea',
				'del backspace': 'removeSubIdea',
				'tab insert': 'addSubIdea',
				'left': 'selectNodeLeft',
				'up': 'selectNodeUp',
				'right': 'selectNodeRight',
				'shift+right': 'activateNodeRight',
				'shift+left': 'activateNodeLeft',
				'shift+up': 'activateNodeUp',
				'shift+down': 'activateNodeDown',
				'down': 'selectNodeDown',
				'space f2': 'editNode',
				'f': 'toggleCollapse',
				'c meta+x ctrl+x': 'cut',
				'p meta+v ctrl+v': 'paste',
				'y meta+c ctrl+c': 'copy',
				'u meta+z ctrl+z': 'undo',
				'shift+tab': 'insertIntermediate',
				'Esc 0 meta+0 ctrl+0': 'resetView',
				'r meta+shift+z ctrl+shift+z meta+y ctrl+y': 'redo',
				'meta+plus ctrl+plus z': 'scaleUp',
				'meta+minus ctrl+minus shift+z': 'scaleDown',
				'meta+up ctrl+up': 'moveUp',
				'meta+down ctrl+down': 'moveDown',
				'ctrl+shift+v meta+shift+v': 'pasteStyle',
				'Esc': 'cancelCurrentAction'
			},
			charEventHandlers = {
				'[' : 'activateChildren',
				'{'	: 'activateNodeAndChildren',
				'='	: 'activateSiblingNodes',
				'.'	: 'activateSelectedNode',
				'/' : 'toggleCollapse',
				'a' : 'openAttachment',
				'i' : 'editIcon'
			},
			onScroll = function (event, delta, deltaX, deltaY) {
				deltaX = deltaX || 0; /*chromebook scroll fix*/
				deltaY = deltaY || 0;
				if (event.target === jQuery(stage.getContainer()).find('canvas')[0]) {
					if (Math.abs(deltaX) < 5) {
						deltaX = deltaX * 5;
					}
					if (Math.abs(deltaY) < 5) {
						deltaY = deltaY * 5;
					}
					mapModel.move('mousewheel', -1 * deltaX, deltaY);
					if (event.preventDefault) { // stop the back button
						event.preventDefault();
					}
				}
			};
		_.each(hotkeyEventHandlers, function (mappedFunction, keysPressed) {
			jQuery(document).keydown(keysPressed, function (event) {
				if (actOnKeys) {
					event.preventDefault();
					mapModel[mappedFunction]('keyboard');
				}
			});
		});
		MAPJS.dragdrop(mapModel, stage, imageInsertController);
		$(document).on('keypress', function (evt) {
			if (!actOnKeys) {
				return;
			}
			if (/INPUT|TEXTAREA/.test(evt && evt.target && evt.target.tagName)) {
				return;
			}
			var unicode = evt.charCode || evt.keyCode,
				actualkey = String.fromCharCode(unicode),
				mappedFunction = charEventHandlers[actualkey];
			if (mappedFunction) {
				evt.preventDefault();
				mapModel[mappedFunction]('keyboard');
			} else if (Number(actualkey) <= 9 && Number(actualkey) >= 1) {
				evt.preventDefault();
				mapModel.activateLevel('keyboard', Number(actualkey) + 1);
			}
		});
		element.data('mm-stage', stage);
		mapModel.addEventListener('inputEnabledChanged', function (canInput) {
			actOnKeys = canInput;
		});
		setStageDimensions();
		stage.setX(0.5 * stage.getWidth());
		stage.setY(0.5 * stage.getHeight());
		jQuery(window).bind('orientationchange resize', setStageDimensions);
		$(document).on('contextmenu', function (e) { e.preventDefault(); e.stopPropagation(); return false; });
		element.on('mousedown touch', function (e) {
			window.focus();
			if (document.activeElement !== e.target) {
				document.activeElement.blur();
			}
		});
		if (!touchEnabled) {
			jQuery(window).mousewheel(onScroll);
		} else {
			element.find('canvas').hammer().on('pinch', function (event) {
				if (discrete(event)) {
					mapModel.scale('touch', event.gesture.scale, {
						x: event.gesture.center.pageX - element.offset().left,
						y: event.gesture.center.pageY - element.offset().top
					});
				}
			}).on('swipe', function (event) {
				if (discrete(event)) {
					mapModel.move('touch', event.gesture.deltaX, event.gesture.deltaY);
				}
			}).on('doubletap', function () {
				mapModel.resetView();
			}).on('touch', function () {
				jQuery('.topbar-color-picker:visible').hide();
				jQuery('.ideaInput:visible').blur();
			});
		}
	});
};
/*global jQuery*/
jQuery.fn.linkEditWidget = function (mapModel) {
	'use strict';
	return this.each(function () {
		var element = jQuery(this), currentLink, width, height, colorElement, lineStyleElement, arrowElement;
		colorElement = element.find('.color');
		lineStyleElement = element.find('.lineStyle');
		arrowElement = element.find('.arrow');
		mapModel.addEventListener('linkSelected', function (link, selectionPoint, linkStyle) {
			currentLink = link;
			element.show();
			width = width || element.width();
			height = height || element.height();
			element.css({
				top: (selectionPoint.y - 0.5 * height - 15) + 'px',
				left: (selectionPoint.x - 0.5 * width - 15) + 'px'
			});
			colorElement.val(linkStyle.color).change();
			lineStyleElement.val(linkStyle.lineStyle);
			arrowElement[linkStyle.arrow ? 'addClass' : 'removeClass']('active');
		});
		mapModel.addEventListener('mapMoveRequested', function () {
			element.hide();
		});
		element.find('.delete').click(function () {
			mapModel.removeLink('mouse', currentLink.ideaIdFrom, currentLink.ideaIdTo);
			element.hide();
		});
		colorElement.change(function () {
			mapModel.updateLinkStyle('mouse', currentLink.ideaIdFrom, currentLink.ideaIdTo, 'color', jQuery(this).val());
		});
		lineStyleElement.find('a').click(function () {
			mapModel.updateLinkStyle('mouse', currentLink.ideaIdFrom, currentLink.ideaIdTo, 'lineStyle', jQuery(this).text());
		});
		arrowElement.click(function () {
			mapModel.updateLinkStyle('mouse', currentLink.ideaIdFrom, currentLink.ideaIdTo, 'arrow', !arrowElement.hasClass('active'));
		});
		element.mouseleave(element.hide.bind(element));
	});
};
/*global observable, jQuery, FileReader, Image, MAPJS, document, _ */
MAPJS.getDataURIAndDimensions = function (src, corsProxyUrl) {
	'use strict';
	var isDataUri = function (string) {
			return (/^data:image/).test(string);
		},
		convertSrcToDataUri = function (img) {
			if (isDataUri(img.src)) {
				return img.src;
			}
			var canvas = document.createElement('canvas');
			canvas.width = img.width;
			canvas.height = img.height;
			var ctx = canvas.getContext('2d');
			ctx.drawImage(img, 0, 0);
			return canvas.toDataURL('image/png');
		},
		deferred = jQuery.Deferred(),
		domImg = new Image();

	domImg.onload = function () {
		try {
			deferred.resolve({dataUri: convertSrcToDataUri(domImg), width: domImg.width, height: domImg.height});
		} catch (e) {
			deferred.reject();
		}
	};
	domImg.onerror = function () {
		deferred.reject();
	};
	if (!isDataUri(src)) {
		if (corsProxyUrl) {
			domImg.crossOrigin = 'Anonymous';
			src = corsProxyUrl + encodeURIComponent(src);
		} else {
			deferred.reject('no-cors');
		}
	}
	domImg.src = src;
	return deferred.promise();
};
MAPJS.ImageInsertController = function (corsProxyUrl) {
	'use strict';
	var self = observable(this),
		readFileIntoDataUrl = function (fileInfo) {
			var loader = jQuery.Deferred(),
				fReader = new FileReader();
			fReader.onload = function (e) {
				loader.resolve(e.target.result);
			};
			fReader.onerror = loader.reject;
			fReader.onprogress = loader.notify;
			fReader.readAsDataURL(fileInfo);
			return loader.promise();
		};
	self.insertDataUrl = function (dataUrl, evt) {
		self.dispatchEvent('imageLoadStarted');
		MAPJS.getDataURIAndDimensions(dataUrl, corsProxyUrl).then(
			function (result) {
				self.dispatchEvent('imageInserted', result.dataUri, result.width, result.height, evt);
			},
			function (reason) {
				self.dispatchEvent('imageInsertError', reason);
			}
		);
	};
	self.insertFiles = function (files, evt) {
		jQuery.each(files, function (idx, fileInfo) {
			if (/^image\//.test(fileInfo.type)) {
				jQuery.when(readFileIntoDataUrl(fileInfo)).done(function (dataUrl) { self.insertDataUrl(dataUrl, evt); });
			}
		});
	};
	self.insertHtmlContent = function (htmlContent, evt) {
		var images = htmlContent.match(/img[^>]*src="([^"]*)"/);
		if (images && images.length > 0) {
			_.each(images.slice(1), function (dataUrl) { self.insertDataUrl(dataUrl, evt); });
		}
	};
};
jQuery.fn.imageDropWidget = function (imageInsertController) {
	'use strict';
	this.on('dragenter dragover', function (e) {
		if (e.originalEvent.dataTransfer) {
			return false;
		}
	}).on('drop', function (e) {
		var dataTransfer = e.originalEvent.dataTransfer,
			htmlContent;
		e.stopPropagation();
		e.preventDefault();
		if (dataTransfer && dataTransfer.files && dataTransfer.files.length > 0) {
			imageInsertController.insertFiles(dataTransfer.files, e.originalEvent);
		} else if (dataTransfer) {
			htmlContent = dataTransfer.getData('text/html');
			imageInsertController.insertHtmlContent(htmlContent, e.originalEvent);
		}
	});
	return this;
};

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

/*global $ */
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
			if (!filter || filter(idea)) {
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
	self.getRawData = function () {
		var data = [];
		if (!activeContent) {
			return data;
		}
		data.push(['Name'].concat(measures));
		activeContent.traverse(function (idea) {
			if (!filter || filter(idea)) {
				data.push(
					[idea.title].concat(_.map(measures,
							function (measure) {
								var ideaMeasures = idea.getAttr(valueAttrName) || {};
								return ideaMeasures[measure];
							})
						)
				);
			}
		});

		return data;
	};
	self.removeFilter = function () {
		filter = undefined;
	};
};
MM.MeasuresModel.filterByIds = function (ids) {
	'use strict';
	return function (idea) {
		return _.include(ids, idea.id);
	};
};


jQuery.fn.editByActivatedNodesWidget = function (keyStroke, mapModel, measuresModel) {
	'use strict';
	return jQuery.each(this, function () {
		var element = jQuery(this),
			showModal = function () {
				if (mapModel.getInputEnabled()) {
					measuresModel.editWithFilter(MM.MeasuresModel.filterByIds(mapModel.getActivatedNodeIds()));
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
		    noMeasuresDiv = element.find('[data-mm-role=no-measures]'),
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
				measurementsTable.show();
				noMeasuresDiv.hide();
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
		.editableTableWidget({
			editor: element.find('[data-mm-role=measures-editor]'),
			cloneProperties: jQuery.fn.editableTableWidget.defaultOptions.cloneProperties.concat(['outline', 'box-shadow', '-webkit-box-shadow', '-moz-box-shadow'])
		})
		.on('validate', function (evt, value) {
			return measuresModel.validate(value);
		}).numericTotaliser();

		element.on('shown', function () {
			element.find('[data-mm-role=measure-to-add]').focus();
			element.find('[data-mm-role=measurements-table] td').first().focus();
		});
		element.on('show', function () {
			measurementContainer.children('[data-mm-role=measurement-template]').remove();
			summaryContainer.children('[data-mm-role=summary-template]').remove();
			var measures = measuresModel.getMeasures();
			if (measures && measures.length > 0) {
				measurementsTable.show();
				noMeasuresDiv.hide();
			} else {
				measurementsTable.hide();
				noMeasuresDiv.show();
			}
			_.each(measures, function (m) {
				appendMeasure(m);
			});
			ideaContainer.children('[data-mm-role=idea-template]').remove();
			_.each(measuresModel.getMeasurementValues(), function (mv) {
				var newIdea = ideaTemplate.clone().appendTo(ideaContainer).attr('data-mm-nodeid', mv.id);
				newIdea.find('[data-mm-role=idea-title]').text(function () {
					var truncLength = jQuery(this).data('mm-truncate');
					if (truncLength && mv.title.length > truncLength) {
						return mv.title.substring(0, truncLength) + '...';
					}
					return mv.title;
				});
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
			measuresModel.removeFilter();
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
MM.exportTableToText = function (table) {
	'use strict';
	return _.map(table, function (row) {
		return _.map(row, function (cell) {
			if (!cell) {
				return '';
			}
			return cell.toString().replace(/\t|\n|\r/g, ' ');
		}).join('\t');
	})
		.join('\n');
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
