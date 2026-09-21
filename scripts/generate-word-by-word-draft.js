/**
 * CLI: seed a word-by-word draft for every verse of a single song.
 *
 * Usage:
 *     node scripts/generate-word-by-word-draft.js songs/<song-slug>.md
 *     node scripts/generate-word-by-word-draft.js <song-slug>
 *
 * For each verse without `word_by_word`, the script tokenises the verse
 * `text` lines and writes a draft entry like:
 *
 *     **kali** — ; **kukkura** — ; **kadana** — .
 *
 * The corresponding `json/songs/<slug>.json` is loaded, mutated, and the
 * markdown file is re-rendered via `songbook-md-json-parser`.
 */

const fs = require('fs');
const path = require('path');
const { Song } = require('songbook-md-json-parser');

const TAG_RE = /<[^>]+>/g;
// A "word" is a run of letters (incl. diacritics) and digits; the trailing
// "sep" captures everything else (spaces, hyphens, commas, dots, …) so that
// tokens recombined with their seps reproduce the source text exactly.
const WORD_RE = /([\p{L}\p{M}\d]+)([^\p{L}\p{M}\d]*)/gu;

/**
 * Tokenize a verse line into `{ word, sep }` pairs where `sep` is the
 * original trailing separator (spaces/commas/dots/hyphens). Tokens
 * recombined with their seps reproduce the source text exactly.
 */
function tokenizeLine(aLine) {
    const line = aLine.replace(TAG_RE, '').trim();
    if (!line) return [];
    const tokens = [];
    const re = new RegExp(WORD_RE.source, 'gu');
    let m;
    while ((m = re.exec(line)) !== null) {
        tokens.push({ word: m[1], sep: m[2] });
    }
    return tokens;
}

/**
 * Build a `**w1** — ; **w2** — ; … **wN** — .` draft string from a
 * verse's `text` array. Returns an empty string if no words are found.
 */
function buildDraftEntry(textLines) {
    const words = [];
    for (const line of textLines || []) {
        for (const tok of tokenizeLine(line)) {
            words.push(tok.word);
        }
    }
    if (words.length === 0) return '';
    return words
        .map((w, i) => `**${w}** — ${i === words.length - 1 ? '.' : ';'}`)
        .join(' ');
}

function main() {
    const arg = process.argv[2];
    if (!arg) {
        console.error('Usage: node scripts/generate-word-by-word-draft.js <songs/song-slug.md>');
        process.exit(1);
    }

    const projectDir = path.resolve(__dirname, '..');
    const slug = path.basename(arg, path.extname(arg));
    const jsonPath = path.join(projectDir, 'json', 'songs', slug + '.json');
    const mdPath = path.join(projectDir, 'songs', slug + '.md');

    if (!fs.existsSync(jsonPath)) {
        console.error(`Parsed JSON not found: ${jsonPath}`);
        process.exit(1);
    }

    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    let added = 0;
    (json.verses || []).forEach(verse => {
        if (verse.word_by_word && verse.word_by_word.length) return;
        const draft = buildDraftEntry(verse.text);
        if (!draft) return;
        verse.word_by_word = [draft];
        added++;
    });

    if (added === 0) {
        console.log(`No changes for ${slug} (all verses already have word-by-word).`);
        return;
    }

    const md = new Song({ json }).render();
    fs.writeFileSync(mdPath, md);
    console.log(`Updated ${path.relative(projectDir, mdPath)} (+${added} draft${added === 1 ? '' : 's'})`);
}

main();

module.exports = { tokenizeLine, buildDraftEntry };
