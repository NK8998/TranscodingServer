const ffmpeg = require("fluent-ffmpeg");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { roundToEven } = require("./checkPresets");
const uploadExtractedFrames = require("./uploadExtractedFrames");

async function extractFrameFromBeginning(
  videoPath,
  extractedFramePath,
  mediumRes
) {
  const { height, width } = mediumRes;

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        "-ss 00:00:00", // Seek to the beginning (adjust time if needed)
        "-frames:v 1", // Extract only 1 frame
        "-vf",
        `scale=${width}:${height}`,
      ])
      .output(extractedFramePath)
      .on("end", () => {
        console.log(
          "Frame extraction from beginning complete."
        );
        resolve();
      })
      .on("error", (err) => {
        console.error(err);
        reject(err);
      })
      .run();
  });
}

async function extractFrames(
  videoPath,
  extractedFramesDir,
  extractionRate,
  mediumRes
) {
  const { height, width } = mediumRes;

  if (!fs.existsSync(extractedFramesDir)) {
    fs.mkdirSync(extractedFramesDir);
  }

  try {
    // Extract frame from the beginning
    await extractFrameFromBeginning(
      videoPath,
      `${extractedFramesDir}/output_0000_preview.jpeg`,
      mediumRes
    );

    // Extract frames based on extractionRate
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          "-ss",
          `00:00:${extractionRate}`, // Start extraction from extractionRate seconds into the video
          "-vf",
          `fps=1/${extractionRate},scale=${width}:${height}`,
        ])
        .output(
          `${extractedFramesDir}/output_%04d_preview.jpeg`
        ) // Include %04d for padding
        .on("end", () => {
          console.log("Frame extraction complete.");
          resolve();
        })
        .on("error", (err) => {
          console.error(err);
          reject(err);
        })
        .run();
    });

    console.log("Frame extraction complete.");
  } catch (err) {
    console.error(err);
    throw err;
  }
}

// 110

async function compressPalettes(
  palletesDir,
  compressedPalletesDir,
  mediumRes
) {
  const { width, height } = mediumRes;
  return new Promise(async (resolve, reject) => {
    try {
      const files = await fs.promises.readdir(palletesDir);
      await fs.promises.mkdir(compressedPalletesDir, {
        recursive: true,
      });

      const compressPromises = files.map(async (file) => {
        const inputFilePath = path.join(palletesDir, file);
        let outputFilePath = path.join(
          compressedPalletesDir,
          file
        );

        let compressed = false;
        let quality = 100; // Starting quality

        while (!compressed) {
          await sharp(inputFilePath)
            .resize({
              width: width,
              height: height,
              fit: "inside",
            })
            .jpeg({ quality, progressive: true })
            .toFile(outputFilePath);

          const stats = await fs.promises.stat(
            outputFilePath
          );
          const fileSizeInBytes = stats.size;

          if (fileSizeInBytes < 45 * 1024) {
            compressed = true;
            console.log(
              `Compressed and saved ${outputFilePath}`
            );
          } else {
            quality -= 5;
            if (quality <= 20) {
              compressed = true; // Stop the loop
              console.log(
                `Could not compress ${file} below 45KB without excessive quality loss.`
              );
            }
          }
        }
      });

      await Promise.all(compressPromises);
      resolve();
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

async function createPalette(
  extractedFramesDir,
  palletesDir,
  paletteSize,
  mediumRes
) {
  const { width, height } = mediumRes;

  try {
    const files = await fs.promises.readdir(
      extractedFramesDir
    );

    // Create the 'palettes' directory if it doesn't exist
    const paletteDirectory = palletesDir;
    if (!fs.existsSync(paletteDirectory)) {
      fs.mkdirSync(paletteDirectory);
    }

    // Group files into batches of whatever palletSize is
    const batches = [];
    const pallet = paletteSize * paletteSize;
    for (let i = 0; i < files.length; i += pallet) {
      batches.push(files.slice(i, i + pallet));
    }

    // ... (your existing code to create file batches)

    for (const [i, batch] of batches.entries()) {
      const batchNumber = (i + 1)
        .toString()
        .padStart(3, "0"); // Pad the batch number with leading zeros
      const inputFiles = batch
        .map((file) => `-i ${extractedFramesDir}/${file}`)
        .join(" ");
      const palettePath = `${paletteDirectory}/batch_${batchNumber}_palette.jpeg`;

      try {
        await new Promise((resolve, reject) => {
          exec(
            `ffmpeg ${inputFiles} -filter_complex "concat=n=${batch.length}:v=1:a=0,scale=iw*${paletteSize}:ih*${paletteSize}:flags=neighbor,tile=${paletteSize}x${paletteSize},scale=${width}:${height}:flags=lanczos,setsar=1:1" -q:v 2 ${palettePath}`,
            (err) => {
              if (err) {
                reject(err);
              } else {
                console.log(
                  `Palette created for batch ${i + 1}`
                );
                resolve();
              }
            }
          );
        });
      } catch (err) {
        console.error(
          `Error creating palette for batch ${i + 1}:`,
          err
        );
      }
    }
  } catch (err) {
    console.error("Error creating palettes: ", err);
  }
}

// async function createPalette(compressedFramesDir, palletesDir, paletteSize) {
//   const files = await fs.promises.readdir(compressedFramesDir);

//   // Create the 'palettes' directory if it doesn't exist
//   const paletteDirectory = palletesDir;
//   if (!fs.existsSync(paletteDirectory)) {
//     fs.mkdirSync(paletteDirectory);
//   }

//   // Group files into batches of whatever palletSize is
//   const batches = [];
//   const pallet = paletteSize * paletteSize;
//   for (let i = 0; i < files.length; i += pallet) {
//     batches.push(files.slice(i, i + pallet));
//   }

//   // Map over batches and create palette of palletSize x palletSize using ffmpeg
//   for (const [i, batch] of batches.entries()) {
//     const inputFiles = batch.map((file) => `-i ${compressedFramesDir}/${file}`).join(" ");
//     const palettePath = `${paletteDirectory}/batch_${i + 1}_palette.jpeg`;

//     exec(
//       `ffmpeg ${inputFiles} -filter_complex "concat=n=${batch.length}:v=1:a=0,scale=iw*${paletteSize}:ih*${paletteSize}:flags=neighbor,tile=${paletteSize}x${paletteSize}" ${palettePath}`,
//       (err) => {
//         if (err) {
//           console.error(`Error creating palette for batch ${i + 1}:`, err);
//         } else {
//           console.log(`Palette created for batch ${i + 1}`);
//         }
//       }
//     );
//   }
// }

async function getPreviews(
  videoPath,
  videoPathDir,
  allResolutions,
  priviewAdjustments,
  video_id
) {
  const { extractionRate, paletteSize } =
    priviewAdjustments;
  const extractedFramesDir = `${videoPathDir}/extractedFrames`;
  const compressedPalletesDir = `${videoPathDir}/compressedPalletes`;
  const palletesDir = `${videoPathDir}/palletes`;
  const length = allResolutions.length;
  const lowestRes = allResolutions[length - 1];
  const { width, height } = lowestRes;
  const aspectRatio = width / height;
  const medWidth = 852;
  const medHeight = 852 * (1 / aspectRatio);
  const mediumRes = {
    width: roundToEven(Math.floor(medWidth)),
    height: roundToEven(Math.floor(medHeight)),
  };
  try {
    await extractFrames(
      videoPath,
      extractedFramesDir,
      extractionRate,
      mediumRes
    );
    await uploadExtractedFrames(
      extractedFramesDir,
      video_id
    );
    await createPalette(
      extractedFramesDir,
      palletesDir,
      paletteSize,
      mediumRes
    );
    await compressPalettes(
      palletesDir,
      compressedPalletesDir,
      mediumRes
    );
  } catch (err) {
    console.error(
      "An error occurred during processing:",
      err
    );
  }
}

module.exports = getPreviews;
