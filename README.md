
# WoW LFG Discord Bot

An invitable Discord bot to manage groups for Normal, Heroic, Mythic and Mythic+ level dungeons as well as Delves.




## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`PROD_MONGO_URI`

`DISCORD_BOT_TOKEN`

`DISCORD_BOT_APP_ID`

`GUILD_ID`

`LOGTAIL_SOURCE_TOKEN`
## Deployment

To deploy this project run:

```bash
npm install
npm i -g ts-node
npx ts-node app.ts
```

This project does have a Dockerfile but that is currently bugged


## Features

- `/lfg` Discord channel command
- Sign up as a role of Dps, Healer, or Tank
- Ability to add Lust, Battle Res, or Note
- Set a start date that is timezone agnostic
- Ability to clear role
- Mentions roles for Dps, Healer, Tank, or Dungeon Type

## Future Features

- `/lf-` specific commands for dungeon types
- Update embed to not have role Mentions
- Validation of properties of the run, for example only M+ has a key level
## Authors

- [@cxm6467](https://www.github.com/cxm6467)


## Acknowledgements

 - Project derived from: [MythicMate](https://github.com/Beel12213/MythicMate)

