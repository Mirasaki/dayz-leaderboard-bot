// Imports
const chalk = require('chalk');
const logger = require('@mirasaki/logger');
const { buildLeaderboardEmbedMessages } = require('../commands/dayz/leaderboard');
const leaderboardBlacklist = require('../../config/blacklist.json');
const cftClients = require('./cftClients');

// Getting our servers config
const serverConfig = require('../../config/servers.json')
  .filter(
    ({ CFTOOLS_SERVER_API_ID, name }) =>
      name !== ''
      && CFTOOLS_SERVER_API_ID !== ''
  );

// Definitions
const MS_IN_TWO_WEEKS = 1000 * 60 * 60 * 24 * 14;

// The function that runs on every interval
const autoLbCycle = async (client) => {
  for (const serverCfg of serverConfig) {
    // Skip if disabled
    if (!serverCfg.AUTO_LB_ENABLED) {
      logger.info(`Automatic leaderboard posting disabled for "${serverCfg.name}", skipping initialization`);
      continue;
    }

    // Schedule according to interval
    const autoLbInterval = serverCfg.AUTO_LB_INTERVAL_IN_MINUTES * 60 * 1000;
    performAutoLb(client, serverCfg)
      .then(() => setInterval(() => performAutoLb(client, serverCfg), autoLbInterval));
  }
};
module.exports.autoLbCycle = autoLbCycle;

const performAutoLb = async (client, {
  name,
  AUTO_LB_CHANNEL_ID,
  AUTO_LB_REMOVE_OLD_MESSAGES,
  AUTO_LB_PLAYER_LIMIT
}) => {
  // Resolve the automatic leaderboard channel and stop if it's not available
  const autoLbChannel = await getAutoLbChannel(client, AUTO_LB_CHANNEL_ID);
  if (!autoLbChannel) {
    logger.syserr(`The automatic leaderboard module is enabled, but the channel (${chalk.green(AUTO_LB_CHANNEL_ID)}) can't be found/resolved.`);
    return;
  }

  // Clean our old messages (going back 2 weeks) from the channel
  // If requested - truthy value
  if (AUTO_LB_REMOVE_OLD_MESSAGES) await cleanChannelClientMessages(client, autoLbChannel);

  // Fetch Leaderboard API data
  let res;
  try {
    // Fetching our leaderboard data from the CFTools API
    res = await cftClients[name]
      .getLeaderboard({
        order: 'ASC',
        statistic: 'kills',
        limit: 100
      });
  } catch (err) {
    // Properly logging the error if it is encountered
    logger.syserr(`Encounter an error while fetching leaderboard data for "${name}" automatic-leaderboard posting`);
    logger.printErr(err);
    return;
  }

  // Resolve leaderboard display player limit
  // Getting our player data count
  let playerLimit = Number(AUTO_LB_PLAYER_LIMIT);
  if (
    isNaN(playerLimit)
    || playerLimit < 10
    || playerLimit > 100
  ) {
    // Overwrite the provided player limit back to default if invalid
    playerLimit = 100;
  }

  // Build the leaderboard embed
  const whitelistedData = res.filter((e) => !leaderboardBlacklist.includes(e.id.id));
  const lbEmbedMessages = buildLeaderboardEmbedMessages(autoLbChannel.guild, whitelistedData, true, 'OVERALL', 'overall', playerLimit);

  for await (const lbEmbed of lbEmbedMessages) {
    // Send the leaderboard data to configured channel
    await autoLbChannel.send({
      embeds: lbEmbed
    });
  }

};
module.exports.performAutoLb = performAutoLb;

// Resolves the configured auto-leaderboard channel from process environment
const getAutoLbChannel = async (client, AUTO_LB_CHANNEL_ID) => {
  if (
    typeof AUTO_LB_CHANNEL_ID === 'undefined'
    || AUTO_LB_CHANNEL_ID.length < 1
    || !AUTO_LB_CHANNEL_ID.match(/^\d+$/)
  ) return null;
  else return await client.channels.fetch(AUTO_LB_CHANNEL_ID);
};
module.exports.getAutoLbChannel = getAutoLbChannel;

// Cleans all client-user messages from given channel
const cleanChannelClientMessages = async (client, channel) => {
  const timestampTwoWeeksAgo = Date.now() - MS_IN_TWO_WEEKS;
  try {
    await channel.bulkDelete(
      (await channel.messages.fetch({ limit: 100 }))
        .filter(
          (msg) => msg.author.id === client.user.id // Check client messages
          && msg.createdTimestamp > timestampTwoWeeksAgo // Check 2 weeks old - API limitation
        )
    );
  } catch (err) {
    // Properly log unexpected errors
    logger.syserr(`Something went wrong while cleaning channel (${chalk.green(channel.name)}) from client messages:`);
    console.error(err);
  }
};
module.exports.cleanChannelClientMessages = cleanChannelClientMessages;
