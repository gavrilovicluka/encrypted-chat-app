import XTEA from "../xtea/xtea.js";
import A51 from "../a51/a51.js";

const clientId = uuidv4();
const userName = prompt("Enter your name:");
const eventSource = new EventSource(
  `/events?clientId=${clientId}&userName=${userName}`
);

const messageContainer = document.getElementById("message-container");
const messageInput = document.getElementById("message-input");
const messageForm = document.getElementById("message-form");
const checkbox = document.querySelector("#show-encrypted");
const radioButtons = document.querySelectorAll('input[name="algorithm"]');
const fileInput = document.getElementById("file-input");

let showEncrypted = false;
let selectedAlgorithm = document.querySelector(
  'input[name="algorithm"]:checked'
).value;
const a51Cipher = new A51();
const xteaCipher = new XTEA();
messageInput.disabled = !userName;

eventSource.addEventListener("newMessage", (event) => {
  const data = JSON.parse(event.data);
  // const base64File = data.file;
  // Kreiraj Data URI za PDF fajl
  // const dataUri = `data:application/pdf;base64,${base64File}`;
  const fileName = data.fileName;
  let dataUri = "";

  //  // Pretvori base64 string u binarni format
  //  const binaryFile = atob(base64File);
  // console.log(data.file)
  // // Konvertuj binarni fajl u Uint8Array
  // const arrayBuffer = new ArrayBuffer(binaryFile.length);
  // const uint8Array = new Uint8Array(arrayBuffer);
  // for (let i = 0; i < binaryFile.length; i++) {
  //   uint8Array[i] = binaryFile.charCodeAt(i);
  // }
  // // Kreira Blob objekat iz Uint8Array
  // const blob = new Blob([uint8Array], { type: 'application/pdf' });
  // // Kreira URL za Blob objekat
  // const blobUrl = URL.createObjectURL(blob);
  // // Otvori PDF fajl u novom prozoru/tabu
  // window.open(blobUrl);

  let decryptedMessage = "";
  let decryptedFile = "";
  if (userName !== data.clientName) {
    if (data.message) {
      switch (
        data.cipher // Tip algoritma prosledjuje server
      ) {
        case "a51":
          decryptedMessage = a51Cipher.decrypt(data.message);
          break;

        case "xtea":
          console.log(data.message);
          decryptedMessage = xteaCipher.decrypt(data.message);
          break;

        default:
          break;
      }
    } else if (data.file) {
      // decryptedFile = a51Cipher.decrypt(data.file);
      switch (
        data.cipher // Tip algoritma prosledjuje server
      ) {
        case "a51":
          decryptedFile = a51Cipher.decrypt(data.file);
          break;

        case "xtea":
          console.log(data.file);
          decryptedFile = xteaCipher.decrypt(data.file);
          break;

        default:
          break;
      }
      console.log(decryptedFile);

      const base64File = btoa(encodeURIComponent(decryptedFile));
      console.log(base64File);
      dataUri = `data:application/pdf;base64,${base64File}`;
    }

    if (showEncrypted) {
      appendMessage(
        `${data.clientName} (encrypted): ${data.message}\n${data.clientName}: ${decryptedMessage}`,
        fileName,
        dataUri
      );
    } else {
      appendMessage(
        `${data.clientName}: ${decryptedMessage}`,
        fileName,
        dataUri
      );
    }
  }
});

messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = messageInput.value;
  const file = fileInput.files[0];
  // console.log(file)

  if ((message !== "" && message !== null && message !== undefined) || file) {
    let encryptedMessage = "";
    let encryptedFile;

    if (message) {
      switch (selectedAlgorithm) {
        case "a51":
          encryptedMessage = a51Cipher.encrypt(message);
          break;

        case "xtea":
          encryptedMessage = xteaCipher.encrypt(message);
          // console.log(encryptedMessage)
          break;

        default:
          break;
      }

      fetch("/sendMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Name": userName,
          "Client-Id": clientId,
          Cipher: selectedAlgorithm,
        },
        // body: JSON.stringify({ encryptedMessage }),
        body: JSON.stringify({ encryptedMessage }, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        ),
      })
        .then(() => {
          messageInput.value = "";
        })
        .catch((error) => {
          console.error("Error sending message:", error);
        });
    }

    const formData = new FormData();
    // formData.append("file", file);

    if (file) {
      encryptFile(file).then((encryptedFile) => {
        // console.log(encryptedFile);
        formData.append("file", encryptedFile);
        formData.append("fileName", file.name);

        fetch("/sendMessage", {
          method: "POST",
          headers: {
            "Client-Name": userName,
            "Client-Id": clientId,
            Cipher: selectedAlgorithm,
          },
          body: formData,
        })
          .then(() => {
            messageInput.value = "";
            fileInput.value = "";
          })
          .catch((error) => {
            console.error("Error sending message:", error);
          });
      });

      // encryptedFile = encryptFile(file); //file;
      // console.log(encryptedFile);
      // fetch("/sendMessage", {
      //   method: "POST",
      //   headers: {
      //     "Client-Name": userName,
      //     "Client-Id": clientId,
      //     Cipher: selectedAlgorithm,
      //   },
      //   body: formData,
      // })
      //   .then(() => {
      //     messageInput.value = "";
      //     fileInput.value = "";
      //   })
      //   .catch((error) => {
      //     console.error("Error sending message:", error);
      //   });
    }

    if (showEncrypted) {
      appendMessage(
        `You (encrypted): ${encryptedMessage}\nYou: ${message}`,
        file
      );
    } else {
      appendMessage(`You: ${message}`, file);
    }
  }
});

for (const radioButton of radioButtons) {
  radioButton.addEventListener("change", () => {
    selectedAlgorithm = document.querySelector(
      'input[name="algorithm"]:checked'
    ).value;
  });
}

function appendMessage(message, encryptedFile, dataUri) {
  const messageElement = document.createElement("div");
  messageElement.className = "message-text";
  messageElement.innerText = message;

  let isReceived = true;

  // Da li je primljen sa servera, kad se primi sa servera bude tipa Object
  if (encryptedFile instanceof File) {
    isReceived = false;
  }
  console.log(encryptedFile);

  if (
    encryptedFile !== null &&
    encryptedFile !== undefined &&
    encryptedFile !== "undefined"
  ) {
    const fileDisplay = document.createElement("a");
    fileDisplay.innerText =
      getFileInputName(isReceived, encryptedFile) || "Download file";
    fileDisplay.href = isReceived ? dataUri : createFileBlob(encryptedFile);
    fileDisplay.download =
      getFileInputName(isReceived, encryptedFile) || "encrypted_file";
    messageElement.appendChild(fileDisplay);
  }

  messageContainer.append(messageElement);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

function createFileBlob(encryptedFile) {
  const blob = new Blob([encryptedFile], { type: "application/octet-stream" });
  return URL.createObjectURL(blob);
}

function getFileInputName(isReceived, file) {
  if (isReceived) {
    return file; // Kada prikazuje fajl koji je primljen sa servera
  }

  if (fileInput.files.length > 0) {
    return fileInput.files[0].name;
  }
  return null;
}

function clearMessages() {
  while (messageContainer.firstChild) {
    messageContainer.removeChild(messageContainer.firstChild);
  }
}

function showEncryptedMessages(data) {
  console.log(data);
  const messages = data.messages;
  const files = data.files;

  messages.forEach((message, index) => {
    const messageSplit = message.split(": ");
    // const decryptedMessage = cipher.decrypt(messageSplit[1]);  // Iz verzije sa A51
    const nameAndCipher = messageSplit[0].split("/"); // ime/cipher
    const messageAndFile = messageSplit[1].split("/"); // message/fileName
    let receivedMessage = messageAndFile[0]; // Enkriptovana poruka koja stize sa servera
    let decryptedMessage = "";
    const file = files[index];
    let decryptedFile = "";

    console.log(messageAndFile[0]);
    switch (nameAndCipher[1]) {
      case "a51":
        if (messageAndFile[0] && messageAndFile[0] !== "undefined") {
          decryptedMessage = a51Cipher.encrypt(messageAndFile[0]);
        } else {
          decryptedFile = a51Cipher.decrypt(file);
          receivedMessage = "";
        }
        break;

      case "xtea":
        if (messageAndFile[0] && messageAndFile[0] !== "undefined") {
          decryptedMessage = xteaCipher.decrypt(messageAndFile[0]);
          receivedMessage = xteaCipher.toValidBlockForm(receivedMessage);
          receivedMessage = xteaCipher.blocksToString(receivedMessage);
        } else {
          decryptedFile = xteaCipher.decrypt(file);
          receivedMessage = "";
        }
        break;

      default:
        break;
    }

    const base64File = btoa(encodeURIComponent(decryptedFile));
    const dataUri = `data:application/pdf;base64,${base64File}`;

    if (nameAndCipher[0] === userName) {
      appendMessage(
        `You (encrypted): ${receivedMessage}\nYou: ${decryptedMessage}`,
        messageAndFile[1],
        dataUri
      );
    } else {
      appendMessage(
        `${nameAndCipher[0]} (encrypted): ${receivedMessage}\n${nameAndCipher[0]}: ${decryptedMessage}`,
        messageAndFile[1],
        dataUri
      );
    }
  });
}

function showDecryptedMessages(data) {
  const messages = data.messages;
  const files = data.files;

  messages.forEach((message, index) => {
    const messageSplit = message.split(": "); // ime/cipher: poruka/fileName
    // const decryptedMessage = cipher.decrypt(messageSplit[1]);  // Iz verzije sa A51
    const nameAndCipher = messageSplit[0].split("/"); // ime/cipher
    const messageAndFile = messageSplit[1].split("/"); // message/fileName
    let decryptedMessage = "";
    const file = files[index];
    let decryptedFile = "";

    switch (nameAndCipher[1]) {
      case "a51":
        if (messageAndFile[0] && messageAndFile[0] !== "undefined") {
          decryptedMessage = a51Cipher.decrypt(messageAndFile[0]);
        } else {
          decryptedFile = a51Cipher.decrypt(file);
          messageAndFile[0] = "";
        }
        break;

      case "xtea":
        if (messageAndFile[0] && messageAndFile[0] !== "undefined") {
          decryptedMessage = xteaCipher.decrypt(messageAndFile[0]);
        } else {
          decryptedFile = xteaCipher.decrypt(file);
          messageAndFile[0] = "";
        }
        break;

      default:
        break;
    }

    const base64File = btoa(encodeURIComponent(decryptedFile));
    const dataUri = `data:application/pdf;base64,${base64File}`;

    if (nameAndCipher[0] === userName) {
      appendMessage(`You: ${decryptedMessage}`, messageAndFile[1], dataUri);
    } else {
      appendMessage(
        `${nameAndCipher[0]}: ${decryptedMessage}`,
        messageAndFile[1],
        dataUri
      );
    }
  });
}

checkbox.addEventListener("change", function () {
  showEncrypted = checkbox.checked;

  getMessages();
  messageContainer.scrollTop = messageContainer.scrollHeight;
});

function getMessages() {
  fetch("/getMessages", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data);

      clearMessages();
      a51Cipher.initializeRegisters();

      if (showEncrypted) {
        showEncryptedMessages(data);
      } else {
        showDecryptedMessages(data);
      }
    })
    .catch((error) => {
      console.error("Error fetching messages:", error);
    });
}

function readArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      const fileBuffer = new Uint8Array(e.target.result);
      resolve(fileBuffer);
    };

    reader.onerror = function (e) {
      reject(new Error("Error reading file."));
    };

    reader.readAsArrayBuffer(file);
  });
}

async function encryptFile(file) {
  try {
    const fileBuffer = await readArrayBuffer(file);
    let stringBuffer = "";

    for (let i = 0; i < fileBuffer.length; i++) {
      // stringBuffer += String.fromCodePoint(fileBuffer[i]);
      stringBuffer += String.fromCharCode(fileBuffer[i]);
    }
    // console.log(stringBuffer);
    // console.log(stringBuffer);

    let encryptedMessage = "";
    switch (selectedAlgorithm) {
      case "a51":
        encryptedMessage = a51Cipher.encrypt(stringBuffer);
        break;

      case "xtea":
        encryptedMessage = xteaCipher.encrypt(stringBuffer);
        break;

      default:
        break;
    }

    return encryptedMessage;
  } catch (error) {
    console.error(error);
  }
}
