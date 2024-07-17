const adjustFrameExtraction = (duration) => {
  let extractionRate;
  let paletteSize;
  if (duration <= 60) {
    // for videos of 1 minute or less
    extractionRate = 1; // extract a frame every second
    paletteSize = 3; // set palette size to 3
  } else if (duration <= 300) {
    // for videos of 1-5 minutes
    extractionRate = 1; // extract a frame every 1 seconds
    paletteSize = 4; // set palette size to 3
  } else if (duration <= 1800) {
    // for videos of 5-30 minutes
    extractionRate = 3;
    paletteSize = 4;
  } else if (duration <= 3600) {
    // for videos of 30 minutes to 1 hour
    extractionRate = 4; // extract a frame every 5 seconds
    paletteSize = 4; // set palette size to 4
  } else {
    // for videos longer than 1 hour
    extractionRate = 5; // extract a frame every 5 seconds
    paletteSize = 4; // set palette size to 4
  }

  return { extractionRate, paletteSize };
};

module.exports = adjustFrameExtraction;
