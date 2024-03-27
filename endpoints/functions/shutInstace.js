const AWS = require("aws-sdk");
const { retrieveInstanceId } = require("./getInstanceId");
require("dotenv").config();

let retries = 0;
const shutInstance = async () => {
  const ec2 = new AWS.EC2({ region: "ap-south-1" });

  try {
    const thisInstanceId = retrieveInstanceId();
    const instanceId = process.env.INSTANCE_ID;
    if (instanceId !== thisInstanceId) return;

    const instanceData = await ec2.describeInstances({ InstanceIds: [instanceId] }).promise();
    const state = instanceData.Reservations[0].Instances[0].State.Name;

    if (state === "running") {
      await ec2.stopInstances({ InstanceIds: [instanceId] }).promise();
      console.log(`Stopped instance: ${instanceId}`);
    } else {
      console.log(`Instance ${instanceId} is already in the desired state: ${state}`);
    }
  } catch (error) {
    retries++;
    console.error("Error stopping instance:", error);
    if (retries < 10) {
      shutInstance();
    }
  }
};

module.exports = shutInstance;
