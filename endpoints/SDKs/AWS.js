const AWS = require("aws-sdk");
const getSecrets = require("../secrets/secrets");

const AWSServices = async () => {
  const secrets = await getSecrets();

  // Global AWS SDK configuration
  AWS.config.update({
    accessKeyId: secrets.AWS_ACCESS_KEY_ID,
    secretAccessKey: secrets.AWS_SECRET_ACCESS_KEY,
    region: "ap-south-1",
    maxRetries: 10, // Maximum number of retry attempts for failed requests
    httpOptions: {
      timeout: 120000, // Request timeout in milliseconds
    },
  });

  // Create and return service clients
  const s3 = new AWS.S3();
  const ec2 = new AWS.EC2();

  return { s3, ec2 };
};

module.exports = AWSServices;
