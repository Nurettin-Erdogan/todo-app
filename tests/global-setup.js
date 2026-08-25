const { startServer } = require("../server");

module.exports = async () => {
  const server = await startServer({ log: false });

  return async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  };
};
