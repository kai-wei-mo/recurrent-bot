const getMembers = async (app, token, channel) => {
	try {
		// conversations.members method using WebClient
		const result = await app.client.conversations.members({
			token: token,
			channel: channel,
		});
		console.log(result);
		return result.members;
	} catch (err) {
		console.error(err);
	}
};

const getChannelName = async (app, token, channel) => {
	try {
		// conversations.members method using WebClient
		const result = await app.client.conversations.info({
			token: token,
			channel: channel,
		});
		console.log(result);
		return result.channel.name;
	} catch (err) {
		console.error(err);
	}
};

const sendMessage = async (app, channel, text) => {
	try {
		// chat.postMessage method using WebClient
		const result = await app.client.chat.postMessage({
			channel: channel,
			text: text,
			mrkdwn: true,
		});
		console.log(result);
	} catch (err) {
		console.error(err);
	}
};

// up to 120 days in the future, do not be in the past
const scheduleMessage = async (app, channel, text, timestamp) => {
	try {
		// chat.scheduleMessage method using WebClient
		const result = await app.client.chat.scheduleMessage({
			channel: channel,
			text: text,
			mrkdwn: true,
			post_at: timestamp,
		});

		console.log(result);
		return result.scheduled_message_id;
	} catch (err) {
		console.error(err);
	}

	return '';
};

// messages to be sent in 60s will err
const deleteScheduledMessage = async (app, channel, messageId) => {
	try {
		// chat.deleteScheduledMessage method using WebClient
		const result = await app.client.chat.deleteScheduledMessage({
			channel: channel,
			scheduled_message_id: messageId,
		});
		console.log(result);
	} catch (err) {
		console.error(err);
	}
};

module.exports = {
	getMembers: getMembers,
	getChannelName: getChannelName,
	sendMessage: sendMessage,
	scheduleMessage: scheduleMessage,
	deleteScheduledMessage: deleteScheduledMessage,
};
