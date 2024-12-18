const { retrieveInstanceId } = require("./getInstanceId");
const AWSServices = require("../SDKs/AWS");
require("dotenv").config();

const checkRunningInstances = async () => {
  const { ec2 } = await AWSServices();

  const instanceId = retrieveInstanceId();
  // 1. Get all instances
  const instanceData = await ec2
    .describeInstances()
    .promise();

  // 2. Check for any other running instances
  let otherRunningInstancesExist = false;
  instanceData.Reservations.forEach((reservation) => {
    reservation.Instances.forEach((instance) => {
      if (
        instance.State.Name === "running" &&
        instance.InstanceId !== instanceId
      ) {
        otherRunningInstancesExist = true;
      }
    });
  });

  // 3. Stop the instance only if no other running instances
  if (otherRunningInstancesExist) {
    console.log(
      `Other running instances exist. Not stopping ${instanceId}`
    );
  }
  return otherRunningInstancesExist;
};

module.exports = checkRunningInstances;
