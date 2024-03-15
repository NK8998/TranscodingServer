const ffmpeg = require("fluent-ffmpeg");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

async function extractFrameFromBeginning(videoPath, extractedFramePath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        "-ss 00:00:00", // Seek to the beginning (adjust time if needed)
        "-frames:v 1", // Extract only 1 frame
      ])
      .output(extractedFramePath)
      .on("end", () => {
        console.log("Frame extraction from beginning complete.");
        resolve();
      })
      .on("error", (err) => {
        console.error(err);
        reject(err);
      })
      .run();
  });
}

async function extractFrames(videoPath, extractedFramesDir, extractionRate) {
  if (!fs.existsSync(extractedFramesDir)) {
    fs.mkdirSync(extractedFramesDir);
  }

  try {
    // Extract frame from the beginning
    if (extractionRate !== 1) {
      await extractFrameFromBeginning(videoPath, `${extractedFramesDir}/output_0000_preview.jpeg`);
    }

    // Extract frames based on extractionRate
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions(["-vf", `fps=1/${extractionRate}`])
        .output(`${extractedFramesDir}/output_%04d_preview.jpeg`) // Include %04d for padding
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

async function compressImages(extractedFramesDir, compressedFramesDir, lowestRes) {
  const { height, width } = lowestRes;
  return new Promise(async (resolve, reject) => {
    try {
      const files = await fs.promises.readdir(extractedFramesDir);
      await fs.promises.mkdir(compressedFramesDir, { recursive: true });

      const compressPromises = files.map(async (file) => {
        const inputFilePath = path.join(extractedFramesDir, file);
        let outputFilePath = path.join(compressedFramesDir, file);

        let compressed = false;
        let quality = 80; // Starting quality

        while (!compressed) {
          await sharp(inputFilePath)
            .resize({ width: width, height: height, fit: "inside" })
            .jpeg({ quality, progressive: true })
            .toFile(outputFilePath);

          const stats = await fs.promises.stat(outputFilePath);
          const fileSizeInBytes = stats.size;

          if (fileSizeInBytes < 7 * 1024) {
            compressed = true;
            console.log(`Compressed and saved ${outputFilePath}`);
          } else {
            quality -= 5;
            if (quality <= 0) {
              compressed = true; // Stop the loop
              console.log(`Could not compress ${file} below 7KB without excessive quality loss.`);
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

async function createPalette(compressedFramesDir, palletesDir, paletteSize) {
  try {
    const files = await fs.promises.readdir(compressedFramesDir);

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
      const inputFiles = batch.map((file) => `-i ${compressedFramesDir}/${file}`).join(" ");
      const palettePath = `${paletteDirectory}/batch_${i + 1}_palette.jpeg`;

      try {
        await new Promise((resolve, reject) => {
          exec(
            `ffmpeg ${inputFiles} -filter_complex "concat=n=${batch.length}:v=1:a=0,scale=iw*${paletteSize}:ih*${paletteSize}:flags=neighbor,tile=${paletteSize}x${paletteSize}" ${palettePath}`,
            (err) => {
              if (err) {
                reject(err);
              } else {
                console.log(`Palette created for batch ${i + 1}`);
                resolve();
              }
            }
          );
        });
      } catch (err) {
        console.error(`Error creating palette for batch ${i + 1}:`, err);
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

async function getPreviews(videoPath, videoPathDir, resolutions, priviewAdjustments) {
  const { extractionRate, paletteSize } = priviewAdjustments;
  const extractedFramesDir = `${videoPathDir}/extractedFrames`;
  const compressedFramesDir = `${videoPathDir}/compressed`;
  const palletesDir = `${videoPathDir}/palletes`;
  const lowestRes = resolutions[resolutions.length - 1];
  try {
    await extractFrames(videoPath, extractedFramesDir, extractionRate);
    await compressImages(extractedFramesDir, compressedFramesDir, lowestRes);
    await createPalette(compressedFramesDir, palletesDir, paletteSize);
  } catch (err) {
    console.error("An error occurred during processing:", err);
  }
}

module.exports = getPreviews;
