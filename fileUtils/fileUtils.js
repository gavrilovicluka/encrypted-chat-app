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
      // stringBuffer += String.fromCodePoint(fileBuffer[i]);
      stringBuffer += String.fromCharCode(fileBuffer[i]);
    }
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

    console.log(encryptedMessage);
    return encryptedMessage;
  } catch (error) {
    console.error(error);
  }
}

function createFileBlob(encryptedFile) {
  console.log(encryptedFile)
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
    console.log(file);
    console.log(fileBuffer);
    // Koristite Blake256 za izračunavanje hash vrednosti
    const hash = blake.hash(fileBuffer);

    // Konvertovanje hash vrednosti u hexadecimalni zapis
    const hexHash = Array.from(hash)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    // Prikaz rezultata
    console.log("Ime fajla: ", file.name);
    console.log("Blake256 hash vrednost: ", hexHash);

    return hexHash;
  } catch (error) {
    console.error(error.message);
  }
}

function generateStringHash(text, blake) {
  // Pretvaranje stringa u binarne podatke (Uint8Array)
  const inputData = new TextEncoder().encode(text);

  // Dobijanje heš vrednosti (digest)
  const hash = blake.hash(inputData);

  // Konvertovanje heš vrednosti u hexadecimalni zapis radi lakšeg prikaza
  const hexHash = Array.from(hash)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  // Prikaz rezultata
  console.log("Originalni string: ", text);
  console.log("Blake256 heš vrednost: ", hexHash);

  return hexHash;
}

export {
  readArrayBuffer,
  encryptFile,
  createFileBlob,
  getFileInputName,
  generateFileHash,
  generateStringHash
};
