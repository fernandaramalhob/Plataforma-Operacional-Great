import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src');
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.json']);

const replacements = new Map([
  ['Ã¡', 'á'],
  ['Ã ', 'à'],
  ['Ã¢', 'â'],
  ['Ã£', 'ã'],
  ['Ã¤', 'ä'],
  ['Ã©', 'é'],
  ['Ã¨', 'è'],
  ['Ãª', 'ê'],
  ['Ã«', 'ë'],
  ['Ã­', 'í'],
  ['Ã¬', 'ì'],
  ['Ã®', 'î'],
  ['Ã¯', 'ï'],
  ['Ã³', 'ó'],
  ['Ã²', 'ò'],
  ['Ã´', 'ô'],
  ['Ãµ', 'õ'],
  ['Ã¶', 'ö'],
  ['Ãº', 'ú'],
  ['Ã¹', 'ù'],
  ['Ã»', 'û'],
  ['Ã¼', 'ü'],
  ['Ã§', 'ç'],
  ['Ã', 'Á'],
  ['Ã€', 'À'],
  ['Ã‚', 'Â'],
  ['Ãƒ', 'Ã'],
  ['Ã„', 'Ä'],
  ['Ã‰', 'É'],
  ['Ãˆ', 'È'],
  ['ÃŠ', 'Ê'],
  ['Ã‹', 'Ë'],
  ['Ã', 'Í'],
  ['ÃŒ', 'Ì'],
  ['ÃŽ', 'Î'],
  ['Ã', 'Ï'],
  ['Ã“', 'Ó'],
  ['Ã’', 'Ò'],
  ['Ã”', 'Ô'],
  ['Ã•', 'Õ'],
  ['Ã–', 'Ö'],
  ['Ãš', 'Ú'],
  ['Ã™', 'Ù'],
  ['Ã›', 'Û'],
  ['Ãœ', 'Ü'],
  ['Ã‡', 'Ç'],
  ['Âº', 'º'],
  ['Âª', 'ª'],
  ['Â°', '°'],
  ['Â·', '·'],
  ['Â', ''],
  ['ðŸ†', '🏆'],
  ['ðŸ“', '📌'],
  ['ðŸš', '🚨'],
  ['ðŸ' , ''],
  ['â€”', '—'],
  ['â€“', '–'],
  ['â€œ', '“'],
  ['â€', '”'],
  ['â€˜', '‘'],
  ['â€™', '’'],
  ['â€¢', '•'],
  ['â€¦', '…'],
]);

const walk = (dir, files = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (exts.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
};

const targets = walk(root);
const changed = [];

for (const file of targets) {
  const original = fs.readFileSync(file, 'utf8');
  let updated = original;

  for (const [from, to] of replacements) {
    updated = updated.split(from).join(to);
  }

  if (updated !== original) {
    fs.writeFileSync(file, updated, 'utf8');
    changed.push(path.relative(process.cwd(), file));
  }
}

for (const file of changed) {
  console.log(file);
}
