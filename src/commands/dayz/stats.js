const logger = require('@mirasaki/logger');
const { stripIndents } = require('common-tags/lib');
const { fetchPlayerDetails, getCftoolsId } = require('../../modules/cftClient');
const { colorResolver, titleCase } = require('../../util');
const steamIdRegex = /^[0-9]+$/g;

const { DEBUG_STAT_COMMAND_DATA } = process.env;

module.exports = {
  data: {
    description: 'Display information for a specific player',
    options: [
      {
        type: 3, // STRING,
        name: 'identifier',
        description: 'The player\'s Steam64 ID or CFTools Cloud ID',
        required: true
      }
    ]
  },

  config: {
    cooldown: {
      usages: 10,
      duration: 60
    }
  },

  // eslint-disable-next-line sonarjs/cognitive-complexity
  run: async ({ client, interaction }) => {
    // Destructuring and assignments
    const { options } = interaction;
    const identifier = options.getString('identifier');

    // Deferring our reply
    await interaction.deferReply();

    // Reduce cognitive complexity
    // tryPlayerData replies to interaction if anything fails
    const data = await tryPlayerData(client, interaction, identifier);
    if (!data) return;

    // Data is delivered as on object with ID key parameters
    const stats = data[identifier];
    if (!stats) {
      interaction.editReply({
        content: `${client.container.emojis.error} ${interaction.member}, no data belonging to **\`${identifier}\`** was found.`
      });
      return;
    }

    // Detailed, conditional debug logging
    if (DEBUG_STAT_COMMAND_DATA === 'true') {
      logger.startLog('STAT COMMAND DATA');
      console.dir(stats, { depth: Infinity });
      logger.endLog('STAT COMMAND DATA');
    }

    // Assigning our stat variables
    const { omega, game } = stats;
    const { general } = game;
    const hoursPlayed = Math.round(omega.playtime / 60 / 60);
    const remainingMinutesPlayed = Math.round(omega.playtime % 60);
    const playSessions = omega.sessions;
    const averagePlaytimePerSession = Math.round(
      ((hoursPlayed * 60)
      + remainingMinutesPlayed)
      / playSessions
    );
    const [
      day, month, date, year, time, timezone
    ] = `${new Date(stats.updated_at)}`.split(' ');
    let favoriteWeaponName = 'Knife';
    const highestKills = Object.entries(general?.weapons || {}).reduce((acc, [weaponName, weaponStats]) => {
      const weaponKillsIsLower = acc > weaponStats.kills;
      if (!weaponKillsIsLower) favoriteWeaponName = weaponName;
      return weaponKillsIsLower ? acc : weaponStats.kills;
    }, 0);
    const cleanedWeaponName = titleCase(favoriteWeaponName.replace(/_/g, ' '));

    // Reversing the name history array so the latest used name is the first item
    omega.name_history.reverse();

    // Returning our detailed player information
    interaction.editReply({
      embeds: [
        {
          color: colorResolver(),
          title: `Stats for ${omega.name_history[0] || 'Survivor'}`,
          description: stripIndents`
            Survivor has played for ${hoursPlayed} hours and ${remainingMinutesPlayed} minutes over ${playSessions} total sessions.
            Bringing them to an average of ${!isNaN(averagePlaytimePerSession) ? averagePlaytimePerSession : 'n/a'} minutes per session.

            **Name History:** **\`${omega.name_history.slice(0, 10).join('`**, **`') || 'None'}\`**

            **Deaths:** ${general?.deaths || 0}
            **Hits:** ${general?.hits || 0}
            **KDRatio:** ${general?.kdratio || 0}
            **Kills:** ${general?.kills || 0}
            **Longest Kill:** ${general?.longest_kill || 0} m
            **Longest Shot:** ${general?.longest_shot || 0} m
            **Suicides:** ${general?.suicides || 0}
            **Favorite Weapon:** ${cleanedWeaponName || 'Knife'} with ${highestKills || 0} kills
          `,
          footer: {
            text: `Last action: ${time} | ${day} ${month} ${date} ${year} ${time} (${timezone})`
          }
        }
      ]
    });
  }
};

const tryPlayerData = async (client, interaction, identifier) => {
  const { emojis } = client.container;
  const { member } = interaction;

  // Transform the identifier if a steam64 is provided
  const isSteamId = steamIdRegex.test(identifier);
  if (isSteamId) {
    const cftoolsId = await getCftoolsId(identifier);
    identifier = cftoolsId || identifier;
  }

  // fetching from API
  let data;
  try {
    data = await fetchPlayerDetails(identifier);
  } catch (err) {
    interaction.editReply({
      content: `${emojis.error} ${member}, encountered an error while fetching data, please try again later.`
    });
    return undefined;
  }

  // Invalid ID or no access granted
  if (data.status === false) {
    interaction.editReply({
      content: `${emojis.error} ${member}, either the ID you provided is invalid or that player isn't currently known to the client. This command has been cancelled.`
    });
    return undefined;
  }

  return data;
};


