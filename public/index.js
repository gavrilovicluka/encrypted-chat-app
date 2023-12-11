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

const a51 = new A51();

let showEncrypted = false;
messageInput.disabled = !userName;

eventSource.addEventListener("newMessage", (event) => {
  const data = JSON.parse(event.data);

  if (userName !== data.clientName) {
    const decryptedMessage = a51.decrypt(data.message);
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
    const encryptedMessage = a51.encrypt(message);
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
    const decryptedMessage = a51.decrypt(messageSplit[1]);

    if (messageSplit[0] === userName) {
      appendMessage(
        `You (encrypted): ${messageSplit[1]}\nYou: ${decryptedMessage}`
      );
    } else {
      appendMessage(
        `${messageSplit[0]} (encrypted): ${messageSplit[1]}\n${messageSplit[0]}: ${decryptedMessage}`
      );
    }
  });
}

function showDecryptedMessages(data) {
  data.forEach((message) => {
    const messageSplit = message.split(": ");
    const decryptedMessage = a51.decrypt(messageSplit[1]);

    if (messageSplit[0] === userName) {
      appendMessage(`You: ${decryptedMessage}`);
    } else {
      appendMessage(`${messageSplit[0]}: ${decryptedMessage}`);
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
      a51.initializeRegisters();

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
