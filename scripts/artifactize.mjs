// Turns Vite's single-file build (dist/index.html) into the shape the claude.ai Artifact
// host expects: no <!doctype>/<html>/<head>/<body> (the host adds its own skeleton),
// <title> first so it lands in the first 8 KB, then font links, styles, markup, scripts.
// Output: dist/artifact.html. See docs/deployment.md.
import { readFileSync, statSync, writeFileSync } from 'node:fs';

const src = readFileSync('dist/index.html', 'utf8');
const lower = src.toLowerCase();

const headStart = lower.indexOf('<head>');
const bodyStart = lower.indexOf('<body>');
const bodyEnd = lower.lastIndexOf('</body>');
if (headStart < 0 || bodyStart < 0 || bodyEnd < 0) throw new Error('Unexpected build output: missing head/body');

const parts = { title: [], link: [], style: [], script: [], markup: [] };

/** Splits a fragment into top-level elements we care about. Inline JS escapes `</script`. */
function scan(from, to, intoMarkup) {
  let i = from;
  while (i < to) {
    const lt = src.indexOf('<', i);
    if (lt < 0 || lt >= to) break;
    const tag = lower.slice(lt, lt + 8);
    const closeOf = (name) => {
      const end = lower.indexOf(`</${name}>`, lt);
      if (end < 0) throw new Error(`Unclosed <${name}>`);
      return end + name.length + 3;
    };
    let end;
    if (tag.startsWith('<title')) parts.title.push(src.slice(lt, (end = closeOf('title'))));
    else if (tag.startsWith('<script')) parts.script.push(src.slice(lt, (end = closeOf('script'))));
    else if (tag.startsWith('<style')) parts.style.push(src.slice(lt, (end = closeOf('style'))));
    else if (tag.startsWith('<link')) parts.link.push(src.slice(lt, (end = src.indexOf('>', lt) + 1)));
    else if (tag.startsWith('<meta') || tag.startsWith('</head')) end = src.indexOf('>', lt) + 1;
    else if (intoMarkup) {
      // Plain markup (e.g. <div id="root"></div>): copy up to the next script/style or the end.
      const next = [lower.indexOf('<script', lt + 1), lower.indexOf('<style', lt + 1)].filter((n) => n > 0 && n < to);
      end = next.length ? Math.min(...next) : to;
      parts.markup.push(src.slice(lt, end).trim());
    } else end = src.indexOf('>', lt) + 1;
    i = end;
  }
}

scan(headStart + 6, bodyStart, false);
scan(bodyStart + 6, bodyEnd, true);

if (parts.title.length !== 1) throw new Error('Expected exactly one <title>');
const out = [...parts.title, ...parts.link, ...parts.style, ...parts.markup, ...parts.script].join('\n') + '\n';

for (const bad of ['<!doctype', '<html', '<head>', '<body>']) {
  if (out.slice(0, 200).toLowerCase().includes(bad)) throw new Error(`Skeleton tag left in output: ${bad}`);
}
if (out.toLowerCase().indexOf('<title>') > 8192) throw new Error('<title> is not in the first 8 KB');

writeFileSync('dist/artifact.html', out);
const kb = (statSync('dist/artifact.html').size / 1024).toFixed(0);
console.log(`artifactize: dist/artifact.html (${kb} KB; limit 16384 KB)`);
