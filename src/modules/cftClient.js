const cftSDK = require('cftools-sdk');

// Destructure our environmental variables
const {
  CFTOOLS_SERVER_API_ID,
  CFTOOLS_API_SECRET,
  CFTOOLS_API_APPLICATION_ID
} = process.env;

// export our CFTools client as unnamed default
module.exports = new cftSDK.CFToolsClientBuilder()
  .withServerApiId(CFTOOLS_SERVER_API_ID)
  .withCredentials(CFTOOLS_API_APPLICATION_ID, CFTOOLS_API_SECRET)
  .build();
