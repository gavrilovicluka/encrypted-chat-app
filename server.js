const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const { EventEmitter } = require("events");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, "public")));
app.use("/a51", express.static(path.join(__dirname, "a51")));
app.use("/xtea", express.static(path.join(__dirname, "xtea")));
app.use("/config", express.static(path.join(__dirname, "config")));

const messageEmitter = new EventEmitter();

let messages = [];
let clients = {};
let clientId;
let userName;

app.get("/", (req, res) => {
  res.sendFile(__dirname, "/public/index.html");
});

// Server-side events endpoint
app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clientId = req.query.clientId;
  userName = req.query.userName;

  clients[clientId] = userName;

  const onNewMessage = (data) => {
    console.log(data);
    res.write(`event: newMessage\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onGetMessages = (data) => {
    res.write(`event: getMessages\ndata: ${JSON.stringify(data)}\n\n`);
  };

  messageEmitter.on("newMessage", onNewMessage);
  messageEmitter.on("getMessages", onGetMessages);

  req.on("close", () => {
    delete clients[clientId];
  });
});

app.post("/sendMessage", (req, res) => {
  const message = req.body.encryptedMessage;
  const clientName = req.header("Client-Name");
  const cipher = req.header("Cipher");

  messages.push(`${clientName}/${cipher}: ${message}`);

  messageEmitter.emit("newMessage", { message, clientName, cipher });

  res.json({ success: true, message: "Poruka poslata" });
});

app.get("/getMessages", (req, res) => {
  res.json(messages);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
