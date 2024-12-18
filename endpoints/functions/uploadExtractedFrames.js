const AWS = require("aws-sdk");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
AWS.config.update({ region: "ap-south-1" });
const { createClient } = require("@supabase/supabase-js");
const getSecrets = require("../secrets/secrets");
const supabaseServices = require("../SDKs/supabase");
const AWSServices = require("../SDKs/AWS");

const uploadFramesUrlToSupabase = async (
  extractedFramesUrls,
  video_id
) => {
  const { supabase } = await supabaseServices();
  try {
    const { data, error } = await supabase
      .from("video-categorization")
      .insert([
        {
          extracted_frames_urls: extractedFramesUrls,
          video_id: video_id,
        },
      ])
      .select();

    if (error) {
      console.error("Error uploading to Supabase:", error);
      throw error;
    }

    console.log(data);
    return data;
  } catch (error) {
    console.error("Unexpected error occurred:", error);
    throw error;
  }
};

const uploadExtractedFrames = async (
  extractedFramesDir,
  video_id
) => {
  const secrets = await getSecrets();
  const { s3 } = await AWSServices();

  let extractedFramesUrls = {};

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
      const frameUrl = `${secrets.CLOUDFRONT_URL_VIDEO_DATA}/${destinationPath}`;
      console.log(frameUrl);
      return frameUrl;
    } catch (err) {
      console.error("Error uploading file:", err.message);
      return null;
    }
  }

  const files = await fs.promises.readdir(
    extractedFramesDir
  );
  const uploadPromises = files.map((file, i) => {
    const filePath = path.join(extractedFramesDir, file);
    const destination = `${video_id}/extractedFrames/${file}`;
    return uploadFile(filePath, destination, i);
  });

  const urls = await Promise.all(uploadPromises);
  urls.forEach((url, i) => {
    const FrameNum = `frameNum-${i}`;
    extractedFramesUrls[FrameNum] = url;
  });

  await uploadFramesUrlToSupabase(
    extractedFramesUrls,
    video_id
  );
};

module.exports = uploadExtractedFrames;
