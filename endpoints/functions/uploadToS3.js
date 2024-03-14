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

const uploadChunks = async (videoPathDir, title) => {
  const chunksDirectory = `${videoPathDir}/MPDOutput`;
  async function uploadFile(filePath, destinationPath, mpd) {
    const fileData = fs.readFileSync(filePath);

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: destinationPath,
      Body: fileData,
      PartSize: 5 * 1024 * 1024,
      useAccelerateEndpoint: true, // Set to true if using the S3 Accelerate endpoint
    };

    try {
      const uploadResponse = await s3.upload(params).promise();

      if (mpd) {
        const mpdUrl = uploadResponse.Location;
        return mpdUrl;
      }
    } catch (err) {
      console.error("Error uploading file:", err.message);
      return null;
    }
  }

  try {
    const files = await fs.promises.readdir(chunksDirectory);

    // Filter out .mpd files
    const mpdFiles = files.filter((file) => file.endsWith(".mpd"));

    if (mpdFiles.length === 0) {
      console.log("No .mpd files found in the directory.");
      return;
    }

    // Upload the first .mpd file found
    const mpdFile = mpdFiles[0];
    const mpdFilePath = path.join(chunksDirectory, mpdFile);
    const destinationPath = `${title}/chunks/${mpdFile}`;
    let mpd = true;
    const mpdUrl = await uploadFile(mpdFilePath, destinationPath, mpd);

    // Create an array of promises for concurrent uploads
    mpd = false;
    const uploadPromises = files
      .filter((file) => !file.endsWith(".mpd"))
      .map((file) => {
        const filePath = path.join(chunksDirectory, file);
        const destinationPath = `${title}/chunks/${file}`;
        return uploadFile(filePath, destinationPath, mpd);
      });

    // Execute concurrent uploads
    await Promise.all(uploadPromises);
    return mpdUrl;
  } catch (err) {
    console.error("Error reading directory:", err.message);
  }
};

module.exports = uploadChunks;
