// const { createClient } = require('@supabase/supabase-js');
const fs = require("fs");
const os = require("os");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffprobePath = require("@ffprobe-installer/ffprobe").path;
ffmpeg.setFfprobePath(ffprobePath);
const checkPresets = require("./functions/checkPresets");
const getVideoInfo = require("./functions/getVideoInfo");
const uploadChunks = require("./functions/uploadToS3");
require("dotenv").config();
ffmpeg.setFfmpegPath(require("ffmpeg-static"));

const transcodeAndGenerateMpd = async (temporaryFilePath, videoInfo) => {
  try {
    const scriptDirectory = __dirname;
    const outputManifest = `${scriptDirectory}/functions/output/output.mpd`;

    // Check if the output folder exists, if not, create it
    const { height, width, framerate, videoBitrateKbps, codec_name } = videoInfo;

    // Resolutions presets to include in the DASH manifest
    const AllResolutions = [
      { width: 3840, height: 2160, bitrate: 4000, framerate: framerate },
      { width: 2560, height: 1440, bitrate: 3000, framerate: framerate },
      { width: 1920, height: 1080, bitrate: 2500, framerate: framerate },
      { width: 1280, height: 720, bitrate: 2000, framerate: framerate },
      { width: 854, height: 480, bitrate: 1000, framerate: framerate },
      { width: 640, height: 360, bitrate: 800, framerate: framerate },
      { width: 426, height: 240, bitrate: 400, framerate: framerate },
      { width: 256, height: 144, bitrate: 200, framerate: framerate },
      // Add more resolutions as needed
    ];

    const inputResolution = { width: width, height: height, framerate: framerate };
    const resolutions = checkPresets(inputResolution, AllResolutions);

    const finalResolutions = resolutions.map((resolution, index) => {
      let newRes = { ...resolution };

      //make sure framerate never exceeds 30 for resolution less than or equal to 480
      if (newRes.height <= 480) {
        newRes.framerate = newRes.framerate > 30 ? 30 : newRes.framerate;
      }
      if (!videoBitrateKbps) return newRes;

      const length = resolutions.length;
      const calculatedBitrate = Math.round(videoBitrateKbps - index * (videoBitrateKbps / length));

      // Update the bitrate if the current resolution bitrate is greater than the calculated bitrate
      if (resolution.bitrate > calculatedBitrate) {
        newRes = { ...newRes, bitrate: Math.min(resolution.bitrate, videoBitrateKbps, calculatedBitrate) };

        return newRes;
      }

      return newRes;
    });

    console.log(finalResolutions);

    // Create an FFmpeg command

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
            .addOption(`-g:v:${index} ${resolution.framerate}`);
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

const generateMPDandUpload = async (req, res) => {
  const { video } = req.files;
  const { title, videoId } = req.body;

  const videoFile = video[0];
  const temporaryFilePath = path.join(os.tmpdir(), videoFile.originalname);
  fs.writeFileSync(temporaryFilePath, videoFile.buffer);

  const scriptDirectory = __dirname;
  // Construct the path to the "output" folder
  const outputFolder = path.join(scriptDirectory, "functions/output");

  fs.mkdirSync(outputFolder, { recursive: true });

  try {
    const videoInfo = await getVideoInfo(temporaryFilePath);
    await transcodeAndGenerateMpd(temporaryFilePath, videoInfo);
    const mpdUrl = await uploadChunks(title);
    const { duration } = videoInfo;
    console.log(mpdUrl, videoId, title, duration);
    // upload to supabase
    fs.rmSync(outputFolder, { recursive: true });

    res.status(200).json("video uploaded to aws s3 bucket successfully");
  } catch (error) {
    res.status(500).json("error when transcoding", error);
  }
};

module.exports = generateMPDandUpload;
