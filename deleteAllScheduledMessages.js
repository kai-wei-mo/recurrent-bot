const { App } = require('@slack/bolt');

const signingSecret = process.env['signingSecret'];
const token = process.env['token'];

const app = new App({
	signingSecret: signingSecret,
	token: token,
});

app.start(3000).then(() => {
	console.log('i am running!');
});

// list scheduled messages, regardless of channel
(async () => {
	try {
		const result = await app.client.chat.scheduledMessages.list({
			token: token,
		});
		let scheduledMessages = result.scheduled_messages;

		scheduledMessages.forEach(async (message) => {
			try {
				const result = await app.client.chat.deleteScheduledMessage({
					token: token,
					channel: message.channel_id,
					scheduled_message_id: message.id,
				});
			} catch (err) {
				console.error(err);
			}
		});
	} catch (err) {
		console.error(err);
	}
})();
