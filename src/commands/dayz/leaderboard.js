const logger = require('@mirasaki/logger');
const { Statistic } = require('cftools-sdk');
const { stripIndents } = require('common-tags/lib');
const cftClient = require('../../modules/cftClient');
const { parseSnakeCaseArray, colorResolver } = require('../../util');

// Include our blacklist file
const leaderboardBlacklist = require('../../../config/blacklist.json');

// Destructure from our process env
const {
  DEBUG_LEADERBOARD_API_DATA,
  NODE_ENV,
  CFTOOLS_API_PLAYER_DATA_COUNT
} = process.env;

// Mapping our leaderboard stat options
const statMap = {
  DEATHS: Statistic.DEATHS,
  KILLS: Statistic.KILLS,
  KILL_DEATH_RATIO: Statistic.KILL_DEATH_RATIO,
  LONGEST_KILL: Statistic.LONGEST_KILL,
  LONGEST_SHOT: Statistic.LONGEST_SHOT,
  PLAYTIME: Statistic.PLAYTIME,
  SUICIDES: Statistic.SUICIDES
};

// Mapping our emojis
const emojiMap = {
  1: '👑',
  2: ':two:',
  3: ':three:',
  4: ':four:',
  5: ':five:',
  6: ':six:',
  7: ':seven:',
  8: ':eight:',
  9: ':nine:'
};

// Mapping our Interaction Command API options
const { statOptions } = require('../../../config/config.json');
const activeStatisticOptions = [
  { name: 'Overall', value: 'OVERALL' },
  { name: 'Kills', value: 'KILLS' },
  { name: 'Kill Death Ratio', value: 'KILL_DEATH_RATIO' },
  { name: 'Longest Kill', value: 'LONGEST_KILL' },
  { name: 'Playtime', value: 'PLAYTIME' },
  { name: 'Longest Shot', value: 'LONGEST_SHOT' },
  { name: 'Deaths', value: 'DEATHS' },
  { name: 'Suicides', value: 'SUICIDES' }
].filter((e) => statOptions.includes(e.value));

module.exports = {
  // Defining our Discord Application Command API data
  // Name is generated from the file name if left undefined
  data: {
    description: 'Display your DayZ Leaderboard',
    options: [
      {
        name: 'type',
        description: 'The type of leaderboard to display',
        type: 3, // STRING
        required: false,
        choices: activeStatisticOptions
      }
    ]
  },

  config: {
    // Setting a cooldown to avoid abuse
    // Allowed 2 times every 10 seconds per user
    cooldown: {
      usages: 7,
      duration: 60
    }
  },

  run: async ({ client, interaction }) => {
    // Destructure from our Discord interaction
    const { member, guild, options } = interaction;
    const { emojis } = client.container;

    // Assigning our stat variable
    const statToGet = options.getString('type') || 'OVERALL';
    let mappedStat = statMap[statToGet];

    // Deferring our interaction
    // due to possible API latency
    await interaction.deferReply();

    // Default
    // No option provided OR
    // 'overall' option specified
    const isDefaultQuery = !statToGet || statToGet === 'OVERALL';
    if (isDefaultQuery) {
      mappedStat = Statistic.KILLS;
    }

    // Getting our player data count
    let playerLimit = Number(CFTOOLS_API_PLAYER_DATA_COUNT);
    if (
      isNaN(playerLimit)
      || playerLimit < 10
      || playerLimit > 25
    ) {
      // Overwrite the provided player limit back to default if invalid
      playerLimit = 15;
    }

    let res;
    try {
      // Fetching our leaderboard data from the CFTools API
      res = await cftClient
        .getLeaderboard({
          order: 'ASC',
          statistic: mappedStat,
          limit: 100
        });
    } catch (err) {
      // Properly logging the error if it is encountered
      logger.syserr('Encounter an error while fetching leaderboard data');
      logger.printErr(err);

      // Notify the user
      // Include debug in non-production environments
      interaction.editReply({
        content: `${emojis.error} ${member}, something went wrong. Please try again later.${
          NODE_ENV === 'production'
            ? ''
            : `\n\n||${err.stack || err}||`
        }`
      });

      // Returning the request
      return;
    }

    // Additional debug logging if requested
    if (DEBUG_LEADERBOARD_API_DATA === 'true') {
      logger.startLog('LEADERBOARD API DATA');
      console.table(res.map((entry) => {
        return {
          name: entry.name,
          rank: entry.rank,
          kills: entry.kills,
          deaths: entry.deaths,
          playtime: entry.playtime,
          hits: entry.hits,
          envDeaths: entry.environmentDeaths,
          suicides: entry.suicides,
          lk: entry.longestKill,
          ls: entry.longestShot
        };
      }));
      logger.endLog('LEADERBOARD API DATA');
    }

    // Check if any data is actually present
    if (res.length === 0) {
      interaction.editReply({
        content: `${emojis.error} ${member}, we don't have any data for that statistic yet.`
      });
      return;
    }

    // Filter out our blacklisted ids/entries
    const whitelistedData = res.filter((e) => !leaderboardBlacklist.includes(e.id.id));

    // Constructing our embed onject
    const lbEmbedData = buildLeaderboardEmbed(guild, whitelistedData, isDefaultQuery, statToGet, mappedStat, playerLimit);

    // Responding to our request
    interaction.editReply({
      embeds: lbEmbedData
    });
  }
};

// Dedicated function for building our embed data
const buildLeaderboardEmbed = (guild, res, isDefaultQuery, statToGet, mappedStat, playerLimit) => {
  // Initializing our embed vars
  let description = '';
  let fields = [];

  // Resolve fields for OVERALL leaderboard
  if (isDefaultQuery) {
    description = `Overall Leaderboard for ${guild.name}`;
    fields = res.map((e, index) => {
      const noEmojiFallback = `${(index + 1).toString()}.`;
      return {
        name: `${emojiMap[index + 1] || noEmojiFallback} ${e.name}`,
        value: stripIndents`
            Kills: **${e.kills}**
            Deaths: **${e.deaths}**
            KD: **${e.killDeathRation}**
            LK: **${e.longestKill}m**
          `,
        inline: true
      };
    });
  }

  // Resolve fields for Statistic leaderboard
  else {
    const parameterMap = {
      'kdratio': 'killDeathRation',
      'longest_kill': 'longestKill',
      'longest_shot': 'longestShot'
    };
    const appendMap = {
      'kdratio': ' k/d',
      'longest_kill': 'm',
      'longest_shot': 'm',
      'kills': ' kills',
      'deaths': ' deaths',
      'suicides': ' suicides'
    };
    description = `${parseSnakeCaseArray([statToGet]).toUpperCase()} Leaderboard for ${guild.name}`;
    fields = res.map((e, index) => {
      return {
        name: `${(index + 1).toString()}. ${e.name}`,
        value: `\`\`\`${
          mappedStat === 'playtime'
            ? stripIndents`
                ${Math.floor(e.playtime / 60 / 60)} hours
                ${Math.floor((e.playtime / 60 ) % 60)} minutes
              `
            : e[parameterMap[mappedStat] || statToGet.toLowerCase()]
        }${appendMap[mappedStat] || ''}\`\`\``,
        inline: true
      };
    });
  }


  // Defining limits and sizes
  const embeds = [];
  const embedFieldLimit = 25;
  const maxPageCharSeize = 6000;
  const LAST_EMBED_FOOTER_TEXT = 'Did you know, you can use /stats <id> to display detailed information on a player?\nYou can find someone\'s CFTools id on their CFTools Cloud account page';

  // Variables that reset in next loop
  let currentPage = [];
  let charCount = description.length + LAST_EMBED_FOOTER_TEXT.length; // Account for all scenarios

  // Iteration loop that will check if current data can be added
  // to existing page, or create a new one if we would exceed
  // and API limits
  for (let i = 0; i < fields.length; i++) {
    // Definitions
    const currentEntry = fields[i];
    const entryLength = currentEntry.name.length + currentEntry.value.length;
    const newCharCount = charCount + entryLength;

    // Create a new page if adding this entry would cause
    // us to go over allowed maximums
    if (
      currentPage.length === embedFieldLimit
      || newCharCount >= maxPageCharSeize
    ) {
      embeds.push({
        fields: currentPage,
        color: colorResolver(),
        author: {
          name: description,
          iconURL: guild.iconURL({ dynamic: true })
        }
      });

      // Create a new page
      charCount = description.length + LAST_EMBED_FOOTER_TEXT.length;
      currentPage = [];
    }

    // Fits in the character limit
    charCount += entryLength;
    currentPage.push(currentEntry);
  }

  // Push the left-over data into the embed collection
  if (currentPage[0]) {
    embeds.push({
      fields: currentPage,
      color: colorResolver(),
      author: {
        name: description,
        iconURL: guild.iconURL({ dynamic: true })
      }
    });
  }

  // Appending title & meta to first embed
  embeds[0].author = {
    name: description,
    iconURL: guild.iconURL({ dynamic: true })
  };

  // Appending the footer to the last embed
  embeds[embeds.length - 1].footer = Math.random() < 0.7
    ? ({ text: LAST_EMBED_FOOTER_TEXT })
    : null;

  return embeds;
};
module.exports.buildLeaderboardEmbed = buildLeaderboardEmbed;
