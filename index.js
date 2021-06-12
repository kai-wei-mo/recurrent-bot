const { App } = require('@slack/bolt');
const fs = require('fs');
const keepAlive = require('./keepAlive.js');

const dayMap = require('./maps/dayMap.js');
const numToDay = require('./maps/numToDay.js');

const {
	sendMessage,
	scheduleMessage,
	deleteScheduledMessage,
} = require('./slack/message.js');

const signingSecret = process.env['signingSecret'];
const token = process.env['token'];
const channelId = process.env['channelId'];

const app = new App({
	signingSecret: signingSecret,
	token: token,
});

// :white_check_mark:

// prints help message
const help = async () => {
	console.log('++ Start: Run `help`.');
	sendMessage(app, channelId, 'You have cried for help!');
};

// lists all presentation groups
const list = async () => {
	console.log('++ Start: Run `list` ignoring any params.');
	fs.readdir('./groups', (err, files) => {
		if (err) {
			sendMessage(
				app,
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
		sendMessage(app, channelId, message);
	});
};

// creates empty group json file
const init = async (groups) => {
	process.stdout.write('++ Start: Run `init` with params: ');
	console.log(groups);

	if (groups.length == 0) {
		sendMessage(
			app,
			channelId,
			'Error: `init` takes one or more arguments.' +
				'\nHint: `<@U024UGA3HB2> init marketing devops ...'
		);
		return;
	}

	groups.forEach((groupName) => {
		let dir = './groups/' + groupName + '.json';
		fs.access(dir, fs.F_OK, (err) => {
			if (err) {
				// file DNE
				let fileJSON = {
					dayOfWeek: -1,
					sequence: [],
					schedule: [],
				};
				fs.writeFile(dir, JSON.stringify(fileJSON, null, 2), (err) => {
					if (err) {
						sendMessage(
							app,
							channelId,
							`Something went wrong while creating the group \`${groupName}\`.`
						);
						console.error(err);
						return;
					}
				});
				sendMessage(
					app,
					channelId,
					`Successfully created the group \`${groupName}\`.`
				);
				return;
			}
			// file exists
			sendMessage(
				app,
				channelId,
				`There already exists a group named \`${groupName}\``
			);
		});
	});
};

// deletes group json file
const remove = async (groups) => {
	process.stdout.write('++ Start: Run `remove` with params: ');
	console.log(groups);

	if (groups.length == 0) {
		sendMessage(
			app,
			channelId,
			'Error: `remove` takes one or more arguments.' +
				'\nHint: `<@U024UGA3HB2> remove house-bolton house-martell ...`'
		);
		return;
	}

	groups.forEach((groupName) => {
		let dir = './groups/' + groupName + '.json';
		fs.readFile(dir, (err, data) => {
			if (err) {
				// file DNE
				sendMessage(
					app,
					channelId,
					`The following group does not exist: \`${groupName}\`.`
				);
				return;
			}
			// file exists
			schedule = JSON.parse(data).schedule;
			schedule
				.forEach((event) => {
					deleteScheduledMessage(app, channelId, event.twoDayTime);
					deleteScheduledMessage(app, channelId, event.weeklyTime);
				})
				.then(() => {
					fs.unlink(dir, (err) => {
						if (err) {
							sendMessage(
								app,
								channelId,
								`Something went wrong while removing \`${groupName}\`.`
							);
							console.error(err);
							return;
						}
					});
					sendMessage(
						app,
						channelId,
						`Successfully removed the group \`${groupName}\`.`
					);
				});
		});
	});
};

// called by `show`
const _cleanSchedule = async (dir) => {
	fs.readFile(dir, 'utf8', (err, data) => {
		if (err) {
			console.error(err);
			return;
		}

		let fileJSON = JSON.parse(data);
		let newSchedule = [];
		fileJSON.schedule.forEach((event) => {
			if (event.presentationTime > new Date().getTime() / 1000 + 86400) {
				newSchedule.push(event);
			}
		});
		
		// order by presentation times
		newSchedule.sort((a, b) => a.presentationTime > b.presentationTime && 1 || -1);

		fileJSON.schedule = newSchedule;

		fs.writeFile(dir, JSON.stringify(fileJSON, null, 2), (err) => {
			if (err) {
				console.error(err);
				return;
			}
		});
	});
};

// sends message containing >=1 groups' schedule
const show = async (groups) => {
	process.stdout.write('++ Start: Run `show` with params: ');
	console.log(groups);

	if (groups.length == 0) {
		sendMessage(
			app,
			channelId,
			'Error: `show` takes one or more arguments.' +
				'\nHint: `<@U024UGA3HB2> show house-lannister house-baratheon ...`'
		);
		return;
	}

	groups.forEach((groupName) => {
		let dir = './groups/' + groupName + '.json';
		fs.readFile(dir, (err, data) => {
			if (err) {
				// file DNE
				sendMessage(
					app,
					channelId,
					`The following group does not exist: \`${groupName}\`.`
				);
				return;
			}
			// file exists
			let message = 'SCHEDULE:\n';
			data = JSON.parse(data);

			if (data.schedule.length != 0) {
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

			message += '\nSEQUENCE:\n';
			if (data.sequence.length) {
				message += `${JSON.stringify(data.sequence)}\n\n`;
			} else {
				message += `(blank)\n\n`;
			}

			message += 'DAY OF WEEK:\n';
			if (numToDay[data.dayOfWeek]) {
				message += `${numToDay[data.dayOfWeek]}\n`;
			} else {
				message += `(blank)\n`;
			}

			sendMessage(
				app,
				channelId,
				`The presentation schedule for \`${groupName}\` is:\n\`\`\`${message}\`\`\``
			);
		});
		_cleanSchedule(dir);
	});
};

// write the value of sequence in a group's file
const setSequence = async (args) => {
	// args = [house-stark, @arya, @sansa, ...]
	process.stdout.write('++ Start: Run `setSequence` with params: ');
	console.log(args);

	if (args.length == 0) {
		sendMessage(
			app,
			channelId,
			'Error: `setSequence` takes a group name and at least one user mention.' +
				'Hint: `<@U024UGA3HB2> setSequence house-stark @Arya @Robb ...`'
		);
		return;
	}
	const groupName = args[0];
	const groupMembers = args.slice(1, args.length);
	const dir = './groups/' + groupName + '.json';

	if (!fs.existsSync(dir)) {
		sendMessage(
			app,
			channelId,
			`There is no group named \`${groupName}\`.`
		);
		return;
	}

	if (groupMembers.length == 0) {
		sendMessage(
			app,
			channelId,
			'Please provide at least one group member.'
		);
		return;
	}

	// check every member is a mention or else we return
	for (let i = 0; i < groupMembers.length; i++) {
		let member = groupMembers[i];
		if (!(member.startsWith('<@') && member.endsWith('>'))) {
			sendMessage(
				app,
				channelId,
				'Please check that all group member arguments are *mentions*.'
			);
			return;
		}
	}

	fs.readFile(dir, 'utf8', (err, data) => {
		if (err) {
			sendMessage(
				app,
				channelId,
				`Something went wrong while editing \`${groupName}.\``
			);
			console.error(err);
			return;
		}

		let fileJSON = JSON.parse(data);
		fileJSON.sequence = groupMembers;

		fs.writeFile(dir, JSON.stringify(fileJSON, null, 2), (err) => {
			if (err) {
				sendMessage(
					app,
					channelId,
					`Something went wrong while editing \`${groupName}.\``
				);
				console.error(err);
				return;
			}
			sendMessage(
				app,
				channelId,
				`Updated sequence of the group \`${groupName}\`.` +
					`\nHint: Use \`<@U024UGA3HB2> show ${groupName}\` to see the updated schedule.`
			);
		});
	});
};

// write the value of dayOfWeek in a group's file
const setDayOfWeek = async (args) => {
	// args = [house-stark, thursday, (the rest is ignored)]
	process.stdout.write('++ Start: Run `setDayOfWeek` with params: ');
	console.log(args);

	if (args.length < 2) {
		sendMessage(
			app,
			channelId,
			'Error: `setDayOfWeek` takes a group name and a weekday.' +
				'\nHint: `<@U024UGA3HB2> setDayOfWeek house-stark Thursdays`'
		);
		return;
	}

	const groupName = args[0];
	let dayOfWeek = args[1];
	const dir = './groups/' + groupName + '.json';

	if (!fs.existsSync(dir)) {
		sendMessage(
			app,
			channelId,
			`There is no group named \`${groupName}\`.`
		);
		return;
	}

	dayOfWeek = dayMap[dayOfWeek];

	if (dayOfWeek == undefined) {
		sendMessage(app, channelId, 'Please provide a valid day of the week.');
		return;
	}

	fs.readFile(dir, 'utf8', (err, data) => {
		if (err) {
			sendMessage(
				app,
				channelId,
				`Something went wrong while editing \`${groupName}.\``
			);
			console.error(err);
			return;
		}

		let fileJSON = JSON.parse(data);
		fileJSON.dayOfWeek = dayOfWeek;

		fs.writeFile(dir, JSON.stringify(fileJSON, null, 2), (err) => {
			if (err) {
				sendMessage(
					app,
					channelId,
					`Something went wrong while editing \`${groupName}.\``
				);
				console.error(err);
				return;
			}
			sendMessage(
				app,
				channelId,
				`Updated \`DAY OF WEEK\` of the group \`${groupName}\` to be \`${numToDay[dayOfWeek]}\`.`
			);
		});
	});
};

const enqueue = async (args) => {
	// args = [groupName1, groupName2, ...]
	process.stdout.write('++ Start: Run `enqueue` with params:');
	console.log(args);

	if (args.length == 0) {
		sendMessage(
			app,
			channelId,
			'Error: `enqueue` takes one or more arguments.' +
				'\nHint: `<@U024UGA3HB2> enqueue devops`'
		);
		return;
	}

	args.forEach((groupName) => {
		const dir = './groups/' + groupName + '.json';

		if (!fs.existsSync(dir)) {
			sendMessage(
				app,
				channelId,
				`There is no group named \`${groupName}\`.`
			);
			return;
		}

		fs.readFile(dir, 'utf8', (err, data) => {
			if (err) {
				sendMessage(
					app,
					channelId,
					`Something went wrong while editing \`${groupName}.\``
				);
				console.error(err);
				return;
			}

			let fileJSON = JSON.parse(data);

			if (fileJSON.sequence.length == 0) {
				sendMessage(
					app,
					channelId,
					`There is no \`sequence\` to \`enqueue\` for the group \`${groupName}\`.`
				);
				return;
			}

			if (fileJSON.dayOfWeek == -1) {
				sendMessage(
					app,
					channelId,
					`The \`dayOfWeek\` is not specified for the group \`${groupName}\`.`
				);
				return;
			}

			let daySkip = 0;
			fileJSON.sequence.forEach((person) => {
				// determine what time reminders will be scheduled
				let twoDayReminder;
				let weeklyReminder;
				let sched = fileJSON.schedule;

				if (sched.length == 0) {
					twoDayReminder = new Date();
					twoDayReminder.setHours(13, 0, 0, 0); // 1300 GMT == 0900 EST

					while (
						(twoDayReminder.getDay() + 2) % 7 !=
						fileJSON.dayOfWeek
					) {
						twoDayReminder.setDate(
							twoDayReminder.getDate() + daySkip + 1
						);
					}

					weeklyReminder = new Date(twoDayReminder);
					weeklyReminder.setDate(
						twoDayReminder.getDate() - twoDayReminder.getDay() + 1
					);
				} else {
					twoDayReminder = new Date(
						sched[sched.length - 1].twoDayTime * 1000
					);
					weeklyReminder = new Date(
						sched[sched.length - 1].weeklyTime * 1000
					);

					twoDayReminder.setDate(
						twoDayReminder.getDate() + daySkip + 7
					);
					weeklyReminder.setDate(
						weeklyReminder.getDate() + daySkip + 7
					);
				}
				daySkip += 7;
				twoDayReminder = twoDayReminder.getTime() / 1000;
				weeklyReminder = weeklyReminder.getTime() / 1000;

				// schedule the messages
				// todo: should be PM'ed
				let twoDay_scheduled_message_id;
				let weekly_scheduled_message_id;

				(async () => {
					twoDay_scheduled_message_id = await scheduleMessage(
						app,
						channelId,
						`${person} You have a presentation in two days!`,
						twoDayReminder
					);
					weekly_scheduled_message_id = await scheduleMessage(
						app,
						channelId,
						`${person} You have a presentation this week!`,
						weeklyReminder
					);

					sched.push({
						person: person,
						twoDayTime: twoDayReminder,
						weeklyTime: weeklyReminder,
						presentationTime: twoDayReminder + 172800,
						twoDay_scheduled_message_id:
							twoDay_scheduled_message_id,
						weekly_scheduled_message_id:
							weekly_scheduled_message_id,
					});

					fs.writeFileSync(
						dir,
						JSON.stringify(fileJSON, null, 2),
						(err) => {
							if (err) {
								sendMessage(
									app,
									channelId,
									`Something went wrong while editing \`${groupName}.\``
								);
								console.error(err);
								return;
							}
						}
					);
				})();
			});
			sendMessage(
				app,
				channelId,
				`Updated the schedule of \`${groupName}\`.` +
					`\nHint: Use \`<@U024UGA3HB2> show ${groupName}\` to see the updated schedule.`
			);
		});
	});
};

const holiday = async (args) => {};

const funcMap = {
	// general
	help: help,
	list: list,
	// create/delete/read groups
	init: init,
	remove: remove,
	show: show,
	// modify details of a group
	setsequence: setSequence,
	setdayofweek: setDayOfWeek,
	enqueue: enqueue,
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
				channelId,
				'Your first argument should be a command name.'
			);
			return;
		}

		while (msgTokens.length) {
			params.push(msgTokens.shift());
		}

		func(params);
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
							text: '*Weekly Presentations Documentation* :tada:',
						},
					},
					{
						type: 'divider',
					},
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text: 'To use Weekly Presentations Bot, go to the workspace text channel designated for Weekly Presentations bot spam.',
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
	} catch (err) {
		console.error(err);
	}
});

app.start(3000).then(() => {
	console.log('i am running!');
});
