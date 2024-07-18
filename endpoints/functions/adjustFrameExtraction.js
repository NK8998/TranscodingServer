const adjustFrameExtraction = (duration) => {
  let extractionRate;
  let paletteSize;
  if (duration <= 60) {
    // for videos of 1 minute or less
    extractionRate = 1; // extract a frame every second
    paletteSize = 3; // set palette size to 3
  } else if (duration <= 300) {
    // for videos of 1-5 minutes
    extractionRate = 2; // extract a frame every 2 seconds
    paletteSize = 4; // set palette size to 4
  } else if (duration <= 1800) {
    // for videos of 5-30 minutes
    extractionRate = 6;
    paletteSize = 4;
  } else if (duration <= 3600) {
    // for videos of 30 minutes to 1 hour
    extractionRate = 10; // extract a frame every 10 seconds
    paletteSize = 4; // set palette size to 4
  } else {
    // for videos longer than 1 hour
    extractionRate = 10; // extract a frame every 10 seconds
    paletteSize = 4; // set palette size to 4
  }

  return { extractionRate, paletteSize };
};

module.exports = adjustFrameExtraction;
