const { StringDecoder } = require("string_decoder");
const decoder = new StringDecoder("utf8");

class ProtocolHandler {
  constructor() {
    this.cursor = 0;
    this.handlers = {
      "+": this.handleSimpleString,
      "-": this.handleError,
      ":": this.handleInteger,
      $: this.handleString,
      "*": this.handleArray,
      "%": this.handleDict,
    };
  }
  writeResponse(data) {
    const buf = [];
    this.write(buf, data);
    return Buffer.concat(buf);
  }

  write(buf, data) {
    if (typeof data === "string") {
      const strData = Buffer.from(data, "utf-8");
      buf.push(Buffer.from(`$${strData.length}\r\n`));
      buf.push(strData);
      buf.push(Buffer.from("\r\n"));
    } else if (typeof data === "number") {
      buf.push(Buffer.from(`:${data}\r\n`));
    } else if (data instanceof Error) {
      buf.push(Buffer.from(`-${data.message}\r\n`));
    } else if (Array.isArray(data)) {
      buf.push(Buffer.from(`*${data.length}\r\n`));
      for (const item of data) {
        this.write(buf, item);
      }
    } else if (typeof data === "object" && data !== null) {
      // Assuming it's a dictionary
      const keys = Object.keys(data);
      buf.push(Buffer.from(`%${keys.length}\r\n`));
      for (const key of keys) {
        this.write(buf, key);
        this.write(buf, data[key]);
      }
    } else if (data === null) {
      buf.push(Buffer.from("$-1\r\n"));
    } else {
      throw new CommandError("Unrecognized type: " + typeof data);
    }
  }
  handleRequest(buffer) {
    const firstByte = decoder.write(buffer.slice(this.cursor, this.cursor + 1));
    if (!firstByte) {
      throw new Error("Disconnect");
    }

    const handler = this.handlers[firstByte];
    if (!handler) {
      throw new Error("Bad request");
    }

    this.cursor++;

    return handler.call(this, buffer);
  }

  handleSimpleString(buffer) {
    return this.readLine(buffer);
  }

  handleError(buffer) {
    return new Error(this.readLine(buffer));
  }

  handleInteger(buffer) {
    return parseInt(this.readLine(buffer), 10);
  }

  handleString(buffer) {
    let length = parseInt(this.readLine(buffer), 10);
    if (length === -1) return null;

    let start = this.cursor;
    this.cursor += length + 2;
    return buffer.slice(start, start + length).toString();
  }

  handleArray(buffer) {
    let arrayItems = [];
    let numOfItems = parseInt(this.readLine(buffer), 10);
    for (let i = 0; i < numOfItems; i++) {
      let item = this.handleRequest(buffer);
      arrayItems.push(item);
    }
    return arrayItems;
  }
  handleDict(buffer) {
    let numItems = parseInt(this.readLine(buffer), 10);
    let results = {};
    for (let i = 0; i < numItems; i++) {
      let key = this.handleRequest(buffer);
      let value = this.handleRequest(buffer);
      results[key] = value;
    }
    return results;
  }

  readLine(buffer) {
    let end = buffer.indexOf("\r\n", this.cursor);
    if (end === -1) throw new Error("Line end not found");

    let line = buffer.slice(this.cursor, end).toString();

    // Move the cursor past the line and the \r\n
    this.cursor = end + 2;

    return line;
  }
}

module.exports = {
  ProtocolHandler,
};
