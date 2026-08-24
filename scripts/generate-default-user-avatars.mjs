import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const AVATAR_COUNT = 34;
const outputDirectory = resolve("storage/static/avatars");
const previewPath = process.argv.find((argument) => argument.startsWith("--preview="))?.slice(10);
const workingDirectory = mkdtempSync(join(tmpdir(), "bowi-user-avatars-"));

const palettes = [
  ["#0B1638", "#22D3EE", "#8B5CF6"],
  ["#17103D", "#A855F7", "#F472B6"],
  ["#082B35", "#2DD4BF", "#60A5FA"],
  ["#25113A", "#FB7185", "#A78BFA"],
  ["#12233F", "#38BDF8", "#FBBF24"],
  ["#1E1838", "#C084FC", "#22D3EE"],
  ["#102A28", "#34D399", "#A3E635"],
  ["#30162B", "#FB7185", "#F59E0B"],
];
const skinTones = ["#F8D7C4", "#EFB997", "#D99872", "#B86F4E", "#8C4F38", "#633828"];
const hairColors = ["#111827", "#261B2F", "#3F2A23", "#6B3E2E", "#9A583E", "#D5B36A", "#C7CBD8", "#243C64"];
const shirtColors = ["#172554", "#312E81", "#164E63", "#4C1D95", "#7C2D12", "#064E3B", "#3F3F46", "#1E3A8A"];

function pick(values, seed, offset = 0) {
  return values[(seed * (offset * 2 + 3) + offset * 7) % values.length];
}

function hair(seed, color) {
  switch (seed % 8) {
    case 0:
      return `<path d="M38 59c0-24 13-38 34-38 23 0 34 17 31 42-7-14-19-21-34-22-11 0-21 6-31 18Z" fill="${color}"/><path d="M38 54c-7 12-6 34 1 46l12-6-5-33Z" fill="${color}"/>`;
    case 1:
      return `<path d="M37 61c-2-24 12-40 35-40 21 0 34 15 33 39-10-15-23-20-39-18-11 1-20 7-29 19Z" fill="${color}"/><path d="M42 41c10-13 30-18 47-8-14-1-22 6-27 14Z" fill="${color}" opacity=".86"/>`;
    case 2:
      return `<path d="M36 63c-2-26 12-43 36-43 25 0 38 19 34 46-8-17-18-24-31-25-14-1-26 6-39 22Z" fill="${color}"/><circle cx="45" cy="34" r="13" fill="${color}"/><circle cx="62" cy="27" r="14" fill="${color}"/><circle cx="81" cy="29" r="14" fill="${color}"/><circle cx="97" cy="40" r="12" fill="${color}"/>`;
    case 3:
      return `<path d="M36 63c0-27 14-43 36-43 23 0 36 18 34 45-10-16-21-23-36-23-13 0-24 7-34 21Z" fill="${color}"/><path d="M42 49c4-23 19-34 43-27-6 8-15 14-27 17-7 2-12 5-16 10Z" fill="${color}" opacity=".9"/>`;
    case 4:
      return `<path d="M39 61c-2-23 10-39 32-40 20-1 35 13 36 35-13-11-23-15-35-14-12 0-22 7-33 19Z" fill="${color}"/><path d="M93 26c8 2 14 9 15 17-7-5-13-7-20-7Z" fill="${color}"/>`;
    case 5:
      return `<path d="M35 62c0-27 14-42 37-42 25 0 38 19 34 46-8-16-20-24-36-24-13 0-24 7-35 20Z" fill="${color}"/><path d="M37 55c-9 14-8 40 2 54l13-9-7-43Zm68 0c9 14 8 40-2 54l-13-9 7-43Z" fill="${color}"/>`;
    case 6:
      return `<path d="M38 60c0-25 12-39 34-39 22 0 35 16 34 41-10-14-21-20-34-20-13 0-24 6-34 18Z" fill="${color}"/><path d="M49 35c12-11 29-15 46-5-13 0-21 6-28 15Z" fill="${color}" opacity=".82"/>`;
    default:
      return `<path d="M36 62c-1-26 13-42 37-42 23 0 36 18 33 45-9-16-20-23-35-23-13 0-25 7-35 20Z" fill="${color}"/><path d="M41 42c9-17 25-24 44-20-9 8-20 14-35 17Z" fill="${color}" opacity=".88"/>`;
  }
}

function accessory(seed, accent) {
  switch (seed % 6) {
    case 0:
      return `<g fill="none" stroke="${accent}" stroke-width="2.8"><rect x="47" y="59" width="18" height="12" rx="6"/><rect x="78" y="59" width="18" height="12" rx="6"/><path d="M65 64h13"/></g>`;
    case 1:
      return `<path d="M39 63c-5 1-7 7-6 14l3 9c1 4 5 5 8 2l4-4V62Zm66 0c5 1 7 7 6 14l-3 9c-1 4-5 5-8 2l-4-4V62Z" fill="${accent}"/><path d="M42 62c2-17 12-27 30-27 18 0 29 10 31 27" fill="none" stroke="${accent}" stroke-width="3"/>`;
    case 2:
      return `<path d="M95 75c10 0 14 6 13 13" fill="none" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/><circle cx="107" cy="90" r="3" fill="${accent}"/>`;
    case 3:
      return `<path d="M51 101h42l-5 13H56Z" fill="${accent}" opacity=".9"/><path d="m61 101 11 7 11-7" fill="none" stroke="#E0F2FE" stroke-width="2"/>`;
    case 4:
      return `<circle cx="101" cy="50" r="4" fill="${accent}"/><path d="M101 56v20" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/>`;
    default:
      return `<path d="M42 72c-6 9-5 21 2 28M102 72c6 9 5 21-2 28" fill="none" stroke="${accent}" stroke-width="2.5" stroke-linecap="round" opacity=".75"/>`;
  }
}

function portraitSvg(seed) {
  const [background, accent, secondary] = palettes[seed % palettes.length];
  const skin = pick(skinTones, seed, 1);
  const hairColor = pick(hairColors, seed, 2);
  const shirt = pick(shirtColors, seed, 3);
  const faceWidth = 28 + (seed % 4) * 2;
  const eyeOffset = seed % 3;
  const mouth = seed % 4 === 0 ? "M65 84q7 6 14 0" : seed % 4 === 1 ? "M66 85q6 3 12 0" : "M66 85h12";
  const eyebrowTilt = (seed % 3) - 1;
  const faceX = 72;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  <defs>
    <radialGradient id="bg" cx="32%" cy="20%" r="90%"><stop stop-color="${secondary}" stop-opacity=".38"/><stop offset=".5" stop-color="${background}"/><stop offset="1" stop-color="#050A18"/></radialGradient>
    <linearGradient id="coat" x1="38" y1="101" x2="108" y2="139"><stop stop-color="${shirt}"/><stop offset="1" stop-color="#080D1D"/></linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
    <clipPath id="frame"><rect x="3" y="3" width="138" height="138" rx="30"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="144" height="144" fill="url(#bg)"/>
    <circle cx="72" cy="67" r="49" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="9 7" opacity=".34"/>
    <path d="M18 81c15-41 59-65 105-34" fill="none" stroke="${secondary}" stroke-width="2" stroke-linecap="round" opacity=".42"/>
    <circle cx="22" cy="80" r="3.5" fill="${accent}"/><circle cx="122" cy="47" r="3" fill="${secondary}"/>
    <circle cx="72" cy="65" r="37" fill="${accent}" opacity=".12" filter="url(#glow)"/>
    <path d="M28 144c3-26 18-42 44-42s41 16 44 42Z" fill="url(#coat)"/>
    <path d="M58 97v15c4 8 24 8 28 0V97Z" fill="${skin}"/>
    <path d="M58 102c7 5 21 5 28 0v6c-8 7-21 7-28 0Z" fill="#7C2D12" opacity=".12"/>
    <ellipse cx="${faceX}" cy="67" rx="${faceWidth}" ry="39" fill="${skin}"/>
    <ellipse cx="42" cy="69" rx="5" ry="8" fill="${skin}"/><ellipse cx="102" cy="69" rx="5" ry="8" fill="${skin}"/>
    ${hair(seed, hairColor)}
    <path d="M51 ${57 + eyebrowTilt}q7-4 13 0M80 ${57 - eyebrowTilt}q7-4 13 0" fill="none" stroke="${hairColor}" stroke-width="2.5" stroke-linecap="round" opacity=".82"/>
    <ellipse cx="58" cy="66" rx="2.4" ry="${3 + eyeOffset * 0.25}" fill="#172033"/><ellipse cx="86" cy="66" rx="2.4" ry="${3 + eyeOffset * 0.25}" fill="#172033"/>
    <circle cx="57.3" cy="65.1" r=".7" fill="#FFF"/><circle cx="85.3" cy="65.1" r=".7" fill="#FFF"/>
    <path d="M70 67q-2 9 3 11" fill="none" stroke="#8C4F38" stroke-width="1.6" stroke-linecap="round" opacity=".44"/>
    <path d="${mouth}" fill="none" stroke="#8F3F4E" stroke-width="2.1" stroke-linecap="round"/>
    ${seed % 5 === 0 ? `<path d="M54 78q18 9 36 0c-2 18-9 25-18 25s-16-7-18-25Z" fill="${hairColor}" opacity=".76"/>` : ""}
    ${accessory(seed, accent)}
    <path d="M45 144c2-18 7-29 14-36l13 11 13-11c8 7 13 18 15 36" fill="none" stroke="${accent}" stroke-width="2" opacity=".78"/>
    <path d="M119 18v11m-5.5-5.5h11" stroke="#E0F2FE" stroke-width="2" stroke-linecap="round" opacity="${seed % 2 ? 0.9 : 0.55}"/>
  </g>
  <rect x="2" y="2" width="140" height="140" rx="31" fill="none" stroke="${accent}" stroke-width="2" opacity=".34"/>
</svg>`;
}

function renderPng(svgPath, pngPath, width, height = width) {
  execFileSync("rsvg-convert", [
    "-w",
    String(width),
    "-h",
    String(height),
    svgPath,
    "-o",
    pngPath,
  ]);
}

try {
  for (let index = 1; index <= AVATAR_COUNT; index += 1) {
    const svgPath = join(workingDirectory, `${index}.svg`);
    writeFileSync(svgPath, portraitSvg(index), "utf8");
    renderPng(svgPath, join(outputDirectory, `${index}.png`), 128);
  }

  if (previewPath) {
    const cell = 144;
    const columns = 9;
    const rows = Math.ceil(AVATAR_COUNT / columns);
    const images = Array.from({ length: AVATAR_COUNT }, (_, offset) => {
      const index = offset + 1;
      const x = (offset % columns) * cell;
      const y = Math.floor(offset / columns) * cell;
      const data = readFileSync(join(outputDirectory, `${index}.png`)).toString("base64");
      return `<image x="${x + 8}" y="${y + 8}" width="112" height="112" href="data:image/png;base64,${data}"/><text x="${x + 64}" y="${y + 136}" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="12">${index}</text>`;
    }).join("");
    const previewSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${columns * cell}" height="${rows * cell}"><rect width="100%" height="100%" fill="#05070D"/>${images}</svg>`;
    const previewSvgPath = join(workingDirectory, "preview.svg");
    writeFileSync(previewSvgPath, previewSvg, "utf8");
    renderPng(previewSvgPath, resolve(previewPath), columns * cell, rows * cell);
  }
} finally {
  rmSync(workingDirectory, { recursive: true, force: true });
}
