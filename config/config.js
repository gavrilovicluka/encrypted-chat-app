const config = {
  key: 0x1123456789abcdefn,
  sizeX: 19,
  sizeY: 22,
  sizeZ: 23,
  regXClock: 8,
  regYZClock: 10,
};

export default config;

const xtea_config = {
  key: [0x01234567, 0x89abcdef, 0xfedcba98, 0x76543210], // 128-bit key
  delta: 0x9e3779b9,
  iv: [0x01234567, 0x89abcdef]
}

export { xtea_config };
