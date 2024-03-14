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
    paletteSize = 3; // set palette size to 3
  } else if (duration <= 3600) {
    // for videos of 5 minutes to 1 hour
    extractionRate = 5; // extract a frame every 5 seconds
    paletteSize = 3; // set palette size to 3
  } else {
    // for videos longer than 1 hour
    extractionRate = 5; // extract a frame every 5 seconds
    paletteSize = 5; // set palette size to 5
  }

  return { extractionRate, paletteSize };
};

module.exports = adjustFrameExtraction;
