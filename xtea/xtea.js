import { xtea_config } from "../config/config.js";

class XTEA {
  constructor() {
    this.key = xtea_config.key;
    this.delta = xtea_config.delta;
    this.numRounds = 32;
    this.iv = xtea_config.iv;
  }

  encrypt(plaintText) {
    return this.xteaEncryptBlocks(plaintText);
  }

  decrypt(cipherText) {
    return this.xteaDecryptBlocks(cipherText);
  }

  xtea_encrypt(plainText) {
    let v0 = plainText[0];
    let v1 = plainText[1];
    let sum = 0;

    for (let i = 0; i < this.numRounds; i++) {
      sum = (sum + this.delta) >>> 0;
      v0 =
        (v0 + ((((v1 << 4) ^ (v1 >>> 5)) + v1) ^ (sum + this.key[sum & 3]))) >>>
        0;
      v1 =
        (v1 +
          ((((v0 << 4) ^ (v0 >>> 5)) + v0) ^
            (sum + this.key[(sum >>> 11) & 3]))) >>>
        0;
    }

    return [v0, v1];
  }

  xtea_decrypt(cipherText) {
    let v0 = cipherText[0];
    let v1 = cipherText[1];
    let sum = (this.delta * this.numRounds) >>> 0;

    for (let i = 0; i < this.numRounds; i++) {
      v1 =
        (v1 -
          ((((v0 << 4) ^ (v0 >>> 5)) + v0) ^
            (sum + this.key[(sum >>> 11) & 3]))) >>>
        0;
      v0 =
        (v0 - ((((v1 << 4) ^ (v1 >>> 5)) + v1) ^ (sum + this.key[sum & 3]))) >>>
        0;
      sum = (sum - this.delta) >>> 0;
    }

    return [v0, v1];
  }

  xteaEncryptBlocks(plainTextString, key) {

    const plainTextBlocks = this.stringToBlocks(plainTextString);
    console.log(plainTextString);   // 'aaa'
    console.log(plainTextBlocks);   // Za 'aaa': [97, 97, 97, 0], [0, 0, 0, 0]

    let iv = this.iv;
    let encryptedBlocks = [];
    let blocks = [];

    if (plainTextBlocks.length % 2 === 1) {
      plainTextBlocks.push([0, 0, 0, 0]);
    }
    
    for (let i = 0; i < plainTextBlocks.length; i += 2) {      
      blocks.push(this.decimalToHex(plainTextBlocks[i]));
      blocks.push(this.decimalToHex(plainTextBlocks[i + 1]));
      console.log(blocks)

      // Block - niz sa dva elementa u decimalnom zapisu [1633771776, 0]
      let block = [];
      block.push(blocks[i]);
      block.push(blocks[i + 1]);    
      

      // const encryptedBlock = this.xtea_encrypt(block, key); // ako se koristi samo XTEA

      // OFB
      let encryptedBlock = this.xtea_encrypt(iv); 
      console.log(i, " ENCRYPTED BLOCK: ", encryptedBlock)
      iv = [...encryptedBlock];
      
      encryptedBlock[0] = BigInt(encryptedBlock[0]) ^ BigInt(blocks[i]);   // Ciphertext = EncryptedOutput XOR Plaintext
      encryptedBlock[1] = BigInt(encryptedBlock[1]) ^ BigInt(blocks[i + 1]);
      encryptedBlocks.push(encryptedBlock);
    }

    // console.log(encryptedBlocks); // [3469828722, 1534862451]
    // console.log(this.blocksToString(encryptedBlocks));

    console.log('1', encryptedBlocks);
    return encryptedBlocks;
  }

  xteaDecryptBlocks(cipherTextBlocks, key) {
    console.log(cipherTextBlocks);  // normalan slucaj: [[925311952, 1550945596], [3342674534, 4175190515]]
                                    // los slucaj: 925311952,1550945596,3342674534,4175190515
    let decryptedBlocks = [];
    let iv = this.iv;

    if(!Array.isArray(cipherTextBlocks)) {
      cipherTextBlocks = this.toValidBlockForm(`${cipherTextBlocks}`);
    }
    console.log(cipherTextBlocks);
    // if (cipherTextBlocks.length > 10) {
    //     cipherTextBlocks = this.toValidBlockForm(cipherTextBlocks);
    // }
    
    for (const block of cipherTextBlocks) {
      // const decryptedBlock = this.xtea_decrypt(block, key);  // ako se koristi samo XTEA
      console.log("SINLE BLOCK: ", block)
      // OFB
      let decryptedBlock = this.xtea_encrypt(iv); // Kod OFB se za dekripciju koristi algoritam za enkripciju kodera bloka
      console.log('1', decryptedBlock);
      iv = [...decryptedBlock];
      console.log('2', iv);
      decryptedBlock[0] = BigInt(decryptedBlock[0]) ^ BigInt(block[0]);
      decryptedBlock[1] = BigInt(decryptedBlock[1]) ^ BigInt(block[1]);

      console.log("DECRYPTED BLOCK: ", decryptedBlock)
      decryptedBlocks.push(decryptedBlock);
    }

    console.log("BLOCKS: ", decryptedBlocks)
    return this.blocksToString(decryptedBlocks);
  }

  stringToBlocks(str) {
    const blockLength = 4;
    const numBlocks = Math.ceil(str.length / blockLength);
    const blocks = [];

    for (let i = 0; i < numBlocks; i++) {
      const block = [];
      for (let j = 0; j < blockLength; j++) {
        const charCode = str.charCodeAt(i * blockLength + j) || 0;
        block.push(charCode);
      }
      blocks.push(block);
    }

    return blocks;
  }

  //   convertToHexBlock(array) {
  //     const hexArray = this.convertToHexArray(array);
  //     const concatenatedHex = hexArray.map((hex) => hex.slice(2)).join("");
  //     const result = "0x" + concatenatedHex;
  //     return result;
  //   }

  //   convertToHexArray(array) {
  //     return array.map((value) => "0x" + value.toString(16));
  //   }

  decimalToHex(decimalArr) {
    // Konvertovanje decimalne vrednosti u heksadecimalni string
    let hexString = decimalArr
      .map(function (decimal) {
        return decimal.toString(16).padStart(2, "0");
      })
      .join("");

    const hexNumber = parseInt(hexString, 16);
    return hexNumber;
  }

  blocksToString(blocks) {
    
    blocks = blocks
      .map((arr) =>
        arr.map((value) => this.removeZerosFromEnd(value.toString(16))).join("")
      )
      .join("");

    let result = "";
    for (let i = 0; i < blocks.length; i += 2) {
      let char = "";
      char += blocks[i] + blocks[i + 1];
      result += String.fromCharCode(parseInt(char, 16)); // parametar treba da bude u decimalnom zapisu
    }

    return result;
  }

  removeZerosFromEnd(input) {
    let trimmedValue = input;

    while (trimmedValue.endsWith("0")) {
      trimmedValue = trimmedValue.slice(0, -1);
    }

    let result = trimmedValue;

    if (result.length % 2 !== 0) {
      result += 0;
    }
    return result;
  }

  toValidBlockForm(input) {
    const numbers = input.split(",");

    // Od 925311952,1550945596,3342674534,4175190515 pravi [[925311952, 1550945596], [3342674534, 4175190515]]
    // Mapiranje niza tako da svaka dva broja cine podniz
    const result = numbers.reduce((acc, num, index, array) => {
      if (index % 2 === 0) {
        acc.push([parseInt(num, 10), parseInt(array[index + 1], 10)]);
      }
      return acc;
    }, []);

    return result
  }
}

export default XTEA;
