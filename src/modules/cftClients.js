const cftSDK = require('cftools-sdk');

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
