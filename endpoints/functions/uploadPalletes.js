const AWS = require("aws-sdk");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
AWS.config.update({ region: "ap-south-1" });

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  maxRetries: 10, // Maximum number of retry attempts for failed requests
  httpOptions: {
    timeout: 120000, // Request timeout in milliseconds
  },
});

const uploadPalletes = async (videoPathDir, title) => {
  const palletesDir = `${videoPathDir}/compressedPalletes`;
  let palleteUrls = {};

  async function uploadFile(filePath, destinationPath, i) {
    const fileData = fs.readFileSync(filePath);

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: destinationPath,
      Body: fileData,
      PartSize: 5 * 1024 * 1024,
      useAccelerateEndpoint: true, // Set to true if using the S3 Accelerate endpoint
    };

    try {
      await s3.upload(params).promise();
      const palleteUrl = `${process.env.CLOUDFRONT_URL}/${destinationPath}`;
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
