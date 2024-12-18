const getDurationStamp = (duration) => {
  // duration is in seconds. I want to return a format like this 00:00:00
  // if its just minutes and seconds give me 00:00 otherwise 00:00:00
  // if it is just seconds give 00:00 too
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor(
    (duration - hours * 3600) / 60
  );
  const seconds = duration - hours * 3600 - minutes * 60;

  let timeString = `${minutes
    .toString()
    .padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
  if (hours > 0) {
    timeString = `${hours
      .toString()
      .padStart(2, "0")}:${timeString}`;
  }

  return timeString;
};

module.exports = getDurationStamp;
