const fs = require('fs');
const content = fs.readFileSync('src/app/[lang]/documents/search/actions.ts', 'utf8');
const lines = content.split('\n');
let cutLine = -1;
for (let i = 100; i < lines.length; i++) {
  if (lines[i].includes('return { data: results }')) { cutLine = i; break; }
}
console.log('Cut at line:', cutLine + 1);
const kept = lines.slice(0, cutLine + 1);
kept.push('  } catch (err) {');
kept.push('    return { error: err instanceof Error ? err.message : \'Search failed\' }');
kept.push('  }');
kept.push('}');
kept.push('');
fs.writeFileSync('src/app/[lang]/documents/search/actions.ts', kept.join('\n'));
console.log('Done. New total:', kept.length, 'lines');
