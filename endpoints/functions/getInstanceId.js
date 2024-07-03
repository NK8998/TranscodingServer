const { exec } = require("child_process");
require("dotenv").config();

let instanceId;
const environment = "prod";
const getInstanceId = async () => {
  if (environment === "dev") {
    const instance_id = await new Promise((resolve, reject) => {
      instanceId = process.env.INSTANCE_ID;
      resolve(instanceId);
    });
    return instance_id;
  } else {
    const instance_id = await new Promise((resolve, reject) => {
      const command =
        'TOKEN=`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"` \
&& curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id';

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          reject(error);
        } else {
          instanceId = stdout.trim();

          resolve(stdout.trim());
        }
      });
    });
    return instance_id;
  }
};

const retrieveInstanceId = () => {
  return instanceId;
};

const getEnvironment = () => {
  return environment;
};

module.exports = { getInstanceId, retrieveInstanceId, getEnvironment };
