const fs = require('fs');
let content = fs.readFileSync('src/app/api/analyze-documents/route.ts', 'utf8');
content = content.replace(
  /documentType: doc\.documentType,\n(\s+)annotations/g,
  'documentType: doc.documentType,\n$1originalFileUrl: doc.originalFileUrl,\n$1annotations'
);
fs.writeFileSync('src/app/api/analyze-documents/route.ts', content);
console.log('Fixed: added originalFileUrl to all results.push calls');
