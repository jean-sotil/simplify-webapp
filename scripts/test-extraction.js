const fs = require('fs');
const text = fs.readFileSync('C:/Users/alfredo.sotil/Downloads/ett_db_text.txt', 'utf8');

function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function normalizeText(t) {
  let r = t.replace(/--- Page \d+ ---/g, '\n');
  r = r.replace(/(\s)(\d{2}\.\d{2}\.\d{2}\.\d{2}\s)/g, '\n$2');
  r = r.replace(/(\s)(\d{2}\.\d{2}\.\d{2}\s)/g, '\n$2');
  r = r.replace(/(\s)(\d{2}\.\d{2}\s)/g, '\n$2');
  const kws = ['Debe ','Incluir ','Incluye ','Puerto ','Procesador ','Frecuencia ','Memoria ','Almacenamiento ','Arquitectura ','Tarjeta ','Sistema ','Unidad ','El controlador ','El sistema ','Los controladores ','La identificaci','Reporte de ','Informe de ','Reportes ','Alarma ','Las alarmas ','Soporta ','Voltaje ','Protecci','Temperatura ','Humedad ','Algoritmo ','Certificaci','Listado por ','Material:','Licencia ','Autenticaci'];
  for (const kw of kws) {
    const esc = escapeRegex(kw);
    r = r.replace(new RegExp('([.!?])\\s+(' + esc + ')', 'g'), '$1\n$2');
    r = r.replace(new RegExp('(\\s{2,})(' + esc + ')', 'g'), '\n$2');
  }
  r = r.replace(/\s+(o\s{2,})/g, '\n$1');
  return r;
}

const normalized = normalizeText(text);
const lines = normalized.split('\n');
console.log('Normalized lines:', lines.length);

const PARTIDA = /^(\d{2}\.\d{2}(?:\.\d{2}){0,2})\s+(.+)/;
const SPEC_START = [/^Debe/i,/^Puerto/i,/^Incluir/i,/^Incluye/i,/^Soporta/i,/^Voltaje/i,/^Protecci/i,/^Temperatura/i,/^Humedad/i,/^Algoritmo/i,/^Certificaci/i,/^Listado\s+por/i,/^Procesador/i,/^Frecuencia/i,/^Memoria/i,/^Almacenamiento/i,/^Arquitectura/i,/^Unidad/i,/^Tarjeta/i,/^Material/i,/^Tipo\s+de/i,/^Licencia/i,/^Autenticaci/i,/^El\s+controlador/i,/^El\s+sistema/i,/^La\s+(identificaci|interfaz|comunicaci)/i,/^Los\s+controladores/i,/^Se\s+(listan|pueden|instalar|debe|requiere)/i,/^Reporte/i,/^Informe/i,/^Reportes/i,/^Alarma/i,/^Las\s+alarmas/i,/^\d{2,4}\s*(GB|MB|TB|MHz|GHz|Mbps|VDC|VAC|LBS|bits)/i,/^\d+\s*(puertos?|entradas?|salidas?|nucleo)/i,/^Minimo/i,/^Maximo/i];
const NOISE = [/^NUEVO HOSPITAL/i,/^.Mejoramiento/i,/^Av.\s*Circunvalaci/i,/Santiago de Surco/i,/Pagina\s*\d+/i];

let partida = '', reqLines = [], inTarget = false, counter = 0;
const reqs = [];

function flush() {
  if (!reqLines.length) return;
  const t = reqLines.join(' ').trim();
  if (t.length < 15) { reqLines = []; return; }
  counter++;
  reqs.push({ id: 'REQ-' + String(counter).padStart(3, '0'), text: t.substring(0, 120), partida: partida.substring(0, 50) });
  reqLines = [];
}

for (const line of lines) {
  const tr = line.trim();
  if (!tr) continue;
  if (NOISE.some(p => p.test(tr))) continue;
  const pm = tr.match(PARTIDA);
  if (pm) { flush(); partida = pm[1] + ' ' + pm[2].trim(); inTarget = pm[1].startsWith('06.11'); continue; }
  if (!inTarget) continue;
  if (SPEC_START.some(p => p.test(tr))) { flush(); reqLines.push(tr); continue; }
  if (reqLines.length > 0 && tr.length < 250) {
    if (/^[A-Z\u00C0-\u00DC]{4,}(\s+[A-Z\u00C0-\u00DC]+)*$/.test(tr)) { flush(); continue; }
    reqLines.push(tr);
    continue;
  }
}
flush();

console.log('Total requirements:', reqs.length);
console.log('---');
reqs.forEach(r => console.log(r.id + ' [' + r.partida + '] ' + r.text));
