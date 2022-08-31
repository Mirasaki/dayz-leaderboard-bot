# DayZ Leaderboard Bot

[![GitHub license](https://img.shields.io/github/license/Mirasaki/dayz-leaderboard-bot?style=flat-square)](https://github.com/Mirasaki/dayz-leaderboard-bot/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/Mirasaki/dayz-leaderboard-bot?style=flat-square)](https://github.com/Mirasaki/dayz-leaderboard-bot/issues)
[![GitHub forks](https://img.shields.io/github/forks/Mirasaki/dayz-leaderboard-bot?style=flat-square)](https://github.com/Mirasaki/dayz-leaderboard-bot/network)
[![GitHub stars](https://img.shields.io/github/stars/Mirasaki/dayz-leaderboard-bot?style=flat-square)](https://github.com/Mirasaki/dayz-leaderboard-bot/stargazers)

A DayZ bot writting in Javascript to display your leaderboard using the CFTools Cloud API.

## Demo

Come try the bot yourself in our official [support server](https://discord.gg/jKja5FBnYf)!
![Demo](https://i.imgur.com/vzoS6cq.gif)

## Step-by-step Video Guide

The people at [Custom DayZ Services](https://discord.gg/customdayzservices) were kind enough to provide us with a step-by-step video guide/tutorial on how to set up the bot and get it online & responsive. The video is located in our [support server on Discord](https://discord.gg/jKja5FBnYf).

[Click me after joining to jump to guide!](https://discord.com/channels/793894728847720468/976508455110193152/976509263818145882)

## Technologies Used

- [discord.js-bot-template](https://github.com/Mirasaki/discord.js-bot-template)
- [CFTools Cloud API](https://wiki.cftools.de/display/CFAPI/CFTools+Cloud+API)

## Prerequisites

- [Node.js](https://nodejs.org/en/download/)
    1) Head over to the download page
    2) Download the latest LTS available for your OS
    3) Be sure to check the box that says "Automatically install the necessary tools" when you're running the installation wizard
- A [Discord Bot account](https://discord.com/developers/applications)
    1) Head over to the page linked above
    2) Click "New Application" in the top right
    3) Give it a cool name and click "Create"
    4) Click "Bot" in the left hand panel
    5) Click "Add Bot" -> "Yes, do it!"
    6) Click "Rest Token" and copy it to your clipboard, you will need it later

## Installation

1. Download the latest release [here](https://github.com/Mirasaki/dayz-leaderboard-bot/releases)
2. Extract/unzip the downloaded compressed file into a new folder
3. Open a command prompt in the project root folder/directory
    - On Windows you can type `cmd.exe` in the File Explorer path
    - Root folder structure:
      - commands/
      - local_modules/
      - .env.example
      - index.js
      - etc...
4. Run the command `npm install`
5. Copy-paste the `.env.example` file in the same directory and re-name the created file to `.env`
6. Open the `.env` file and fill in your values
    - `CLIENT_ID`: Can be grabbed by creating a new application in [your Discord Developer Portal](https://discord.com/developers/applications)
    - `DISCORD_BOT_TOKEN`: After creating your bot on the link above, navigate to `Bot` in the left-side menu to reveal your bot-token
    - `CFTOOLS_API_APPLICATION_ID`: Application ID from your [CFTools Developer Apps](https://developer.cftools.cloud/applications) - Authorization has to be granted by navigating to the `Grant URL` that's displayed in your app overview
    - `CFTOOLS_API_SECRET`: Same as above, click `Reveal Secret`
    - `CFTOOLS_SERVER_API_ID`: Click `Manage Server` in your [CF Cloud Panel](https://app.cftools.cloud/dashboard) > `Settings` > `API Key` > `Server ID`
7. Add the bot to your server by using the following link: (Replace CLIENT-ID with your CLIENT_ID from before) <https://discord.com/api/oauth2/authorize?client_id=CLIENT-ID&permissions=0&scope=bot%20applications.commands>
8. Run the command `node .` in the project root folder/directory or `npm run start` if you have [PM2](https://pm2.keymetrics.io/) installed to keep the process alive.

### FAQ

#### How do I create the Discord bot account?

Check out [this video](https://www.youtube.com/watch?v=ibtXXoMxaho) by [The Coding Train](https://www.youtube.com/channel/UCvjgXvBlbQiydffZU7m1_aw)

#### Is any specific set-up required to use this?

Yes. Your DayZ server has to be connected to the [CFTools Cloud API](https://wiki.cftools.de/display/CFAPI/CFTools+Cloud+API) and needs the [GameLabs integration](https://steamcommunity.com/sharedfiles/filedetails/?id=2464526692) mod.

## License

[MIT](https://choosealicense.com/licenses/mit/)
