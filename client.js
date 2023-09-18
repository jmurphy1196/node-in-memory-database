const net = require("net");
const { StringDecoder } = require("string_decoder");
const decoder = new StringDecoder("utf8");
const { ProtocolHandler } = require("./protocolhandler");

class Client {
  constructor(host = "127.0.0.1", port = 31337) {
    this.protocol = new ProtocolHandler();
    this.partialData = null;
    this.socket = new net.Socket();
    this.socket.connect(port, host, () => {
      console.log("Connected to the server");
    });

    this.socket.on("data", (data) => {
      if (this.partialData) {
        data = Buffer.concat([this.partialData, data]);
        this.partialData = null;
      }

      try {
        const resp = this.protocol.handleRequest(data);
        this.resolveResponse(resp);
      } catch (error) {
        if (error.message === "Line end not found") {
          this.partialData = data;
        } else {
          this.rejectResponse(error);
        }
      }
      // Reset the protocol cursor
      this.protocol.cursor = 0;
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    this.socket.on("close", () => {
      console.log("Connection closed");
    });
  }

  execute(...args) {
    return new Promise((resolve, reject) => {
      this.resolveResponse = resolve;
      this.rejectResponse = reject;
      const buffer = this.protocol.writeResponse(args);
      this.socket.write(buffer, () => {
        console.log("Data sent to server");
      });
    });
  }

  async get(key) {
    return await this.execute("GET", key);
  }

  async set(key, value) {
    return await this.execute("SET", key, value);
  }

  async delete(key) {
    return await this.execute("DELETE", key);
  }

  async flush() {
    return await this.execute("FLUSH");
  }

  async mget(...keys) {
    return await this.execute("MGET", ...keys);
  }

  async mset(...items) {
    return await this.execute("MSET", ...items);
  }
  async restore() {
    return await this.execute("RESTORE");
  }
}

module.exports = {
  Client,
};
