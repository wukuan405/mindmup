/*global describe, beforeEach, observable, jQuery, afterEach, it, expect, MM, spyOn */
describe('Collaborator List Widget', function () {
	'use strict';
	var underTest, collaborationModel,
			template =
				'  <div>' +
				'    <ul data-mm-role="collab-list">' +
				'      <li data-mm-role="template">' +
				'        <a data-mm-role="collaborator-follow">' +
				'          <img data-mm-role="collaborator-photo" class="collab-photo" />' +
				'          <span data-mm-role="collaborator-name" ></span>&nbsp;' +
				'         </a>' +
				'       </li>' +
				'     </ul>' +
				'  </div>',
			firstCollaborator, secondCollaborator, session1, session2,
			list, thirdCollaborator, session3;

	beforeEach(function () {
		collaborationModel = new MM.CollaborationModel(observable({}));
		collaborationModel.start();
		underTest = jQuery(template).appendTo('body').collaboratorListWidget(collaborationModel, 'mm-collaborator-followed', 'has-collaborators');
		session1 = 'sess123';
		session2 = 'sess456';
		session3 = 'sess777';
		firstCollaborator = { photoUrl: 'http://first-image', sessionId: session1, name:'First name' };
		secondCollaborator = { photoUrl: 'http://second-image', sessionId: session2, name:'Second name' };
		thirdCollaborator = { photoUrl: 'http://second-image', sessionId: session3, name:'Second name' };
		list = underTest.find('ul');
	});
	afterEach(function () {
		underTest.remove();
	});
	describe('has-collaborators marker class', function () {
		it('it does not add the class initially', function () {
			expect(underTest.hasClass('has-collaborators')).toBeFalsy();
		});
		it('adds the class when there is at least one collaborator', function () {
			collaborationModel.collaboratorFocusChanged(firstCollaborator);
			expect(underTest.hasClass('has-collaborators')).toBeTruthy();
		});
		it('removes the class once there are no more collaborators', function () {
			collaborationModel.collaboratorPresenceChanged(firstCollaborator, true);
			collaborationModel.collaboratorPresenceChanged(firstCollaborator, false);
			expect(underTest.hasClass('has-collaborators')).toBeFalsy();
		});
	});
	describe('when a map with existing collaborators is joined', function () {
		beforeEach(function () {
			collaborationModel.start([firstCollaborator]);
		});
		it('adds the has-collaborators marker class and creates items for collaborators', function () {
			expect(underTest.hasClass('has-collaborators')).toBeTruthy();
			expect(list.children().size()).toBe(1);
		});
		it('keeps the list visible when there is at least one collaborator even when people go offline', function () {
			collaborationModel.collaboratorPresenceChanged(secondCollaborator, true);
			collaborationModel.collaboratorPresenceChanged(firstCollaborator, false);

			expect(underTest.hasClass('has-collaborators')).toBeTruthy();
		});
		it('hides the list and removes the marker class if all collaborators go offline', function () {
			collaborationModel.collaboratorPresenceChanged(secondCollaborator, true);
			collaborationModel.collaboratorPresenceChanged(firstCollaborator, false);
			collaborationModel.collaboratorPresenceChanged(secondCollaborator, false);

			expect(underTest.hasClass('has-collaborators')).toBeFalsy();

		});
	});
	describe('stopped event handling', function () {
		beforeEach(function () {
			collaborationModel.start([firstCollaborator, secondCollaborator]);
		});
		it('clears the list of collaborators', function () {
			collaborationModel.stop();

			expect(list.children().size()).toBe(0);
		});
		it('hides the list and removes the marker class', function () {
			collaborationModel.stop();

			expect(underTest.hasClass('has-collaborators')).toBeFalsy();

		});
	});
	describe('collaboratorFocusChanged event handling', function () {
		it('adds a list item for the collaborator', function () {
			collaborationModel.collaboratorFocusChanged(firstCollaborator);
			expect(list.children().size()).toBe(1);
			expect(list.children().first().find('[data-mm-role=collaborator-name]').text()).toBe('First name');
		});
		it('does nothing if the collaborator already existed in the list', function () {
			collaborationModel.collaboratorFocusChanged(firstCollaborator);
			collaborationModel.collaboratorFocusChanged(firstCollaborator);
			expect(list.children().size()).toBe(1);
			expect(list.children().first().find('[data-mm-role=collaborator-name]').text()).toBe('First name');
		});
		it('adds a list item for any subsequent collaborators', function () {
			collaborationModel.collaboratorFocusChanged(firstCollaborator);
			collaborationModel.collaboratorFocusChanged(secondCollaborator);
			expect(list.children().size()).toBe(2);
			expect(list.children().last().find('[data-mm-role=collaborator-name]').text()).toBe('Second name');
		});
	});
	describe('collaborators joining and leaving', function () {
		describe('when coming online', function () {
			it('adds a list item for the collaborator', function () {
				collaborationModel.collaboratorPresenceChanged(firstCollaborator, true);

				expect(list.children().size()).toBe(1);
				expect(list.children().first().find('[data-mm-role=collaborator-name]').text()).toBe('First name');
			});
			it('does nothing if the collaborator already existed in the list', function () {
				collaborationModel.collaboratorFocusChanged(firstCollaborator);
				collaborationModel.collaboratorPresenceChanged(firstCollaborator, true);

				expect(list.children().size()).toBe(1);
				expect(list.children().first().find('[data-mm-role=collaborator-name]').text()).toBe('First name');
			});
			it('adds a list item for any subsequent collaborators', function () {
				collaborationModel.collaboratorPresenceChanged(firstCollaborator, true);
				collaborationModel.collaboratorPresenceChanged(secondCollaborator, true);

				expect(list.children().size()).toBe(2);
				expect(list.children().last().find('[data-mm-role=collaborator-name]').text()).toBe('Second name');
			});
		});
		describe('when going offline', function () {
			beforeEach(function () {
				collaborationModel.collaboratorPresenceChanged(firstCollaborator, true);
				collaborationModel.collaboratorPresenceChanged(secondCollaborator, true);
			});
			it('removes a list item for the collaborator', function () {
				collaborationModel.collaboratorPresenceChanged(firstCollaborator, false);

				expect(list.children().size()).toBe(1);
				expect(list.children().last().find('[data-mm-role=collaborator-name]').text()).toBe('Second name');
			});
			it('does nothing if the collaborator did not exist in the list', function () {
				collaborationModel.collaboratorPresenceChanged(thirdCollaborator, false);
				expect(list.children().size()).toBe(2);
			});
		});
	});
	describe('followedCollaboratorChanged event handling', function () {
		beforeEach(function () {
			collaborationModel.start([firstCollaborator, secondCollaborator]);
			list.children().first().addClass('mm-collaborator-followed');
		});
		it('adds the followed collaborator class to the item matching the session id', function () {
			collaborationModel.toggleFollow(session2);

			expect(list.children().last().hasClass('mm-collaborator-followed')).toBeTruthy();
		});
		it('removes the followed collaborator class from all the other items', function () {
			collaborationModel.toggleFollow(session2);

			expect(list.children().first().hasClass('mm-collaborator-followed')).toBeFalsy();
		});
		it('removes the followed collaborator class from all the items if no longer following', function () {
			collaborationModel.toggleFollow(session2);
			collaborationModel.toggleFollow(session2);

			expect(list.children().first().hasClass('mm-collaborator-followed')).toBeFalsy();
			expect(list.children().last().hasClass('mm-collaborator-followed')).toBeFalsy();
		});
	});
	describe('item templating', function () {
		beforeEach(function () {
			collaborationModel.collaboratorPresenceChanged(firstCollaborator, true);
		});
		it('adds a click/tap call toggleFollow with the session ID on data-mm-role=collaborator-select', function () {
			spyOn(collaborationModel, 'toggleFollow');
			list.children().first().find('[data-mm-role=collaborator-follow]').click();
			expect(collaborationModel.toggleFollow).toHaveBeenCalledWith(session1);
		});
		it('fills in the collaborator name into data-mm-role=collaborator-name"', function () {
			expect(list.children().first().find('[data-mm-role=collaborator-name]').text()).toBe('First name');
		});
		it('fills in the collaborator picture url into the src of data-mm-role=collaborator-photo"', function () {
			expect(list.children().first().find('[data-mm-role=collaborator-photo]').attr('src')).toBe('http://first-image');
		});
	});
});
