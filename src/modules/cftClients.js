const logger = require('@mirasaki/logger');
const cftSDK = require('cftools-sdk');
const fetch = require('cross-fetch');

// Initializing our clients object
const clients = {};

// Destructure our environmental variables
const {
  CFTOOLS_API_SECRET,
  CFTOOLS_API_APPLICATION_ID
} = process.env;

// Getting our servers config
const serverConfig = require('../../config/servers.json')
  .filter(
    ({ CFTOOLS_SERVER_API_ID, name }) =>
      name !== ''
      && CFTOOLS_SERVER_API_ID !== ''
  );

// Creating a unique client for every entry
for (const { CFTOOLS_SERVER_API_ID, name } of serverConfig) {
  clients[name] = new cftSDK.CFToolsClientBuilder()
    .withCache()
    .withServerApiId(CFTOOLS_SERVER_API_ID)
    .withCredentials(CFTOOLS_API_APPLICATION_ID, CFTOOLS_API_SECRET)
    .build();
}

// export our CFTools clients as unnamed default
module.exports = clients;

// Get API token, valid for 24 hours, don't export function
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

const fetchPlayerDetails = async (cftoolsId, CFTOOLS_SERVER_API_ID = null) => {
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

const getCftoolsId = async (id) => {
  let data;
  try {
    data = await fetch(
      `https://data.cftools.cloud/v1/users/lookup?identifier=${id}`,
      { headers: { Authorization: `Bearer ${await getAPIToken()}` } }
    );
    data = (await data.json());
    return 'cftools_id' in data ? data.cftools_id : undefined;
  } catch (err) {
    logger.syserr('Error encounter fetching cftools id');
    logger.printErr(err);
    return err;
  }
};
module.exports.getCftoolsId = getCftoolsId;
