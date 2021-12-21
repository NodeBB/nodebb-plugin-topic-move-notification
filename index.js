
'use strict';

const user = require.main.require('./src/user');
const topics = require.main.require('./src/topics');
const posts = require.main.require('./src/posts');
const privileges = require.main.require('./src/privileges');

const plugin = module.exports;

plugin.onTopicMove = async function (data) {
	if (!data) {
		return;
	}
	const isAdmin = await user.isAdministrator(data.uid);
	if (!isAdmin) {
		return;
	}
	const hiddenToVisible = await isHiddenToVisible(data.fromCid, data.toCid);
	if (hiddenToVisible) {
		await sendNotification(data.tid);
	}
};

async function sendNotification(tid) {
	const topicData = await topics.getTopicData(tid);
	if (!topicData) {
		return;
	}
	const postData = await posts.getPostData(topicData.mainPid);
	if (!postData) {
		return;
	}
	postData.user = await user.getUserFields(postData.uid, ['username']);
	await user.notifications.sendTopicNotificationToFollowers(postData.uid, topicData, postData);
}

async function isHiddenToVisible(fromCid, toCid) {
	const [group1, group2] = await Promise.all([
		checkGroup('Platinum Members', fromCid, toCid),
		checkGroup('Diamond Members', fromCid, toCid),
	]);
	return group1 || group2;
}

async function checkGroup(groupName, fromCid, toCid) {
	const [from, to] = await Promise.all([
		privileges.categories.groupPrivileges(fromCid, groupName),
		privileges.categories.groupPrivileges(toCid, groupName),
	]);
	return !from['groups:read'] && to['groups:read'];
}
