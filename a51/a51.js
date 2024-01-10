import config from "../config/config.js";

class A51 {
  constructor() {
    this.byteSize = 8;

    this.sizeX = config.sizeX;
    this.sizeY = config.sizeY;
    this.sizeZ = config.sizeZ;

    this.regXClock = config.regXClock;
    this.regYZClock = config.regYZClock;

    this.x = Array(this.sizeX);
    this.y = Array(this.sizeY);
    this.z = Array(this.sizeZ);

    this.plainText = "";
    this.cipherText = "";

    this.key = BigInt(config.key).toString(2).padStart(64, "0");

    this.initializeRegisters();
  }

  initializeRegisters() {
    const key = this.key.split("");
    this.x = key.slice(0, this.sizeX).map((el) => parseInt(el));
    this.y = key
      .slice(this.sizeX, this.sizeX + this.sizeY)
      .map((el) => parseInt(el));
    this.z = key
      .slice(this.sizeX + this.sizeY, key.length)
      .map((el) => parseInt(el));
  }

  majorityVote(x, y, z) {
    const numberOfOnes = x + y + z;
    return numberOfOnes > 1 ? 1 : 0;
  }

  clock() {
    const m = this.majorityVote(
      this.x[this.regXClock],
      this.y[this.regYZClock],
      this.z[this.regYZClock]
    );

    if (this.x[this.regXClock] === m) {
      this.shiftRegister(this.x);
    }

    if (this.y[this.regYZClock] === m) {
      this.shiftRegister(this.y);
    }

    if (this.z[this.regYZClock] === m) {
      this.shiftRegister(this.z);
    }
  }

  shiftRegister(reg) {
    const t = this.generateNewBit(reg, reg.length);
    reg.pop();
    reg.unshift(t);
  }

  generateNewBit(reg, regSize) {
    if (regSize === this.sizeX) {
      return reg[13] ^ reg[16] ^ reg[17] ^ reg[18];
    }

    if (regSize === this.sizeY) {
      return reg[20] ^ reg[21];
    }

    if (regSize === this.sizeZ) {
      return reg[7] ^ reg[20] ^ reg[21] ^ reg[22];
    }
  }

  encrypt(plainText) {
    this.plainText = plainText;
    this.cipherText = "";

    for (let i = 0; i < this.plainText.length; i++) {
      let keystream = "";
      for (let j = 0; j < this.byteSize; j++) {
        this.clock();

        const k =
          this.x[this.sizeX - 1] ^
          this.y[this.sizeY - 1] ^
          this.z[this.sizeZ - 1];
        keystream += k;
      }
      const letterBinary = this.plainText[i].charCodeAt(0); // decimal

      const cipherLetter = parseInt(keystream, 2) ^ letterBinary;

      const letterAscii = String.fromCharCode(cipherLetter);
      const letterUnicode = String.fromCodePoint(cipherLetter);

      this.cipherText += letterAscii;
      // this.cipherText += letterUnicode;
    }

    return this.cipherText;
  }

  decrypt(cipherText) {
    this.cipherText = cipherText;
    this.plainText = "";

    for (let i = 0; i < this.cipherText.length; i++) {
      let keystream = "";
      for (let j = 0; j < this.byteSize; j++) {
        this.clock();

        const k =
          this.x[this.sizeX - 1] ^
          this.y[this.sizeY - 1] ^
          this.z[this.sizeZ - 1];
        keystream += k;
      }
      const letterBinary = this.cipherText[i].charCodeAt(0); // decimal

      const cipherLetter = parseInt(keystream, 2) ^ letterBinary;

      const letterAscii = String.fromCharCode(cipherLetter);
      const letterUnicode = String.fromCodePoint(cipherLetter);

      this.plainText += letterAscii;
      // this.plainText += letterUnicode;

    }

    return this.plainText;
  }
}

export default A51;
