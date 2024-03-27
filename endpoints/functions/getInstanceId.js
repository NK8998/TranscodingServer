const { exec } = require("child_process");
let instanceId;

const getInstanceId = () => {
  return new Promise((resolve, reject) => {
    const command =
      'curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" && curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id';
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        reject(error);
      } else {
        resolve(stdout.trim());
        instanceId = stdout.trim();
      }
    });
  });
};

const retrieveInstanceId = () => {
  return instanceId;
};

module.exports = { getInstanceId, retrieveInstanceId };
