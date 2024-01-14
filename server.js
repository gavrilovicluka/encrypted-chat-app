const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const { EventEmitter } = require("events");
const multer = require("multer");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, "public")));
app.use("/a51", express.static(path.join(__dirname, "a51")));
app.use("/xtea", express.static(path.join(__dirname, "xtea")));
app.use("/config", express.static(path.join(__dirname, "config")));
app.use("/blake256", express.static(path.join(__dirname, "blake256")));
app.use("/fileUtils", express.static(path.join(__dirname, "fileUtils")));


app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    limit: "500mb",
    extended: true,
    parameterLimit: 100000,
  })
);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const messageEmitter = new EventEmitter();

let messages = [];
let clients = {};
let clientId;
let userName;
let files = [];

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

app.post("/sendMessage", upload.single("file"), (req, res) => {
  const message = req.body.encryptedMessage;
  const clientName = req.header("Client-Name");
  const cipher = req.header("Cipher");

  const file = req.body.file;
  let base64File;
  const fileName = req.body.fileName;
  const fileHash = req.body.fileHash;

  messages.push(`${clientName}/${cipher}: ${message}/${fileName}/${fileHash}`);
  files.push(file);

  console.log(messages);
  console.log(files);

  messageEmitter.emit("newMessage", {
    message,
    clientName,
    cipher,
    file,
    fileName,
    fileHash
  });

  res.json({ success: true, message: "Poruka poslata" });
});

app.get("/getMessages", (req, res) => {
  const response = {
    messages: messages,
    files: files,
  };

  res.json(response);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
