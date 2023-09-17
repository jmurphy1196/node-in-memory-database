const net = require("net");
const EventEmitter = require("events");
const logger = console;
const { ProtocolHandler } = require("./protocolhandler");

class Server extends EventEmitter {
  constructor(host = "127.0.0.1", port = 31337) {
    super();
    this.host = host;
    this.port = port;
    this.server = net.createServer(this.connectionHandler.bind(this));
    this.kv = new Map();
    this.commands = this.getCommands();
    this.protocolHandler = new ProtocolHandler();
  }

  connectionHandler(socket) {
    logger.log(
      `Connection received from ${socket.remoteAddress}:${socket.remotePort}`
    );

    socket.on("data", (data) => {
      try {
        this.protocolHandler.cursor = 0;
        const request = this.protocolHandler.handleRequest(data);
        const response = this.getResponse(request);
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
  run() {
    this.server.listen(this.port, this.host, () => {
      logger.log(`Listening on ${this.host}:${this.port}`);
    });
  }
}

const server = new Server();
server.run();
