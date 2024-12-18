const sharp = require("sharp");
const AWS = require("aws-sdk");
const fs = require("fs");
require("dotenv").config();
const path = require("path");
AWS.config.update({ region: "ap-south-1" });
const getSecrets = require("../secrets/secrets");
const AWSServices = require("../SDKs/AWS");
const supabaseServices = require("../SDKs/supabase");

const extractThumbnails = async (
  videoPathDir,
  video_id
) => {
  const extractedFramesDir = `${videoPathDir}/extractedFrames`;
  const compressedThumbnailsDir = `${videoPathDir}/compressedThumbnails`;
  await fs.promises.mkdir(compressedThumbnailsDir, {
    recursive: true,
  });

  const files = await fs.promises.readdir(
    extractedFramesDir
  );

  const firstThumb = files[1];
  const secondThumb = files[Math.round(files.length / 2)];
  const thirdThumb = files[files.length - 2];
  const thumbnails = [firstThumb, secondThumb, thirdThumb];
  thumbnailPromises = thumbnails.map((thumbnail) => {
    return compressThumbnails(
      compressedThumbnailsDir,
      extractedFramesDir,
      thumbnail
    );
  });
  await Promise.all(thumbnailPromises);
  const possibleThumbnailUrls = await uploadThumbnails(
    compressedThumbnailsDir,
    video_id
  );

  return possibleThumbnailUrls;
};

const compressThumbnails = async (
  compressedThumbnailsDir,
  extractedFramesDir,
  thumbnail
) => {
  const inputFilePath = path.join(
    extractedFramesDir,
    thumbnail
  );
  let outputFilePath = path.join(
    compressedThumbnailsDir,
    thumbnail
  );

  return new Promise(async (resolve, reject) => {
    try {
      let compressed = false;
      let quality = 80; // Starting quality

      while (!compressed) {
        await sharp(inputFilePath)
          .jpeg({ quality, progressive: true })
          .toFile(outputFilePath);

        const stats = await fs.promises.stat(
          outputFilePath
        );
        const fileSizeInBytes = stats.size;

        if (fileSizeInBytes < 30 * 1024) {
          compressed = true;
          console.log(
            `Compressed and saved ${outputFilePath}`
          );
        } else {
          quality -= 5;
          if (quality <= 0) {
            compressed = true; // Stop the loop
            console.log(
              `Could not compress ${file} below 7KB without excessive quality loss.`
            );
          }
        }
      }
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

const uploadThumbnails = async (
  compressedThumbnailsDir,
  video_id
) => {
  let possibleThumbnailUrls = {};
  async function uploadFile(filePath, destinationPath, i) {
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
      const thumbnailUrl = `${secrets.CLOUDFRONT_URL_VIDEO_DATA}/${destinationPath}`;
      const thumbnailNum = `thumbnailUrl-${i}`;
      possibleThumbnailUrls[thumbnailNum] = thumbnailUrl;
    } catch (err) {
      console.error("Error uploading file:", err.message);
      return null;
    }
  }

  const files = await fs.promises.readdir(
    compressedThumbnailsDir
  );

  let i = 0;
  for (const file of files) {
    const destinationPath = `${video_id}/possible_thumbnails/${file}`;
    const filePath = path.join(
      compressedThumbnailsDir,
      file
    );

    await uploadFile(filePath, destinationPath, i);
    i++;
  }

  await uploadThumbnailsToSupabase(
    possibleThumbnailUrls,
    video_id
  );
};

async function uploadThumbnailsToSupabase(
  possibleThumbnailUrls,
  video_id
) {
  const { supabase } = await supabaseServices();
  try {
    const { data, error } = await supabase
      .from("video-metadata")
      .update([
        { possible_thumbnail_urls: possibleThumbnailUrls },
      ])
      .eq("video_id", video_id)
      .select();

    if (error) {
      console.error("something went wrong", error);
      throw error;
    }
  } catch (error) {
    console.error("Unexpected error occurred:", error);
    throw error;
  }
}

module.exports = extractThumbnails;
