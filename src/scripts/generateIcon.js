const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createAstraIcon(filePath, width = 256, height = 256) {
  const buffer = Buffer.alloc(width * height * 4);

  const cx = width / 2;
  const cy = height / 2;
  const r = width * 0.45;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      if (dist <= r) {
        const t = (x + y) / (width + height);
        buffer[idx] = Math.round(99 + (6 - 99) * t);
        buffer[idx + 1] = Math.round(102 + (182 - 102) * t);
        buffer[idx + 2] = Math.round(241 + (212 - 241) * t);
        buffer[idx + 3] = dist > r - 1 ? Math.round(255 * (r - dist)) : 255;
      } else {
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 0;
      }
    }
  }

  const rawData = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0;
    buffer.copy(rawData, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const deflated = zlib.deflateSync(rawData);
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13 + 12);
  ihdr.writeUInt32BE(13, 0);
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr.writeUInt8(8, 16);
  ihdr.writeUInt8(6, 17);
  ihdr.writeUInt8(0, 18);
  ihdr.writeUInt8(0, 19);
  ihdr.writeUInt8(0, 20);
  ihdr.writeUInt32BE(zlib.crc32(ihdr.subarray(4, 21)), 21);

  // IDAT chunk
  const idat = Buffer.alloc(deflated.length + 12);
  idat.writeUInt32BE(deflated.length, 0);
  idat.write('IDAT', 4);
  deflated.copy(idat, 8);
  idat.writeUInt32BE(zlib.crc32(idat.subarray(4, idat.length - 4)), idat.length - 4);

  // IEND chunk
  const iend = Buffer.alloc(12);
  iend.writeUInt32BE(0, 0);
  iend.write('IEND', 4);
  iend.writeUInt32BE(zlib.crc32(iend.subarray(4, 8)), 8);

  const png = Buffer.concat([header, ihdr, idat, iend]);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, png);
  console.log(`Created ${width}x${height} icon successfully at:`, filePath);
  return png;
}

// Generate 256x256 PNG
const targetPng = path.join(__dirname, '../../resources/icon.png');
const pngBuffer = createAstraIcon(targetPng, 256, 256);

// Build valid ICO wrapping the 256x256 PNG
function createIcoFromPng(pngBuf, icoPath) {
  // ICO Header: 6 bytes
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
  icoHeader.writeUInt16LE(1, 4); // 1 Image

  // Directory Entry: 16 bytes
  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0); // 0 means 256 width
  entry.writeUInt8(0, 1); // 0 means 256 height
  entry.writeUInt8(0, 2); // Color palette
  entry.writeUInt8(0, 3); // Reserved
  entry.writeUInt16LE(1, 4); // Color planes
  entry.writeUInt16LE(32, 6); // Bits per pixel
  entry.writeUInt32LE(pngBuf.length, 8); // Size of PNG data
  entry.writeUInt32LE(22, 12); // Offset to PNG data (6 + 16 = 22)

  const icoBuffer = Buffer.concat([icoHeader, entry, pngBuf]);
  fs.writeFileSync(icoPath, icoBuffer);
  console.log('Created valid 256x256 ICO file at:', icoPath);
}

createIcoFromPng(pngBuffer, path.join(__dirname, '../../resources/icon.ico'));
