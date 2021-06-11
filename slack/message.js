const sendMessage = async (app, channelId, text) => {
	try {
		// chat.postMessage method using WebClient
		const result = await app.client.chat.postMessage({
			channel: channelId,
			text: text,
			mrkdwn: true,
		});
		console.log(result);
	} catch (err) {
		console.error(err);
	}
};

// up to 120 days in the future, do not be in the past
const scheduleMessage = async (app, channelId, text, timestamp) => {
	try {
		// chat.scheduleMessage method using WebClient
		const result = await app.client.chat.scheduleMessage({
			channel: channelId,
			text: text,
			mrkdwn: true,
			post_at: timestamp, // unix epoch timestamp format
		});
		console.log(result);
		return result.scheduled_message_id;
	} catch (err) {
		console.error(err);
	}

	return '';
};

// messages to be sent in 60s will err
const deleteScheduledMessage = async (app, channelId, messageId) => {
	try {
		// chat.deleteScheduledMessage method using WebClient
		const result = await app.client.chat.deleteScheduledMessage({
			channel: channelId,
			scheduled_message_id: messageId,
		});
		console.log(result);
	} catch (err) {
		console.error(err);
	}
};

module.exports = {
	sendMessage: sendMessage,
	scheduleMessage: scheduleMessage,
	deleteScheduledMessage: deleteScheduledMessage,
};
