const ffmpeg = require("fluent-ffmpeg");

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

module.exports = convertToMp4;
