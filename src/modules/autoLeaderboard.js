// Imports
const chalk = require('chalk');
const logger = require('@mirasaki/logger');
const { buildLeaderboardEmbed } = require('../commands/dayz/leaderboard');
const leaderboardBlacklist = require('../../config/blacklist.json');
const cftClient = require('./cftClient');

// Definitions
const MS_IN_TWO_WEEKS = 1000 * 60 * 60 * 24 * 14;
const {
  AUTO_LB_ENABLED,
  AUTO_LB_CHANNEL_ID,
  AUTO_LB_INTERVAL_IN_MINUTES,
  AUTO_LB_REMOVE_OLD_MESSAGES,
  AUTO_LB_PLAYER_LIMIT
} = process.env;
const autoLbInterval = AUTO_LB_INTERVAL_IN_MINUTES * 60 * 1000;

// Export the auto-leaderboard module
// All additional used functions are exported as well
module.exports = async (client) => {
  // Stop if the module isn't enabled
  if (AUTO_LB_ENABLED !== 'true') {
    logger.info('Automatic leaderboard posting disabled, skipping initialization');
    return;
  }

  // Resolve the automatic leaderboard channel and stop if it's not available
  const autoLbChannel = await getAutoLbChannel(client);
  if (!autoLbChannel) {
    logger.syserr(`The automatic leaderboard module is enabled, but the channel (${chalk.green(AUTO_LB_CHANNEL_ID)}) can't be found/resolved.`);
    return;
  }

  // Schedule this function on the predefined interval
  // After it executes once
  autoLbCycle(client, autoLbChannel)
    .then(() => setInterval(() => autoLbCycle(client, autoLbChannel), autoLbInterval));
};

// The function that runs on every interval
const autoLbCycle = async (client, autoLbChannel) => {
  // Clean our old messages (going back 2 weeks) from the channel
  // If requested
  if (AUTO_LB_REMOVE_OLD_MESSAGES === 'true') {
    await cleanChannelClientMessages(client, autoLbChannel);
  }

  // Fetch Leaderboard API data
  let res;
  try {
    // Fetching our leaderboard data from the CFTools API
    res = await cftClient
      .getLeaderboard({
        order: 'ASC',
        statistic: 'kills',
        limit: 100
      });
  } catch (err) {
    // Properly logging the error if it is encountered
    logger.syserr('Encounter an error while fetching leaderboard data for automatic-leaderboard posting');
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
  const lbEmbedData = buildLeaderboardEmbed(autoLbChannel.guild, whitelistedData, true, 'OVERALL', 'overall', playerLimit);

  // Send the leaderboard data to configured channel
  await autoLbChannel.send({
    embeds: lbEmbedData
  });
};
module.exports.autoLbCycle = autoLbCycle;

// Resolves the configured auto-leaderboard channel from process environment
const getAutoLbChannel = async (client) => await client.channels.fetch(AUTO_LB_CHANNEL_ID);
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
