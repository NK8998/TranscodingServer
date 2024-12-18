const AWS = require("aws-sdk");
const path = require("path");
const fs = require("fs");
const getSecrets = require("../secrets/secrets");
const AWSServices = require("../SDKs/AWS");
require("dotenv").config();

const uploadPalletes = async (videoPathDir, title) => {
  const palletesDir = `${videoPathDir}/compressedPalletes`;
  let palleteUrls = {};

  const secrets = await getSecrets();

  const { s3 } = await AWSServices();
  async function uploadFile(filePath, destinationPath, i) {
    const fileData = fs.readFileSync(filePath);

    const params = {
      Bucket: secrets.AWS_PROCESSED_BUCKET,
      Key: destinationPath,
      Body: fileData,
      PartSize: 5 * 1024 * 1024,
      useAccelerateEndpoint: true, // Set to true if using the S3 Accelerate endpoint
    };

    try {
      await s3.upload(params).promise();
      const palleteUrl = `${secrets.CLOUDFRONT_URL_VIDEO_DATA}/${destinationPath}`;
      console.log(palleteUrl);
      return palleteUrl;
    } catch (err) {
      console.error("Error uploading file:", err.message);
      return null;
    }
  }

  const files = await fs.promises.readdir(palletesDir);
  const uploadPromises = files.map((file, i) => {
    const filePath = path.join(palletesDir, file);
    const destination = `${title}/palletes/${file}`;
    return uploadFile(filePath, destination, i);
  });

  const urls = await Promise.all(uploadPromises);
  urls.forEach((url, i) => {
    const palleteNum = `palleteUrl-${i}`;
    palleteUrls[palleteNum] = url;
  });

  return palleteUrls;
};

module.exports = uploadPalletes;
