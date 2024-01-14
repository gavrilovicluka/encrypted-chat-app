import XTEA from "../xtea/xtea.js";
import A51 from "../a51/a51.js";
import Blake256 from "../blake256/blake.js";
import {
  readArrayBuffer,
  encryptFile,
  createFileBlob,
  getFileInputName,
  generateFileHash,
  generateStringHash,
} from "../fileUtils/fileUtils.js";

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
const blake = new Blake256();

messageInput.disabled = !userName;

eventSource.addEventListener("newMessage", (event) => {
  const data = JSON.parse(event.data);
  const fileName = data.fileName;
  const fileHash = data.fileHash;
  let dataUri = "";

  let isHashCorrect = false;
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
      console.log(decryptedFile)
      // const base64File = btoa(encodeURIComponent(decryptedFile));
      const base64File = btoa(decryptedFile);
      console.log(base64File);
      dataUri = `data:application/pdf;base64,${base64File}`;

      const receivedFileHash = generateStringHash(decryptedFile, blake);

      if (fileHash === receivedFileHash) {
        isHashCorrect = true;
      }
    }

    if (showEncrypted) {
      appendMessage(
        `${data.clientName} (encrypted): ${data.message}\n${data.clientName}: ${decryptedMessage}`,
        fileName,
        dataUri,
        isHashCorrect
      );
    } else {
      appendMessage(
        `${data.clientName}: ${decryptedMessage}`,
        fileName,
        dataUri,
        isHashCorrect
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

    if (file) {
      encryptFile(file, selectedAlgorithm, a51Cipher, xteaCipher).then(
        async (encryptedFile) => {
          console.log(encryptedFile);

          const fileHash = await generateFileHash(file, blake);

          formData.append("file", encryptedFile);
          formData.append("fileName", file.name);
          formData.append("fileHash", fileHash);

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
        }
      );
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

function appendMessage(message, encryptedFile, dataUri, isHashCorrect) {
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
      getFileInputName(isReceived, encryptedFile, fileInput) || "Download file";
    
    fileDisplay.href = isReceived ? dataUri : createFileBlob(encryptedFile);
    fileDisplay.download =
      getFileInputName(isReceived, encryptedFile, fileInput) ||
      "encrypted_file";
    messageElement.appendChild(fileDisplay);

    if (isHashCorrect) {
      const checkmark = document.createElement("span");
      checkmark.innerText = "✔";
      checkmark.style.color = "green";
      checkmark.title = "File transferred correctly";
      checkmark.style.marginLeft = "5px";
      messageElement.appendChild(checkmark);
    } else if (isHashCorrect !== undefined) {
      const cross = document.createElement("span");
      cross.innerText = "✘";
      cross.style.color = "red";
      cross.style.marginLeft = "5px";
      cross.title = "Error transferring file";
      messageElement.appendChild(cross);
    }
  }

  messageContainer.append(messageElement);
  messageContainer.scrollTop = messageContainer.scrollHeight;
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
    const messageAndFile = messageSplit[1].split("/"); // message/fileName/fileHash
    let receivedMessage = messageAndFile[0]; // Enkriptovana poruka koja stize sa servera
    let decryptedMessage = "";
    const file = files[index];
    let decryptedFile = "";
    let isHashCorrect = false;

    switch (nameAndCipher[1]) {
      case "a51":
        if (messageAndFile[0] && messageAndFile[0] !== "undefined") {
          decryptedMessage = a51Cipher.encrypt(messageAndFile[0]);
        } else {
          decryptedFile = a51Cipher.decrypt(file);
          receivedMessage = "";
          const receivedHash = generateStringHash(decryptedFile, blake);
          if (receivedHash === messageAndFile[2]) {
            isHashCorrect = true;
          }
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
          const receivedHash = generateStringHash(decryptedFile, blake);
          if (receivedHash === messageAndFile[2]) {
            isHashCorrect = true;
          }
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
        dataUri,
        isHashCorrect
      );
    }
  });
}

function showDecryptedMessages(data) {
  const messages = data.messages;
  const files = data.files;

  messages.forEach((message, index) => {
    const messageSplit = message.split(": "); // ime/cipher: poruka/fileName/fileHash
    // const decryptedMessage = cipher.decrypt(messageSplit[1]);  // Iz verzije sa A51
    const nameAndCipher = messageSplit[0].split("/"); // ime/cipher
    const messageAndFile = messageSplit[1].split("/"); // message/fileName/fileHash
    let decryptedMessage = "";
    const file = files[index];
    let decryptedFile = "";
    let isHashCorrect = false;

    switch (nameAndCipher[1]) {
      case "a51":
        if (messageAndFile[0] && messageAndFile[0] !== "undefined") {
          decryptedMessage = a51Cipher.decrypt(messageAndFile[0]);
        } else {
          decryptedFile = a51Cipher.decrypt(file);
          messageAndFile[0] = "";
          const receivedHash = generateStringHash(decryptedFile, blake);
          if (receivedHash === messageAndFile[2]) {
            isHashCorrect = true;
          }
        }
        break;

      case "xtea":
        if (messageAndFile[0] && messageAndFile[0] !== "undefined") {
          decryptedMessage = xteaCipher.decrypt(messageAndFile[0]);
        } else {
          decryptedFile = xteaCipher.decrypt(file);
          messageAndFile[0] = "";
          const receivedHash = generateStringHash(decryptedFile, blake);
          if (receivedHash === messageAndFile[2]) {
            isHashCorrect = true;
          }
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
        dataUri,
        isHashCorrect
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
