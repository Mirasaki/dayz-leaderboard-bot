const logger = require('@mirasaki/logger');
const cftSDK = require('cftools-sdk');

// Destructure our environmental variables
const {
  CFTOOLS_SERVER_API_ID,
  CFTOOLS_API_SECRET,
  CFTOOLS_API_APPLICATION_ID
} = process.env;

// export our CFTools client as unnamed default
module.exports = new cftSDK.CFToolsClientBuilder()
  .withCache()
  .withServerApiId(CFTOOLS_SERVER_API_ID)
  .withCredentials(CFTOOLS_API_APPLICATION_ID, CFTOOLS_API_SECRET)
  .build();

// Get API token, valid for 24 hours, dont export function
const getAPIToken = async () => {
  // Getting our token
  let token = await fetch(
    'https://data.cftools.cloud/v1/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({
        'application_id': CFTOOLS_API_APPLICATION_ID,
        secret: CFTOOLS_API_SECRET
      }),
      headers: { 'Content-Type': 'application/json' }
    }
  );
  token = (await token.json()).token;
  return token;
};

let CFTOOLS_API_TOKEN;
const tokenExpirationMS = 1000 * 60 * 60 * 23;
module.exports.getAPIToken = async () => {
  if (!CFTOOLS_API_TOKEN) {
    CFTOOLS_API_TOKEN = await getAPIToken();
    // Update our token every 23 hours
    setInterval(async () => {
      CFTOOLS_API_TOKEN = await getAPIToken();
    }, tokenExpirationMS);
  }
  return CFTOOLS_API_TOKEN;
};

const fetchPlayerDetails = async (cftoolsId) => {
  let data;
  try {
    data = await fetch(
      `https://data.cftools.cloud/v1/server/${CFTOOLS_SERVER_API_ID}/player?cftools_id=${cftoolsId}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${await getAPIToken()}` }
      }
    );
    data = (await data.json());
    return data;
  } catch (err) {
    logger.syserr('Error encounter fetching player information');
    logger.printErr(err);
    return err;
  }
};
module.exports.fetchPlayerDetails = fetchPlayerDetails;
