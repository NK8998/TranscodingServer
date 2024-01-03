// const { createClient } = require('@supabase/supabase-js');
const fs = require("fs");
const os = require("os");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffprobePath = require("@ffprobe-installer/ffprobe").path;
ffmpeg.setFfprobePath(ffprobePath);
const AWS = require("aws-sdk");
require("dotenv").config();
AWS.config.update({ region: "us-east-1" });
ffmpeg.setFfprobePath(ffprobePath);
ffmpeg.setFfmpegPath(require("ffmpeg-static"));

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  maxRetries: 10, // Maximum number of retry attempts for failed requests
  httpOptions: {
    timeout: 120000, // Request timeout in milliseconds
  },
});

const transcodeAndGenerateMpd = async (temporaryFilePath) => {
  try {
    // const outputDir = 'dash_output';
    // const outputManifest = path.join(outputDir, 'manifest.mpd');

    const outputManifest = "output/output.mpd";

    // Check if the output folder exists, if not, create it

    const videoInfo = await getVideoInfo(temporaryFilePath);

    const { height, width, framerate, videoBitrateKbps, codec_name } =
      videoInfo;
    console.log(videoInfo);
    // // Resolutions to include in the DASH manifest

    // if(codec_name !== 'h264'){

    //   const output = './outputMp4/2020 LG OLED l The Black 4K HDR 60fps.mp4'
    //   await convertToMp4(inputVideo, output)
    // }
    const AllResolutions = [
      { width: 3840, height: 2160, bitrate: 4000 },
      { width: 2560, height: 1440, bitrate: 3000 },
      { width: 1920, height: 1080, bitrate: 2500 },
      { width: 1280, height: 720, bitrate: 2000 },
      { width: 854, height: 480, bitrate: 1000 },
      { width: 640, height: 360, bitrate: 800 },
      { width: 426, height: 240, bitrate: 400 },
      { width: 192, height: 144, bitrate: 200 },
      // Add more resolutions as needed
    ];

    const resolutions = AllResolutions.filter(
      (resolution) => resolution.height <= height
    );
    console.log(resolutions);
    const finalResolutions = resolutions.map((resolution, index) => {
      const length = resolutions.length;

      if (videoBitrateKbps) {
        if (index === 0) {
          // Update the bitrate for the first resolution
          return { ...resolution, bitrate: videoBitrateKbps };
        } else {
          const calculatedBitrate = parseInt(
            (videoBitrateKbps - index * (videoBitrateKbps / length)).toFixed()
          );
          if (resolution.bitrate > calculatedBitrate) {
            return { ...resolution, bitrate: calculatedBitrate };
          } else if (resolution.bitrate < calculatedBitrate) {
            return resolution;
          }
        }
      } else {
        return resolution;
      }
    });

    // const resolutions = [
    //   {width: 1280, height: 720, bitrate: videoBitrateKbps},
    //   {width: 640, height: 360, bitrate: 200},
    // ]

    // Create an FFmpeg command
    console.log(finalResolutions);

    // const videoTotranscode = codec_name !== 'h264' ? `./outputMp4/2020 LG OLED l The Black 4K HDR 60fps.mkv` : inputVideo
    const generateMPDandChunks = () => {
      return new Promise((resolve, reject) => {
        const command = ffmpeg(temporaryFilePath)
          .addOption("-map 0:a:0") // Include audio stream from input
          .addOption("-c:a:0 aac") // Audio codec for all representations
          .addOption("-b:a:0 128k"); // Audio bitrate for all representations

        // Dynamically add video options for each resolution
        finalResolutions.forEach((resolution, index) => {
          command
            .addOption(`-map 0:v:0`)
            .addOption(`-c:v:${index} libx264`)
            .addOption(`-b:v:${index} ${resolution.bitrate}k`)
            .addOption(`-s:v:${index} ${resolution.width}x${resolution.height}`)
            .addOption(`-g:v:${index} ${framerate}`);
          // .addOption(`-profile:v:${index} high`);
        });

        // Set the output manifest
        command.output(outputManifest);
        command.outputOptions([
          "-f dash", // Output format as DASH
          // '-single_file 1',
        ]);

        // Execute the FFmpeg command
        command
          .on("start", () => {
            console.log("Starting DASH transcoding...");
          })
          .on("progress", (progress) => {
            if (progress && progress.percent) {
              console.log(`Progress: ${progress.percent.toFixed(2)}%`);
            }
          })
          .on("error", (err, stdout, stderr) => {
            console.error("Error:", err.message);
            console.error("FFmpeg stdout:", stdout);
            console.error("FFmpeg stderr:", stderr);
            reject(err);
          })
          .on("end", () => {
            console.log("DASH transcoding completed.");
            resolve();
          })
          .run();
      });
    };

    await generateMPDandChunks();

    fs.unlink(temporaryFilePath, (err) => {
      if (err) {
        console.error("Failed to delete the file:", err);
        return;
      }
      console.log("File deleted successfully");
    });
  } catch (error) {
    console.error("something went wrong", error);
  }
};

const convertToMp4 = (inputVideoPath, outputMp4Path) => {
  return new Promise((resolve, reject) => {
    console.log(inputVideoPath, outputMp4Path);
    ffmpeg(inputVideoPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .output(outputMp4Path)
      .on("end", () => {
        console.log("Conversion finished");
        resolve();
      })
      .on("error", (err) => {
        console.error("Error converting video:", err);
        reject(err);
      })
      .run();
  });
};

const getVideoInfo = async (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, info) => {
      if (err) {
        console.error("Failed to get video information:", err);
        reject(err);
      } else {
        const { width, height, r_frame_rate, bit_rate, codec_name } =
          info.streams[0].coded_width > 0 ? info.streams[0] : info.streams[1];
        console.log(
          info.streams[0].coded_width > 0 ? info.streams[0] : info.streams[1]
        );
        const [numerator, denominator] = r_frame_rate.split("/");
        const framerate = parseFloat(numerator) / parseFloat(denominator);
        // Extract the video bitrate in kilobits per second (kbps)
        const videoBitrateKbps = Math.round(bit_rate / 1000);
        resolve({ width, height, framerate, videoBitrateKbps, codec_name });
      }
    });
  });
};

const uploadChunks = async (title) => {
  async function uploadFile(filePath, destinationPath, mpd) {
    const fileData = fs.readFileSync(filePath);
    const fileSize = fs.statSync(filePath).size / 1024;

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: destinationPath,
      Body: fileData,
      PartSize: 5 * 1024 * 1024,
      useAccelerateEndpoint: true, // Set to true if using the S3 Accelerate endpoint
    };

    try {
      const curTime = new Date();
      const uploadResponse = await s3.upload(params).promise();
      const fileUrl = uploadResponse.Location;
      console.log(`File uploaded successfully: ${destinationPath}`);
      const totalTime = new Date();
      const difference = (totalTime - curTime) / 1000;
      const transferRate = fileSize / difference;
      console.log(transferRate);
      mpd && console.log(`File URL: ${fileUrl}`);
    } catch (err) {
      console.error("Error uploading file:", err.message);
      return null;
    }
  }

  const chunksDirectory = path.join(__dirname, "output");

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
    const destinationPath = `${title}/${mpdFile}`;
    let mpd = true;
    await uploadFile(mpdFilePath, destinationPath, mpd);

    // Create an array of promises for concurrent uploads
    mpd = false;
    const uploadPromises = files
      .filter((file) => !file.endsWith(".mpd"))
      .map((file) => {
        const filePath = path.join(chunksDirectory, file);
        const destinationPath = `${title}/${file}`;
        return uploadFile(filePath, destinationPath, mpd);
      });

    // Execute concurrent uploads
    await Promise.all(uploadPromises);
  } catch (err) {
    console.error("Error reading directory:", err.message);
  }
};

const generateMPDandUpload = async (req, res) => {
  const { video } = req.files;
  const { title } = req.body;

  const videoFile = video[0];
  const temporaryFilePath = path.join(os.tmpdir(), videoFile.originalname);
  fs.writeFileSync(temporaryFilePath, videoFile.buffer);

  const scriptDirectory = __dirname;
  // Construct the path to the "output" folder
  const outputFolder = path.join(scriptDirectory, "output");

  fs.mkdirSync(outputFolder, { recursive: true });

  try {
    await transcodeAndGenerateMpd(temporaryFilePath);
    await uploadChunks(title);
    res.status(200).json("video uploaded to aws s3 bucket successfully");
    fs.rmdir(outputFolder, { recursive: true });
  } catch (error) {
    res.status(500).json("error when transcoding", error);
  }
};

module.exports = generateMPDandUpload;
