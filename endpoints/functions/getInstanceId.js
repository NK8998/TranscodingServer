const http = require("http");
let instanceId;

const getInstanceId = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "169.254.169.254",
      port: 80,
      path: "/latest/meta-data/instance-id",
      method: "GET",
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve(data);
        instanceId = data;
      });
    });

    req.on("error", (error) => {
      reject(`Problem with request: ${error.message}`);
    });

    req.end();
  });
};

const retrieveInstanceId = () => {
  return instanceId;
};

module.exports = { getInstanceId, retrieveInstanceId };
