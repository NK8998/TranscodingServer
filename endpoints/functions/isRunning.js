let isRunning = false;
let payload = [];

const isRunningFunction = (boolean) => {
  isRunning = boolean;
  return isRunning;
};

const updatePayload = (data) => {
  payload.push(data);
};

const getPayload = () => {
  return payload;
};

const getIsRunning = () => {
  return isRunning;
};
module.exports = {
  isRunningFunction,
  getIsRunning,
  updatePayload,
  getPayload,
};
