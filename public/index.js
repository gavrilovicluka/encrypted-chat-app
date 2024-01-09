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

let showEncrypted = false;
let selectedAlgorithm = document.querySelector(
  'input[name="algorithm"]:checked'
).value;
const a51Cipher = new A51();
const xteaCipher = new XTEA();
messageInput.disabled = !userName;

eventSource.addEventListener("newMessage", (event) => {
  const data = JSON.parse(event.data);

  if (userName !== data.clientName) {
    let decryptedMessage;
    switch (
      data.cipher // Tip algoritma prosledjuje server
    ) {
      case "a51":
        decryptedMessage = a51Cipher.decrypt(data.message);
        break;

      case "xtea":
        decryptedMessage = xteaCipher.decrypt(data.message);
        break;

      default:
        break;
    }

    if (showEncrypted) {
      appendMessage(
        `${data.clientName} (encrypted): ${data.message}\n${data.clientName}: ${decryptedMessage}`
      );
    } else {
      appendMessage(`${data.clientName}: ${decryptedMessage}`);
    }
  }
});

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const message = messageInput.value;

  if (message !== "" && message !== null && message !== undefined) {
    let encryptedMessage;
    switch (selectedAlgorithm) {
      case "a51":
        encryptedMessage = a51Cipher.encrypt(message);
        break;

      case "xtea":
        encryptedMessage = xteaCipher.encrypt(message);
        break;

      default:
        break;
    }
    if (showEncrypted) {
      appendMessage(`You (encrypted): ${encryptedMessage}\nYou: ${message}`);
    } else {
      appendMessage(`You: ${message}`);
    }

    fetch("/sendMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Name": userName,
        "Client-Id": clientId,
        Cipher: selectedAlgorithm,
      },
      body: JSON.stringify({ encryptedMessage }),
    })
      .then(() => {
        messageInput.value = "";
      })
      .catch((error) => {
        console.error("Error sending message:", error);
      });
  }
});

for (const radioButton of radioButtons) {
  radioButton.addEventListener("change", () => {
    selectedAlgorithm = document.querySelector(
      'input[name="algorithm"]:checked'
    ).value;
  });
}

function appendMessage(message) {
  const messageElement = document.createElement("div");
  messageElement.className = "message-text";
  messageElement.innerText = message;
  messageContainer.append(messageElement);

  messageContainer.scrollTop = messageContainer.scrollHeight;
}

function clearMessages() {
  while (messageContainer.firstChild) {
    messageContainer.removeChild(messageContainer.firstChild);
  }
}

function showEncryptedMessages(data) {
  data.forEach((message) => {
    const messageSplit = message.split(": ");
    // const decryptedMessage = cipher.decrypt(messageSplit[1]);  // Iz verzije sa A51
    const nameAndCipher = messageSplit[0].split("/"); // ime/cipher
    let decryptedMessage;
    switch (nameAndCipher[1]) {
      case "a51":
        decryptedMessage = a51Cipher.encrypt(messageSplit[1]);
        break;

      case "xtea":
        decryptedMessage = xteaCipher.encrypt(messageSplit[1]);
        break;

      default:
        break;
    }

    if (messageSplit[0] === userName) {
      appendMessage(
        `You (encrypted): ${messageSplit[1]}\nYou: ${decryptedMessage}`
      );
    } else {
      appendMessage(
        `${nameAndCipher[0]} (encrypted): ${messageSplit[1]}\n${nameAndCipher[0]}: ${decryptedMessage}`
      );
    }
  });
}

function showDecryptedMessages(data) {
  data.forEach((message) => {
    const messageSplit = message.split(": "); // ime/cipher: poruka
    // const decryptedMessage = cipher.decrypt(messageSplit[1]);  // Iz verzije sa A51
    const nameAndCipher = messageSplit[0].split("/"); // ime/cipher
    let decryptedMessage;
    console.log(nameAndCipher[0], nameAndCipher[1]);
    switch (nameAndCipher[1]) {
      case "a51":
        decryptedMessage = a51Cipher.decrypt(messageSplit[1]);
        break;

      case "xtea":
        decryptedMessage = xteaCipher.decrypt(messageSplit[1]);
        break;

      default:
        break;
    }

    if (nameAndCipher[0] === userName) {
      appendMessage(`You: ${decryptedMessage}`);
    } else {
      appendMessage(`${nameAndCipher[0]}: ${decryptedMessage}`);
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
