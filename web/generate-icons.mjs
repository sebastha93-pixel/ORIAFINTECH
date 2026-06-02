import sharp from 'sharp';

// ORIA logo SVG — dark navy background, green arc, white text
function makeSVG(size) {
  const cx = size / 2;
  const r  = size * 0.36;
  const sw = size * 0.07;
  // Arc: 230° sweep starting at -230° (bottom-left gap)
  const startAngle = -200 * (Math.PI / 180);
  const endAngle   =  50  * (Math.PI / 180);
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cx + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cx + r * Math.sin(endAngle);
  const fontSize = size * 0.20;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#081426"/>
  <path d="M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}"
        fill="none" stroke="#31D67B" stroke-width="${sw}" stroke-linecap="round"/>
  <text x="${cx}" y="${cx + fontSize * 0.38}"
        font-family="'Arial Black', Arial, sans-serif"
        font-weight="900" font-size="${fontSize}"
        fill="#FFFFFF" text-anchor="middle" letter-spacing="${size * 0.02}">ORIA</text>
</svg>`;
}

await sharp(Buffer.from(makeSVG(512))).png().toFile('public/icon-512.png');
await sharp(Buffer.from(makeSVG(192))).png().toFile('public/icon-192.png');
await sharp(Buffer.from(makeSVG(180))).png().toFile('public/apple-touch-icon.png');
await sharp(Buffer.from(makeSVG(32))).png().toFile('public/favicon.png');

console.log('Icons generated: icon-512.png, icon-192.png, apple-touch-icon.png, favicon.png');
