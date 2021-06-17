const { App } = require('@slack/bolt');
const fs = require('fs');

const dayMap = require('./maps/dayMap.js');
const numToDay = require('./maps/numToDay.js');

const {
	getMembers,
	getChannelName,
	sendMessage,
	scheduleMessage,
	deleteScheduledMessage,
} = require('./slack/message.js');

const signingSecret = process.env['signingSecret'];
const token = process.env['token'];
const channel = process.env['channelId'];
const botMention = process.env['botMention'];

const app = new App({
	signingSecret: signingSecret,
	token: token,
});

// :white_check_mark:

// prints help message
const help = async () => {
	console.log('++ Start: Run `help`.');

	let message = `COMMMANDS:`;
	message += `\n\n\`help\``;
	message += `\n• displays this very message`;

	message += `\n\n\`init $dayOfWeek\``;
	message += `\n• creates the presentation group for the current channel with the specified day of week`;

	message += `\n\n\`show\``;
	message += `\n• shows the scheduling information for the current channel's presentation group`;

	message += `\n\n\`remove group1 *(group2 group3 ...)\``;
	message += `\n• removes one (or more) presentation groups with the specified name(s)`;

	message += `\n\n\`setSequence group1 @Robb *(@Sansa @Arya ...)\``;
	message += `\n• sets the core pattern of a group's presentation sequence`;
	message += `\n• this sequence of group members is used in \`enqueue\``;

	message += `\n\n\`setDayOfWeek group1 Thursdays\``;
	message += `\n• sets the day of week on which a group presents`;
	message += `\n• reminders are sent two days before your presentation, and the Monday of your two-day reminder.`;

	message += `\n\n\`enqueue group1 *(group2 group3 ...)\``;
	message += `\n• adds each group member in a group's \`sequence\` to that group's presentation schedule`;

	message += `\n\n\nMISC:`;
	message += `\n• commands are not case sensitive but their arguments are`;
	message += `\n• commands and parameters are parsed by whitespace`;
	message += `\n• this bot will only read messages in its channel that @mention the bot`;
	message += `\n• this bot will send you reminders as direct messages`;
	sendMessage(app, channel, message);
};

// initializes group json file
const init = async (event, params) => {
	// params = ["Thursdays", ... (ignored)]
	process.stdout.write('++ Start: Run `init` in the channel: ');
	console.log(event.channel);

	let channel = event.channel;
	let path = './groups/' + channel + '.json';

	if (params.length == 0 || dayMap[params[0]] === undefined) {
		sendMessage(app, channel, `Hint: \`${botMention} init Thursdays\``);
		return;
	}

	fs.access(path, fs.constants.R_OK, async (err) => {
		if (err) {
			// file DNE
			const fileJSON = {
				dayOfWeek: dayMap[params[0]],
				sequence: await getMembers(app, token, channel),
				schedule: [],
			};

			fs.writeFile(path, JSON.stringify(fileJSON, null, 2), (err) => {
				if (err) {
					sendMessage(
						app,
						channel,
						`Something went wrong while initializing the presentation group for <#${channel}>.`
					);
					console.error(err);
				} else {
					sendMessage(
						app,
						channel,
						`Successfully initialized the presentation group for <#${channel}>.`
					);
				}
			});
		} else {
			sendMessage(
				app,
				channel,
				`There already exists a presentation group for <#${channel}>.`
			);
		}
	});
};

const remove = async (event, params) => {
	// params is ignored
	process.stdout.write('++ Start: Run `remove` with the ignored params:');
	console.log(params);

	let channel = event.channel;
	let path = './groups/' + channel + '.json';
	fs.readFile(path, (err, data) => {
		if (err) {
			// file DNE
			sendMessage(
				app,
				channel,
				`There is no presentation group for <#${channel}>.` +
					`\nHint: \`${botMention} init Thursdays\``
			);
			return;
		}
		// file exists
		schedule = JSON.parse(data).schedule;
		schedule.forEach((presentation) => {
			deleteScheduledMessage(
				app,
				presentation.person.substring(2, presentation.person.length - 1),
				presentation.twoDayScheduledMessageId
			);
			deleteScheduledMessage(
				app,
				channel,
				presentation.mondayScheduledMessageId
			);
		});
		fs.unlink(path, (err) => {
			if (err) {
				sendMessage(
					app,
					channel,
					`Something went wrong while removing the presentation group for \`<#${channel}>\`.`
				);
				console.error(err);
			}
		});
		sendMessage(
			app,
			channel,
			`Successfully removed the presentation group for \`<#${channel}>\`.`
		);
	});
};

const _cleanSchedule = async (channel) => {
	process.stdout.write('++ Start: Run `_cleanSchedule` for the channel:');
	console.log(channel);

	let path = './groups/' + channel + '.json';
	return new Promise((resolve, reject) => {
		fs.readFile(path, async (err, data) => {
			if (err) {
				// file DNE
				sendMessage(
					app,
					channel,
					`An error occured while updating the schedule of <#${channel}>.`
				);
				console.error(err);
				resolve();
			} else {
				// file exists
				data = JSON.parse(data);

				// remove presentations that have passed
				let newSchedule = [];
				data.schedule.forEach((presentation) => {
					if (
						presentation.presentationTime >
						new Date().getTime() / 1000
					) {
						newSchedule.push(presentation);
					}
				});
				data.schedule = newSchedule;

				let person;
				let presentationTime;
				let twoDayTime;
				let mondayTime;
				let twoDayScheduledMessageId;
				let mondayScheduledMessageId;

				while (data.schedule.length < data.sequence.length) {
					if (data.schedule.length == 0) {
						person = data.sequence[0];
						presentationTime = new Date();
						presentationTime.setHours(13, 0, 0, 0); // 1300 GMT is 0900 EST
						while (presentationTime.getDay() != data.dayOfWeek) {
							presentationTime.setDate(
								presentationTime.getDate() + 1
							);
						}

						twoDayTime = new Date(presentationTime.getTime());
						twoDayTime.setDate(twoDayTime.getDate() - 2);

						mondayTime = new Date(presentationTime.getTime());
						while (mondayTime.getDay() != 1) {
							mondayTime.setDate(mondayTime.getDate() - 1);
						}

						presentationTime = presentationTime.getTime() / 1000;
						twoDayTime = twoDayTime.getTime() / 1000;
						mondayTime = mondayTime.getTime() / 1000;
					} else if (data.schedule.length < data.sequence.length) {
						let [lastPres] = data.schedule.slice(-1);
						person = data.sequence.concat(data.sequence[0])[
							data.sequence.indexOf(
								lastPres.person.substring(2, 13)
							) + 1
						];
						presentationTime = lastPres.presentationTime + 604800;
						twoDayTime = lastPres.twoDayTime + 604800;
						mondayTime = lastPres.mondayTime + 604800;
					} else {
						resolve();
					}

					twoDayScheduledMessageId = await scheduleMessage(
						app,
						person,
						`Psst, you have a Five Minute Presentation for <#${channel}> in two days!`,
						twoDayTime
					);

					mondayScheduledMessageId = await scheduleMessage(
						app,
						channel,
						`<@${person}> will be doing a Five Minute Presentation this week on ${numToDay[
							data.dayOfWeek
						].slice(0, -1)}!`,
						mondayTime
					);

					data.schedule.push({
						person: `<@${person}>`,
						presentationTime: presentationTime,
						twoDayTime: twoDayTime,
						mondayTime: mondayTime,

						twoDayScheduledMessageId: twoDayScheduledMessageId,
						mondayScheduledMessageId: mondayScheduledMessageId,
					});
				}
				fs.writeFile(path, JSON.stringify(data, null, 2), (err) => {
					if (err) {
						sendMessage(
							app,
							channel,
							`Something went wrong while editing \`${groupName}.\``
						);
						console.error(err);
					} else {
						resolve();
					}
				});
			}
		});
	});
};

const show = async (event, params) => {
	// params is ignored
	process.stdout.write('++ Start: Run `show` with the ignored params: ');
	console.log(params);

	let channel = event.channel;
	let path = './groups/' + channel + '.json';

	await _cleanSchedule(channel);

	fs.readFile(path, async (err, data) => {
		if (err) {
			// file DNE
			sendMessage(
				app,
				channel,
				`There is no presentation group for <#${channel}>.` +
					`\nHint: \`${botMention} init Thursdays\``
			);
		} else {
			// file exists
			let message = '';
			data = JSON.parse(data);

			message += 'DAY OF WEEK:\n';
			if (numToDay[data.dayOfWeek]) {
				message += `${numToDay[data.dayOfWeek]}\n`;
			} else {
				message += `(blank)\n`;
			}

			message += '\nSEQUENCE:\n';
			if (data.sequence.length) {
				message += data.sequence.map((member) => `<@${member}>`) + `\n`;
			} else {
				message += `(blank)\n`;
			}

			message += '\nSCHEDULE (dd/mm/yyyy):\n';
			if (data.schedule.length) {
				data.schedule.forEach((elem) => {
					let date = new Date(elem.presentationTime * 1000);
					let datestring =
						('0' + date.getDate()).slice(-2) +
						'/' +
						('0' + (date.getMonth() + 1)).slice(-2) +
						'/' +
						date.getFullYear();
					message += datestring + ' | ' + elem.person + '\n';
				});
			} else {
				message += '(blank)\n';
			}

			sendMessage(
				app,
				channel,
				`The presentation schedule for <#${channel}> is:\n\`\`\`${message}\`\`\``
			);
		}
	});
};

const funcMap = {
	init: init,
	show: show,
	remove: remove,
};

app.event('app_mention', async ({ event, client }) => {
	try {
		console.log(event.text);
		let msgTokens = event.text.split(' ');
		msgTokens.shift(); // remove the app mention

		if (msgTokens.length == 0) {
			return;
		}

		let func = funcMap[msgTokens.shift()];
		let params = [];

		if (func === undefined) {
			sendMessage(
				app,
				channel,
				'Your first argument should be a command name.'
			);
			return;
		}

		while (msgTokens.length) {
			params.push(msgTokens.shift());
		}

		func(event, params);
	} catch (err) {
		console.error(err);
	}
});

app.event('app_home_opened', async ({ event, client, context }) => {
	try {
		const result = await client.views.publish({
			user_id: event.user,

			view: {
				type: 'home',
				callback_id: 'home_view',

				blocks: [
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text: '*Weekly Presentations* :tada:',
						},
					},
					{
						type: 'divider',
					},
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text:
								'To use Weekly Presentations Bot:' +
								'\n1. Go to the workspace channel that this bot is assigned to.' +
								`\n2. Send the message \`${botMention} help\` for documentation.` +
								`\n3. For more information, visit the GitHub repo (https://github.com/kai-wei-mo/recurrent-bot).`,
						},
					},
				],
			},
		});
	} catch (err) {
		console.error(err);
	}
});

app.start(3000).then(() => {
	console.log('i am running!');
});
