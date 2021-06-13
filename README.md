# recurrent-bot
A Slack bot for managing recurrent, patterned events.

## Slack commands

### `help`
- sends a message describing how to use each command

### `list`
- lists all presentation groups
- `@BOT list` would send a message like:
    - ```
      house-lannister
      house-stark
      house-targaryen
      ```

### `init group1 *(group2 group3 ...)`
- creates a presentation group and a correspond group json file
- `@BOT init house-foobar` would create:
    -   ```javascript
        house-foobar.json

        {
            dayOfWeek: -1,
            sequence: [],
            schedule: []
        }
        ```

### `remove group1 *(group2 group3 ...)`
- removes one (or more) presentation groups and deletes their group json files

### `show group1 *(group2 group3 ...)`
- shows the scheduling information for the specified presentation group(s)`
- `@BOT show house-stark` would send a message like:
    -   ```
        SCHEDULE (dd/mm/yyyy):
        15/06/2021 | @Arya
        19/06/2021 | @Sansa
        26/06/2021 | @Arya
        03/07/2021 | @Sansa

        SEQUENCE:
        ["@Arya", "@Sansa"]

        DAY OF WEEK:
        Tuesdays
        ```

### `setSequence groupname @user1 *(@user2 @user3 ...)`
- sets the core pattern of a group's presentation sequence to be referenced in the `enqueue` command
- users do not have to be unique
- `@BOT setSequence house-stark @Arya @Sansa @Bran` would modify `house-stark.json` to become:
    -   ```javascript
        house-stark.json

        {
            dayOfWeek: ...,
            sequence: ["@Arya", "@Sansa", "@Bran"],
            schedule: ...
        }
        ```

### `setDayOfWeek groupname dayofweek`
- sets the day of week on which a group presents
- `dayofweek` has multiple accepted forms
    - e.g. `Monday`, `Mondays`, `monday`, `mondays`, `Mon`, `mon`, `1` are all acceptable for Mondays
- `@BOT setDayOfWeek house-stark Monday` would modify `house-stark.json` to become:
    -   ```javascript
        house-stark.json
        
        {
            dayOfWeek: 1,
            sequence: ...,
            schedule: ...
        }
        ```

### `enqueue group1 *(group2 group3 ...)`
- adds each group member in a group's `sequence` to that group's presentation `schedule`
- requires that `dayOfWeek` and `sequence` have been set by the user
- for examples, see a [sample presentation group](https://github.com/kai-wei-mo/recurrent-bot/tree/main/groups)

## Other information
- commands are not case sensitive 
- arguments are case sensitive
- commands sent in Slack are parsed by whitespace
- the preferred permission configuration involves:
    - the bot will only read messages in its designated channel that also @mention the bot
    - the bot will privately message the user their reminders