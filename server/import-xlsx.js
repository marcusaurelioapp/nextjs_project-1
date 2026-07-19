import path from 'node:path';
import { fileURLToPath } from 'node:url';
import xlsx from 'xlsx';
import { countResults, upsertMany, validateResult } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const XLSX_PATH = path.join(__dirname, '..', 'data', 'lotofacil.xlsx');

// Serial de data do Excel (epoch 1899-12-30) → 'YYYY-MM-DD'
function excelSerialToISO(serial) {
  const ms = Math.round((serial - 25569) * 86400 * 1000); // 25569 = dias até 1970-01-01
  return new Date(ms).toISOString().slice(0, 10);
}

export async function importSpreadsheet() {
  const workbook = xlsx.readFile(XLSX_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { raw: true });

  const results = [];
  const skipped = [];
  for (const row of rows) {
    const concurso = Number(row['Concurso']);
    const serial = Number(row['Data Sorteio']);
    const dezenas = Array.from({ length: 15 }, (_, i) => Number(row[`Bola${i + 1}`]));
    const result = { concurso, data: excelSerialToISO(serial), dezenas };
    const error = validateResult(result);
    if (error) {
      skipped.push({ concurso: row['Concurso'], error });
    } else {
      results.push(result);
    }
  }

  await upsertMany(results);
  return { imported: results.length, skipped };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const destino = process.env.TURSO_DATABASE_URL ?? 'banco local (server/lotofacil.db)';
  console.log(`Importando para: ${destino}`);
  const { imported, skipped } = await importSpreadsheet();
  console.log(`Importados/atualizados: ${imported} concursos (total no banco: ${await countResults()})`);
  if (skipped.length > 0) {
    console.warn(`Linhas ignoradas: ${skipped.length}`);
    for (const s of skipped.slice(0, 10)) console.warn(` concurso ${s.concurso}: ${s.error}`);
  }
}
