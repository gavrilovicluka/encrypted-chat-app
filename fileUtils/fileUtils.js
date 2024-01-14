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

async function encryptFile(file, selectedAlgorithm, a51Cipher, xteaCipher) {
  try {
    const fileBuffer = await readArrayBuffer(file);
    let stringBuffer = "";

    for (let i = 0; i < fileBuffer.length; i++) {
      stringBuffer += String.fromCharCode(fileBuffer[i]);
    }

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

function createFileBlob(encryptedFile) {
  const blob = new Blob([encryptedFile], { type: "text/plain" });
  return URL.createObjectURL(blob);
}

function getFileInputName(isReceived, file, fileInput) {
  if (isReceived) {
    return file; // Kada prikazuje fajl koji je primljen sa servera
  }

  if (fileInput.files.length > 0) {
    return fileInput.files[0].name;
  }
  return null;
}

async function generateFileHash(file, blake) {
  try {
    const fileBuffer = await readArrayBuffer(file);
    const hash = blake.hash(fileBuffer);

    // Konvertovanje hash vrednosti u hexadecimalni zapis
    const hexHash = Array.from(hash)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    return hexHash;
  } catch (error) {
    console.error(error.message);
  }
}

function generateStringHash(text, blake) {
  // Pretvaranje stringa u binarne podatke (Uint8Array)
  const inputData = new TextEncoder().encode(text);

  const hash = blake.hash(inputData);

  const hexHash = Array.from(hash)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return hexHash;
}

export {
  readArrayBuffer,
  encryptFile,
  createFileBlob,
  getFileInputName,
  generateFileHash,
  generateStringHash,
};
