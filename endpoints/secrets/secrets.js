const AWS = require("aws-sdk");
require("dotenv").config();

AWS.config.update({ region: "ap-south-1" });
// Create a Secrets Manager client
const secretsManager = new AWS.SecretsManager({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

let secrets = null;

// Function to retrieve secret
const getSecretValue = async (secretName) => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await secretsManager
        .getSecretValue({ SecretId: secretName })
        .promise();
      resolve(JSON.parse(data?.SecretString));
    } catch (err) {
      reject(err);
      console.error(
        "Error retrieving secret:",
        err.message
      );
      throw err;
    }
  });
};

async function getSecrets() {
  if (!secrets) {
    const secretString = await getSecretValue(
      "hive_credentials"
    );
    secrets = secretString;
  }

  return secrets;
}

module.exports = getSecrets;
