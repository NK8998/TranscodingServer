const path = require("path");
const fs = require("fs");
const getSecrets = require("../secrets/secrets");
const AWSServices = require("../SDKs/AWS");
require("dotenv").config();

const uploadChunks = async (videoPathDir, title) => {
  const chunksDirectory = `${videoPathDir}/MPDOutput`;
  async function uploadFile(
    filePath,
    destinationPath,
    mpd
  ) {
    const secrets = await getSecrets();

    const { s3 } = await AWSServices();
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
      if (mpd) {
        const mpdUrl = `${secrets.CLOUDFRONT_URL_VIDEO_DATA}/${destinationPath}`;
        return mpdUrl;
      }
    } catch (err) {
      console.error("Error uploading file:", err.message);
      return null;
    }
  }

  try {
    const files = await fs.promises.readdir(
      chunksDirectory
    );

    // Filter out .mpd files
    const mpdFiles = files.filter((file) =>
      file.endsWith(".mpd")
    );

    if (mpdFiles.length === 0) {
      console.log("No .mpd files found in the directory.");
      return;
    }

    // Upload the first .mpd file found
    const mpdFile = mpdFiles[0];
    const mpdFilePath = path.join(chunksDirectory, mpdFile);
    const destinationPath = `${title}/chunks/${mpdFile}`;
    let mpd = true;
    const mpdUrl = await uploadFile(
      mpdFilePath,
      destinationPath,
      mpd
    );

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
