const { App } = require('@slack/bolt');
const fs = require('fs');

const signingSecret = process.env['signingSecret'];
const token = process.env['token'];
const channelId = process.env['channelId'];

const app = new App({
	signingSecret: signingSecret,
	token: token,
});

const sendMessage = async (channel, text) => {
	try {
		// chat.postMessage method using WebClient
		const result = await app.client.chat.postMessage({
			channel: channel,
			text: text,
			mrkdwn: true,
		});
		// console.log(result);
	} catch (err) {
		console.error(err);
	}
};

// prints help message
const help = async () => {
	sendMessage(channelId, 'You have cried for help!');
};

// lists all presentation groups
const list = async () => {
	console.log('++ Start: Run `list` ignoring any params.');
	fs.readdir('./groups', (err, files) => {
		if (err) {
			sendMessage(
				channelId,
				'Something went wrong while trying to execute `list`.'
			);
			console.error(err);
			return;
		}

		let message = '';
		if (files.length) {
			files.forEach((file) => {
				message += file.split('.')[0] + '\n';
			});
			message = 'The groups are:\n```' + message + '```';
		} else {
			message +=
				'There are no groups to be listed.\nTip: Add a group using `init`.';
		}
		sendMessage(channelId, message);
		console.log('++ Success: listed all or no groups.');
	});
};

const init = async (groups) => {
	process.stdout.write('++ Start: Run `init` with params: ');
	console.log(groups);

	if (groups.length < 1) {
		sendMessage(channelId, 'Error: `init` takes one or more arguments.');
		return;
	}

	groups.forEach((groupName) => {
		let dir = './groups/' + groupName + '.json';
		fs.access(dir, fs.F_OK, (err) => {
			if (err) {
				// file DNE
				let fileJSON = {
					pattern: [],
					schedule: [],
				};
				fs.writeFile(dir, JSON.stringify(fileJSON, null, 2), (err) => {
					if (err) {
						sendMessage(
							channelId,
							`Something went wrong while creating the group \`${groupName}\`.`
						);
						console.error(err);
						return;
					}
				});
				sendMessage(
					channelId,
					`Successfully created the group \`${groupName}\`.`
				);
				console.log(`++ Success: Create the file: ${dir}.`);
				return;
			}
			// file exists
			sendMessage(
				channelId,
				`There already exists a group named \`${groupName}\``
			);
			console.log('++ Success: Group name taken.');
		});
	});
};

const remove = async (groups) => {
	process.stdout.write('++ Start: Run `remove` with params: ');
	console.log(groups);

	if (groups.length < 1) {
		sendMessage(channelId, 'Error: `remove` takes one or more arguments.');
		return;
	}

	groups.forEach((groupName) => {
		let dir = './groups/' + groupName + '.json';
		fs.access(dir, fs.F_OK, (err) => {
			if (err) {
				// file DNE
				sendMessage(
					channelId,
					`There is no group named \`${groupName}\`.`
				);
				console.log('++ Success: Removed nothing.');
				return;
			}
			// file exists
			fs.unlink(dir, (err) => {
				if (err) {
					sendMessage(
						channelId,
						`Something went wrong while removing \`${groupName}\`.`
					);
					console.error(err);
					return;
				}
			});
			sendMessage(
				channelId,
				`Successfully removed the group \`${groupName}\`.`
			);

			console.log(`++ Success: Removed ${dir}.`);
		});
	});
};

const show = async (groups) => {
	process.stdout.write('++ Start: Run `show` with params: ');
	console.log(groups);

	if (groups.length < 1) {
		sendMessage(channelId, 'Error: `show` takes one or more arguments.');
		return;
	}

	groups.forEach((groupName) => {
		let dir = './groups/' + groupName + '.json';
		fs.readFile(dir, (err, data) => {
			if (err) {
				// file DNE
				sendMessage(
					channelId,
					`The following group does not exist: \`${groupName}\`.`
				);
				console.log(`++ Success: Rejected DNE group: ${groupName}.`);
				return;
			}
			// file exists
			let message = '';
			data = JSON.parse(data);

			if (data.schedule.length != 0) {
				data.schedule.forEach((elem) => {
					message += elem.person + ' : ' + elem.time + '\n';
				});
			} else {
				message = '(blank)';
			}

			sendMessage(
				channelId,
				`The presentation schedule for \`${groupName}\` is:\n\`\`\`${message}\`\`\``
			);
			console.log(`++ Success: Showed group schedule for ${groupName}.`);
		});
	});
};

const removePre = async (groupName) => {};

/*
app.event('app_home_opened', ({ event, say }) => {
	console.log(event);
	say(`Hello, <@${event.user}>!`);
});
*/

const funcMap = {
	help: help, // help
	list: list, // list
	init: init, // init devops best hr ...
	remove: remove, // remove devops best hr ...
	show: show,
};

app.event('app_mention', async ({ event, client }) => {
	try {
		console.log(event.text);
		let msgTokens = event.text.split(' ');
		msgTokens.shift(); // remove the app mention

		while (msgTokens.length) {
			let token = msgTokens.shift().toLowerCase();
			let func = funcMap[token];
			let params = [];

			if (func === undefined) {
				sendMessage(
					channelId,
					'Your first argument should be a command name.'
				);
				return;
			}

			while (msgTokens.length) {
				if (funcMap[msgTokens[0]] != undefined) {
					break;
				}
				params = params.concat([msgTokens.shift()]);
			}

			await func(params);
		}
	} catch (error) {
		console.error(error);
	}
});

app.event('app_home_opened', async ({ event, client, context }) => {
	try {
		/* view.publish is the method that your app uses to push a view to the Home tab */
		const result = await client.views.publish({
			/* the user that opened your app's app home */
			user_id: event.user,

			/* the view object that appears in the app home*/
			view: {
				type: 'home',
				callback_id: 'home_view',

				/* body of the view */
				blocks: [
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text: "*Welcome to your _App's Home_* :tada:",
						},
					},
					{
						type: 'divider',
					},
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text: "This button won't do much for now but you can set up a listener for it using the `actions()` method and passing its unique `action_id`. See an example in the `examples` folder within your Bolt app.",
						},
					},
					{
						type: 'actions',
						elements: [
							{
								type: 'button',
								text: {
									type: 'plain_text',
									text: 'Click me!',
								},
							},
						],
					},
				],
			},
		});
	} catch (error) {
		console.error(error);
	}
});

app.start(3000).then(() => {
	console.log('i am running!');
});
