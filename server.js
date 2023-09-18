const net = require("net");
const EventEmitter = require("events");
const logger = console;
const { ProtocolHandler } = require("./protocolhandler");
const fs = require("fs").promises;
const path = require("path");

class Server extends EventEmitter {
  constructor(host = "127.0.0.1", port = 31337) {
    super();
    this.host = host;
    this.port = port;
    this.server = net.createServer(this.connectionHandler.bind(this));
    this.kv = new Map();
    this.commands = this.getCommands();
    this.protocolHandler = new ProtocolHandler();
    this.currentLog = `log-${Date.now()}.txt`;
  }

  connectionHandler(socket) {
    logger.log(
      `Connection received from ${socket.remoteAddress}:${socket.remotePort}`
    );

    socket.on("data", async (data) => {
      try {
        this.protocolHandler.cursor = 0;
        const request = this.protocolHandler.handleRequest(data);
        let response = this.getResponse(request);
        const command = request[0].toUpperCase();
        if (command !== "RESTORE" && command !== "FLUSH" && command !== "GET") {
          const filePath = path.join(__dirname + "/logs", this.currentLog);
          try {
            await fs.appendFile(filePath, `"${data}"`);
          } catch (err) {
            console.error("there was an error logging to the file", err);
          }
        } else if (command === "FLUSH") {
          //create a new log file since last flush
          this.currentLog = `log-${Date.now()}.txt`;
        }
        console.log(typeof response);
        console.log("INSTANCE OF", response instanceof Promise);
        if (response instanceof Promise) {
          response = await response;
        }

        const responseBuffer = this.protocolHandler.writeResponse(response);

        socket.write(responseBuffer);
      } catch (error) {
        console.error("Error handling data:", error);
        socket.write(
          this.protocolHandler.writeResponse(new Error("Command error"))
        );
      }
    });

    socket.on("end", () => {
      console.log(
        `Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`
      );
      console.log("DB, ", this.kv);
    });
  }
  getCommands() {
    return {
      GET: this.get.bind(this),
      SET: this.set.bind(this),
      DELETE: this.delete.bind(this),
      FLUSH: this.flush.bind(this),
      MGET: this.mget.bind(this),
      MSET: this.mset.bind(this),
      RESTORE: this.restore.bind(this),
    };
  }
  getResponse(data) {
    const command = data[0].toUpperCase();
    if (!this.commands[command]) {
      throw new Error(`Unrecognized command: ${command}`);
    }
    return this.commands[command](...data.slice(1));
  }

  get(key) {
    return this.kv.get(key) || null;
  }

  set(key, value) {
    this.kv.set(key, value);
    return 1;
  }

  delete(key) {
    if (this.kv.has(key)) {
      this.kv.delete(key);
      return 1;
    }
    return 0;
  }

  flush() {
    const kvLen = this.kv.size;
    this.kv.clear();
    return kvLen;
  }

  mget(...keys) {
    return keys.map((key) => this.kv.get(key));
  }

  mset(...items) {
    const pairs = {};
    for (let i = 0; i < items.length; i += 2) {
      const key = items[i];
      const value = items[i + 1];
      this.kv.set(key, value);
    }
    return this.kv.size;
  }
  async restore(fileName) {
    try {
      // Read the file content
      console.log("restoring from logs...");
      const data = await fs.readFile(
        path.join(__dirname + "/logs", fileName),
        "utf-8"
      );

      // Extract content between double quotes
      const matches = data.match(/"(.*?)"/gs);
      const entries = matches ? matches.map((match) => match.slice(1, -1)) : [];

      console.log("These are the entries:", entries);
      console.log(entries.length);
      for (const entry of entries) {
        console.log("Handling this entry", entry);
        // Reset the cursor position
        this.protocolHandler.cursor = 0;

        const request = this.protocolHandler.handleRequest(
          Buffer.from(entry, "utf-8")
        );
        // Do something with the request
        const response = this.getResponse(request);
      }
      return 1;
    } catch (err) {
      console.error("An error occurred:", err);
    }
  }
  async run() {
    this.server.listen(this.port, this.host, async () => {
      logger.log(`Listening on ${this.host}:${this.port}`);
      //   await this.restore();
    });
  }
}

const server = new Server();
server.run();
