let isRunning = false;

const isRunningFunction = (boolean) => {
  isRunning = boolean;
  return isRunning;
};

const getIsRunning = () => {
  return isRunning;
};
module.exports = {
  isRunningFunction,
  getIsRunning,
};
