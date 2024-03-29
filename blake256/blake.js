class Blake256 {
  constructor() {
    this.h = new Uint32Array(8);
    this.s = new Uint32Array(4);
    this.t = BigInt(0);
    this.bufferLength = 0;
    this.isNullTerminated = false;
    this.buf = new Uint8Array(64);
    this.v = new Uint32Array(16);
    this.m = new Uint32Array(16);
    this.numberOfRounds = 14;
    this.g_sigma = [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 
      14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3, 
      11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4, 
      7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8, 
      9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13, 
      2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9, 
      12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11, 
      13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10, 
      6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5, 
      10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0, 
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
      14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3, 
      11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4, 
      7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8
    ];
    this.c = [
      0x243f6a88, 0x85a308d3, 0x13198a2e, 0x03707344, 0xa4093822, 0x299f31d0,
      0x082efa98, 0xec4e6c89, 0x452821e6, 0x38d01377, 0xbe5466cf, 0x34e90c6c,
      0xc0ac29b7, 0xc97c50dd, 0x3f84d5b5, 0xb5470917,
    ];
    this.g_padding = new Uint8Array([
      0x80, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    this.hashSizeValue = 256;
    this.initialize();
  }

  static bytesToUInt32(bytes, offset) {
    return (
      (bytes[offset + 3] |
        (bytes[offset + 2] << 8) |
        (bytes[offset + 1] << 16) |
        (bytes[offset] << 24)) >>>
      0
    );
  }

  static uint32ToBytes(u, outputBytes, offset) {
    outputBytes[offset] = (u >>> 24) & 0xff;
    outputBytes[offset + 1] = (u >>> 16) & 0xff;
    outputBytes[offset + 2] = (u >>> 8) & 0xff;
    outputBytes[offset + 3] = u & 0xff;
  }

  static rotateRight(u, nBits) {
    return ((u >>> nBits) | (u << (32 - nBits))) >>> 0;
  }

  g(a, b, c, d, r, i) {
    let p = (r << 4) + i;
    let p0 = this.g_sigma[p];
    let p1 = this.g_sigma[p + 1];

    this.v[a] += this.v[b] + (this.m[p0] ^ this.c[p1]);
    this.v[d] = Blake256.rotateRight(this.v[d] ^ this.v[a], 16);
    this.v[c] += this.v[d];
    this.v[b] = Blake256.rotateRight(this.v[b] ^ this.v[c], 12);
    this.v[a] += this.v[b] + (this.m[p1] ^ this.c[p0]);
    this.v[d] = Blake256.rotateRight(this.v[d] ^ this.v[a], 8);
    this.v[c] += this.v[d];
    this.v[b] = Blake256.rotateRight(this.v[b] ^ this.v[c], 7);
  }

  compress(block, offset) {
    for (let i = 0; i < 16; ++i)
      this.m[i] = Blake256.bytesToUInt32(block, offset + (i << 2));

    this.v.set(this.h);
    this.v[8] = this.s[0] ^ this.c[0];
    this.v[9] = this.s[1] ^ this.c[1];
    this.v[10] = this.s[2] ^ this.c[2];
    this.v[11] = this.s[3] ^ this.c[3];
    this.v[12] = this.c[4];
    this.v[13] = this.c[5];
    this.v[14] = this.c[6];
    this.v[15] = this.c[7];

    if (!this.isNullTerminated) {
      let uLen = (this.t & BigInt(0xffffffff)) > 0n;

      this.v[12] ^= Number(uLen);
      this.v[13] ^= Number(uLen);
      uLen = ((this.t >> BigInt(32)) & BigInt(0xffffffff)) >> 0n;
      this.v[14] ^= Number(uLen);
      this.v[15] ^= Number(uLen);
    }

    for (let r = 0; r < this.numberOfRounds; ++r) {
      this.g(0, 4, 8, 12, r, 0);
      this.g(1, 5, 9, 13, r, 2);
      this.g(2, 6, 10, 14, r, 4);
      this.g(3, 7, 11, 15, r, 6);
      this.g(3, 4, 9, 14, r, 14);
      this.g(2, 7, 8, 13, r, 12);
      this.g(0, 5, 10, 15, r, 8);
      this.g(1, 6, 11, 12, r, 10);
    }

    for (let i = 0; i < 8; ++i) this.h[i] ^= this.v[i];
    for (let i = 0; i < 8; ++i) this.h[i] ^= this.v[i + 8];

    for (let i = 0; i < 4; ++i) this.h[i] ^= this.s[i];
    for (let i = 0; i < 4; ++i) this.h[i + 4] ^= this.s[i];
  }

  initialize() {
    this.h[0] = 0x6a09e667;
    this.h[1] = 0xbb67ae85;
    this.h[2] = 0x3c6ef372;
    this.h[3] = 0xa54ff53a;
    this.h[4] = 0x510e527f;
    this.h[5] = 0x9b05688c;
    this.h[6] = 0x1f83d9ab;
    this.h[7] = 0x5be0cd19;

    this.s.fill(0);
    this.t = BigInt(0);
    this.bufferLength = 0;
    this.isNullTerminated = false;

    this.buf.fill(0);
  }

  update(array) {
    let iOffset = 0;
    let nFill = 64 - this.bufferLength;

    if (this.bufferLength > 0 && array.length >= nFill) {
      this.buf.set(array.subarray(iOffset, iOffset + nFill), this.bufferLength);
      this.t += 512n;
      this.compress(this.buf, 0);
      iOffset += nFill;
      array = array.subarray(nFill);
      this.bufferLength = 0;
    }

    while (array.length >= 64) {
      this.t += 512n;
      this.compress(array, iOffset);
      iOffset += 64;
      array = array.subarray(64);
    }

    if (array.length > 0) {
      this.buf.set(array, this.bufferLength);
      this.bufferLength += array.length;
    } else {
      this.bufferLength = 0;
    }
  }

  finalize() {
    const messageLengthBytes = new Uint8Array(8);
    const uLen = this.t + BigInt(this.bufferLength << 3);
    Blake256.uint32ToBytes(
      Number((uLen >> 32n) & 0xffffffffn),
      messageLengthBytes,
      0
    );
    Blake256.uint32ToBytes(Number(uLen & 0xffffffffn), messageLengthBytes, 4);

    if (this.bufferLength === 55) {
      this.t -= 8n;
      this.update(new Uint8Array([0x81]));
    } else {
      if (this.bufferLength < 55) {
        if (this.bufferLength === 0) this.isNullTerminated = true;
        this.t -= 440n - BigInt(this.bufferLength << 3);
        this.update(this.g_padding.subarray(0, 55 - this.bufferLength));
      } else {
        this.t -= 512n - BigInt(this.bufferLength << 3);
        this.update(this.g_padding.subarray(0, 64 - this.bufferLength));
        this.t -= 440n;
        this.update(this.g_padding.subarray(1, 56));
        this.isNullTerminated = true;
      }
      this.update(new Uint8Array([0x01]));
      this.t -= 8n;
    }

    this.t -= 64n;
    this.update(messageLengthBytes);

    const pbDigest = new Uint8Array(32);
    for (let i = 0; i < 8; ++i)
      Blake256.uint32ToBytes(this.h[i], pbDigest, i << 2);

    return pbDigest;
  }

  digest() {
    return this.finalize();
  }

  reset() {
    this.initialize();
  }

  hash(array) {
    this.update(array);
    const hash = this.digest();
    this.reset();

    return hash;
  }
}

export default Blake256;
