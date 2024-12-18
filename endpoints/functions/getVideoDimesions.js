const fs = require("fs");
const sizeOf = require("image-size");
const { exec } = require("child_process");

const getVideoDimesions = async (
  videoPath,
  videoPathDir
) => {
  const dimensionFrameDir = `${videoPathDir}/dimensionFrame`;

  fs.mkdirSync(dimensionFrameDir, { recursive: true });

  const dimensions = await new Promise(
    (resolve, reject) => {
      exec(
        `ffmpeg -i ${videoPath} -ss 00:00:05 -frames:v 1 ${dimensionFrameDir}/dimension_frame.jpg`,
        (err) => {
          if (err) {
            console.log(
              "an error occured when reading extrcting frame"
            );
            reject(err);
          } else {
            const { width, height } = sizeOf(
              `${dimensionFrameDir}/dimension_frame.jpg`
            );
            resolve({ width, height });
          }
        }
      );
    }
  );

  return dimensions;
};

module.exports = getVideoDimesions;
