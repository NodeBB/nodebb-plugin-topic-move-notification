
'use strict';

var async = require.main.require('async');
var winston = require.main.require('winston');

var user = require.main.require('./src/user');
var topics = require.main.require('./src/topics');
var posts = require.main.require('./src/posts');
var privileges = require.main.require('./src/privileges');
var db = require.main.require('./src/database');

var plugin = {};

plugin.onTopicMove = function(data) {
	if (!data) {
		return;
	}

	async.waterfall([
		function (next) {
			user.isAdministrator(data.uid, next);
		},
		function (isAdmin, next) {
			if (!isAdmin) {
				return;
			}

			isHiddenToVisible(data.fromCid, data.toCid, next);
		},
		function (isHiddenToVisible, next) {
			if (isHiddenToVisible) {
				sendNotification(data.uid, data.tid);
			}
			next();
		}
	], function(err) {
		if (err) {
			winston.error(err);
		}
	});
};

function sendNotification(uid, tid) {
	var topicData;
	var postData;
	async.waterfall([
		function (next) {
			topics.getTopicData(tid, next);
		},
		function (_topicData, next) {
			topicData = _topicData;
			posts.getPostData(_topicData.mainPid, next);
		},
		function (_postData, next) {
			postData = _postData;
			user.getUserFields(_postData.uid, ['username'], next);
		},
		function (userData, next) {
			postData.user = userData;
			user.notifications.sendTopicNotificationToFollowers(postData.uid, topicData, postData);
		}
	], function(err) {
		if (err) {
			winston.error(err);
		}
	});
}

function isHiddenToVisible(fromCid, toCid, callback) {
	var groupName = 'Platinum Members';
	async.parallel({
		from: async.apply(privileges.categories.groupPrivileges, fromCid, groupName),
		to: async.apply(privileges.categories.groupPrivileges, toCid, groupName)
	}, function(err, results) {
		if (err) {
			return callback(err);
		}

		callback(null, !results.from['groups:read'] && results.to['groups:read']);
	});
}

module.exports = plugin;