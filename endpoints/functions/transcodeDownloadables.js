const fs = require("fs");
const AWS = require("aws-sdk");
const ffmpeg = require("fluent-ffmpeg");
require("dotenv").config();
const path = require("path");
AWS.config.update({ region: "ap-south-1" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  maxRetries: 10, // Maximum number of retry attempts for failed requests
  httpOptions: {
    timeout: 120000, // Request timeout in milliseconds
  },
});

const transcodeDownloadables = async (videoPath, videoPathDir, resolutions, video_id) => {
  const downloadablesDir = `${videoPathDir}/downloadables`;
  await fs.promises.mkdir(downloadablesDir, { recursive: true });
  // downloadables should push only res.referenceHeight if it is either 2160 or 1080 or 720 or 360
  const downloadableRes = resolutions.filter((res) => {
    if (res.referenceHeight === 2160 || res.referenceHeight === 1080 || res.referenceHeight === 720 || res.referenceHeight === 360) {
      return res;
    }
  });

  // Dynamically add video options for each resolution
  const transcodePromises = downloadableRes.map((resolution) => {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .videoCodec("libx264")
        .audioCodec("libmp3lame")
        .addOption("-q:a 0") // Same quality level for audio
        .size(`${resolution.width}x${resolution.height}`)
        .videoBitrate(`${resolution.bitrate}k`)
        .outputOptions(["-crf 30", "-pix_fmt yuv420p"])
        .output(`${downloadablesDir}/video-${resolution.height}.mp4`)
        .on("start", () => {
          console.log("Starting DASH transcoding...");
        })
        .on("progress", (progress) => {
          if (progress && progress.percent) {
            console.log(`Progress: ${progress.percent.toFixed(2)}%`);
          }
        })
        .on("end", () => {
          console.log("Video transcoded");
          resolve();
        })
        .on("error", function (err, stdout, stderr) {
          if (err) {
            console.log(err.message);
            console.log("stdout:\n" + stdout);
            console.log("stderr:\n" + stderr);
            reject();
          }
        })
        .run();
    });
  });

  await Promise.all(transcodePromises);
  console.log("done transcoding downloadables");

  await uploadToS3(downloadablesDir, video_id);
};

const uploadToS3 = async (downloadablesDir, video_id) => {
  // upload to S3
  let downloadablesObj = {};
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
      const downloadableUrl = `${process.env.CLOUDFRONT_URL}/${destinationPath}`;
      const downloadableNum = `downloadableUrl-${i}`;
      downloadablesObj[downloadableNum] = downloadableUrl;
    } catch (err) {
      console.error("Error uploading file:", err.message);
      return null;
    }
  }

  const files = await fs.promises.readdir(downloadablesDir);

  let i = 0;
  for (const file of files) {
    const destinationPath = `${video_id}/downloadables/${file}`;
    const filePath = path.join(downloadablesDir, file);

    await uploadFile(filePath, destinationPath, i);
    i++;
  }
  await uploadToSupabase(downloadablesObj, video_id);
};

const uploadToSupabase = async (downloadablesObj, video_id) => {
  // upload to Supabase
  try {
    const { data, error } = await supabase
      .from("video-metadata")
      .update([{ downloadables: downloadablesObj }])
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
};

module.exports = transcodeDownloadables;
