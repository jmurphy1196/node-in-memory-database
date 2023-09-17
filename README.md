# In-Memory Database Over TCP

A simple, efficient, and lightweight in-memory database that communicates over TCP using a custom protocol.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## 🚀 Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### 📋 Prerequisites

\- Node.js v14.x.x or later
\- npm v6.x.x or later

### 🛠️ Installation

1. Clone the repository:
```
git clone https://github.com/<your-github-username>/node-in-memory-db.git
```

2. Change to the project directory:
```
cd node-in-memory-db
```

3. Install the dependencies:
```
npm install
```

4. Start the server:
```
node server.js
```

You should now have the server running on `127.0.0.1:31337`.

### 🖥️ Usage

For interaction, use the provided client. Here are some basic commands:

```javascript
const { Client } = require('./client');
const client = new Client();

client.set("key", "value");
client.get("key");
```

## 📈 Features

- **In-Memory Storage**: Fast data retrieval and storage with no persistence overhead.
- **Custom Protocol**: Efficient and simple protocol for communication.
- **TCP Communication**: Reliable data transfer over TCP.

## 🛠️ Built With

- [Node.js](https://nodejs.org/): JavaScript runtime.



## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
