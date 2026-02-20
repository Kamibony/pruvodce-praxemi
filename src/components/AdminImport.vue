<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
    <div class="bg-white p-8 rounded-lg shadow-xl max-w-4xl w-full">
      <h1 class="text-2xl font-bold mb-6 text-gray-800">Admin Import Dat</h1>

      <!-- NEW SECTION: Dynamic Excel Import -->
      <div class="mb-8 border-b pb-8">
        <h2 class="text-xl font-semibold mb-4 text-blue-800">1. Dynamický Import (Excel/CSV)</h2>

        <!-- LAST IMPORT INFO -->
        <div v-if="lastImportInfo" class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <span class="text-2xl">✅</span>
          <div>
            <h3 class="font-bold text-green-800">Poslední aktualizace dat</h3>
            <p class="text-sm text-green-700">
              Proběhla: <strong>{{ formatDate(lastImportInfo.importTimestamp) }}</strong><br>
              Ze souboru: <span class="font-mono bg-green-100 px-1 rounded">{{ lastImportInfo.fileName }}</span>
            </p>
          </div>
        </div>

        <!-- INFO ALERT -->
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-sm text-blue-900">
          <p class="leading-relaxed">
            ℹ️ <strong>Jak import funguje:</strong> Excelový soubor slouží pouze k jednorázové aktualizaci škol a hodin u stávajících studentů.
            Po kliknutí na 'Uložit do DB' se data bezpečně propíšou do systému.
            <strong>Po obnovení stránky zmizí název souboru z tohoto pole – to je v pořádku a data jsou v bezpečí.</strong>
            Soubor nemusíte nahrávat znovu, dokud nemáte nový rozvrh. Nahrání nového souboru přepíše aktuální přiřazení škol.
          </p>
        </div>

        <div class="space-y-4">
          <label class="block mb-2 text-sm font-medium text-gray-900" for="file_input">Nahrát rozvrh (XLSX/CSV)</label>
          <input
            id="file_input"
            type="file"
            @change="handleFileSelect"
            accept=".xlsx, .xls, .csv"
            class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
          />
          <p class="mt-1 text-sm text-gray-500">Očekává se formát rozvrhu (Škola, 1. týden...)</p>

          <button
            @click="analyzeFile"
            :disabled="!selectedFile || loading"
            class="mt-4 w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition disabled:opacity-50"
          >
            Analyzovat soubor
          </button>

          <div v-if="unmatchedNames.length > 0" class="mt-4 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded">
            <h3 class="font-bold mb-2 flex items-center">
              ⚠️ Nepodařilo se spárovat ({{ unmatchedNames.length }}):
            </h3>
            <p class="text-sm mb-2">Tato jména byla v souboru nalezena, ale neodpovídají žádnému studentovi v databázi.</p>
            <ul class="list-disc list-inside text-sm max-h-40 overflow-y-auto">
              <li v-for="name in unmatchedNames" :key="name">{{ name }}</li>
            </ul>
          </div>

          <div v-if="parsedStudents.length > 0" class="mt-4">
            <h3 class="font-bold mb-2">Náhled dat ({{ parsedStudents.length }} záznamů):</h3>
            <div class="overflow-x-auto max-h-64 border rounded">
              <table class="min-w-full text-sm text-left">
                <thead class="bg-gray-100 sticky top-0">
                  <tr>
                    <th class="p-2 border-b">ID</th>
                    <th class="p-2 border-b">Jméno</th>
                    <th class="p-2 border-b">Škola (ID)</th>
                    <th class="p-2 border-b">Cíl</th>
                    <th class="p-2 border-b">Týdny</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in parsedStudents" :key="s.id" class="border-t hover:bg-gray-50">
                    <td class="p-2 font-mono">{{ s.id }}</td>
                    <td class="p-2">{{ s.name }}</td>
                    <td class="p-2">
                      <span :class="{'text-red-500 font-bold': s.schoolId === 'nezarazeno', 'text-green-600': s.schoolId !== 'nezarazeno'}">
                        {{ schools[s.schoolId]?.name || s.schoolId }}
                        <span v-if="s.schoolId !== 'nezarazeno'" class="text-xs text-gray-500">({{ s.schoolId }})</span>
                      </span>
                    </td>
                    <td class="p-2 font-bold">{{ s.goalHours }}h</td>
                    <td class="p-2 text-xs text-gray-500">{{ s.week }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button
              @click="saveParsedData"
              :disabled="loading"
              class="mt-4 w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded transition disabled:opacity-50 shadow-lg"
            >
              {{ loading ? 'Ukládám...' : 'ULOŽIT NAČTENÁ DATA DO DB' }}
            </button>
          </div>
        </div>
      </div>


      <!-- LOGS -->
      <div v-if="logs.length" class="mt-8 p-4 bg-gray-900 text-green-400 font-mono text-xs rounded h-64 overflow-y-auto shadow-inner">
        <div v-for="(log, i) in logs" :key="i">{{ log }}</div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { doc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { schools, faq } from '../data/migrationData'
import { read, utils } from 'xlsx'
import AdminService from '../services/AdminService'

const loading = ref(false)
const logs = ref([])
const parsedStudents = ref([])
const unmatchedNames = ref([])
const selectedFile = ref(null)
const lastImportInfo = ref(null)

const log = (msg) => logs.value.push(`> ${msg}`)

onMounted(async () => {
  lastImportInfo.value = await AdminService.getImportHistory()
})

function formatDate(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleString('cs-CZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// --- DYNAMIC IMPORT LOGIC ---

function normalizeString(str) {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Improved Normalization for Student Names (Strips Titles)
function normalizeName(str) {
  if (!str) return '';
  let clean = String(str);

  // Common Czech titles to strip
  const titles = [
    "Bc\\.", "BcA\\.", "Mgr\\.", "Ing\\.", "PhDr\\.", "DiS\\.", "MUDr\\.", "Ph\\.D\\.",
    "Bc\\b", "BcA\\b", "Mgr\\b", "Ing\\b", "PhDr\\b", "DiS\\b", "MUDr\\b", "PhD\\b"
  ];

  // Create regex for titles (word boundary + title)
  const titleRegex = new RegExp(`\\b(${titles.join('|')})`, 'gi');
  clean = clean.replace(titleRegex, '');

  // Remove commas
  clean = clean.replace(/,/g, '');

  // Normalize accents, lowercase, trim
  return clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, ' ');
}

// Validator for Student Cells (Filters False Positives)
function isValidStudentCell(cellValue) {
  if (!cellValue) return false;
  const str = String(cellValue).trim();

  // Filter out short strings
  if (str.length < 4) return false;

  // Filter out emails
  if (str.includes('@')) return false;

  // Filter out headers/metadata
  if (str.toLowerCase().includes('tyden') || str.toLowerCase().includes('týden')) return false;

  // Filter out strings with numbers (likely headers like '1. týden')
  if (/\d/.test(str)) return false;

  return true;
}

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    parsedStudents.value = []
    unmatchedNames.value = []
    logs.value = []
    log(`Vybrán soubor: ${file.name}`)
  }
}

async function analyzeFile() {
  if (!selectedFile.value) return
  loading.value = true
  logs.value = []
  parsedStudents.value = []
  unmatchedNames.value = []

  try {
    log('Načítám studenty z databáze...')
    const dbStudents = await AdminService.getAllStudentsBasic()
    log(`Načteno ${dbStudents.length} studentů z DB.`)

    // Create lookup map using NORMALIZED names (stripped titles)
    const studentMap = new Map()
    dbStudents.forEach(s => {
       const normName = normalizeName(s.name)
       studentMap.set(normName, s.id)
    })

    log('Čtu soubor...')
    const data = await selectedFile.value.arrayBuffer()
    const workbook = read(data)
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    // Read as 2D array
    const rows = utils.sheet_to_json(worksheet, { header: 1 })
    log(`Načteno ${rows.length} řádků.`)

    // --- ROLLING FUZZY MATCH LOGIC ---
    let activeSchoolId = 'nezarazeno'
    const studentAgg = new Map()

    // Create mapping for fuzzy search of schools
    const schoolEntries = Object.entries(schools).map(([id, data]) => ({
      id,
      name: data.name,
      normalizedName: normalizeString(data.name)
    }))

    // Find Header Row Indices
    let schoolColIndex = -1
    let weekColIndices = []
    let headerRowIndex = -1

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      const schoolIdx = row.findIndex(cell => cell && String(cell).toLowerCase().includes('škola'))
      const week1Idx = row.findIndex(cell => cell && (String(cell).includes('1. týden') || String(cell).includes('1. tyden')))

      if (schoolIdx !== -1 && week1Idx !== -1) {
        schoolColIndex = schoolIdx
        headerRowIndex = i

        // Find all week columns
        row.forEach((cell, idx) => {
          if (cell && (String(cell).includes('týden') || String(cell).includes('tyden'))) {
            weekColIndices.push(idx)
          }
        })
        log(`Hlavička nalezena na řádku ${i + 1}. Sloupec školy: ${schoolColIndex}, Týdny: ${weekColIndices.join(', ')}`)
        break
      }
    }

    if (headerRowIndex === -1) {
      throw new Error('Nepodařilo se najít hlavičku tabulky (očekáváno "Škola" a "1. týden").')
    }

    // Iterate Rows (START AFTER HEADER)
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      // 1. UPDATE SCHOOL STATE (Rolling Match)
      const schoolCell = row[schoolColIndex]
      if (schoolCell) {
        const rawSchoolName = String(schoolCell).trim()

        // Only attempt match if text is significant (> 3 chars)
        if (rawSchoolName.length > 3) {
           const normalizedInput = normalizeString(rawSchoolName)
           let foundMatchId = null

           // Try to match against known schools
           for (const school of schoolEntries) {
             // Exact substring match
             if (normalizedInput.includes(school.normalizedName) ||
                 (school.normalizedName.length > 5 && normalizedInput.includes(school.normalizedName.substring(0, 10)))) {
               foundMatchId = school.id
               break
             }

             // Significant word match
             const schoolWords = school.normalizedName.split(/\s+/).filter(w => w.length > 3)
             const ignored = ['stredni', 'skola', 'odborna', 'vyssi', 'sou', 'sos', 'gymnazium', 'prazska', 'praha', 'skoly']
             const significantSchoolWords = schoolWords.filter(w => !ignored.includes(w))

             if (significantSchoolWords.length > 0 && significantSchoolWords.some(w => normalizedInput.includes(w))) {
                foundMatchId = school.id
                break
             }
           }

           // CRITICAL: Only update state if a match was found!
           if (foundMatchId) {
             activeSchoolId = foundMatchId
             // log(`Řádek ${i + 1}: Změna školy -> ${activeSchoolId} (${rawSchoolName})`)
           } else {
             // No match found -> Ignore fragment, keep previous activeSchoolId
             // log(`Řádek ${i + 1}: Ignorován fragment -> "${rawSchoolName}" (Zůstává: ${activeSchoolId})`)
           }
        }
      }

      // 2. FIND STUDENTS
      for (const colIdx of weekColIndices) {
        const cellValue = row[colIdx]

        if (isValidStudentCell(cellValue)) {
          const name = String(cellValue).trim()
          const normName = normalizeName(name)

          if (!studentAgg.has(normName)) {
            studentAgg.set(normName, {
              originalName: name,
              schoolId: activeSchoolId, // Assign CURRENT active school
              weeks: new Set()
            })
          }

          const rec = studentAgg.get(normName)
          rec.weeks.add(colIdx)

          // If we have a valid school now and the student was previously 'nezarazeno', update it
          if (rec.schoolId === 'nezarazeno' && activeSchoolId !== 'nezarazeno') {
            rec.schoolId = activeSchoolId
          }
        }
      }
    }

    log(`Nalezeno ${studentAgg.size} unikátních jmen v rozvrhu.`)

    // Match against DB
    const matched = []
    const unmatched = []

    for (const [normName, data] of studentAgg.entries()) {
      // Try to find in DB
      let dbId = null

      // 1. Exact normalized match (now includes stripped titles)
      if (studentMap.has(normName)) {
        dbId = studentMap.get(normName)
      } else {
        // 2. Fuzzy / Substring match
        for (const [dbNormName, id] of studentMap.entries()) {
           if (dbNormName.includes(normName) || normName.includes(dbNormName)) {
             dbId = id
             break
           }

           // Check if parts match (FirstName LastName)
           const parts1 = normName.split(' ').filter(p => p.length > 2)
           const parts2 = dbNormName.split(' ').filter(p => p.length > 2)

           if (parts1.length > 1 && parts2.length > 1) {
             const allPartsMatch = parts1.every(p => dbNormName.includes(p))
             if (allPartsMatch) {
               dbId = id
               break
             }
           }
        }

        // 3. RELAXED FALLBACK MATCHING (Natálie vs Natalia)
        if (!dbId) {
            const parts1 = normName.split(' ').filter(p => p.length > 0)

            for (const [dbNormName, id] of studentMap.entries()) {
                const parts2 = dbNormName.split(' ').filter(p => p.length > 0)

                // Find exact common part > 4 chars (Last Name Assumption)
                let commonLastName = null

                for (let p1 of parts1) {
                    if (p1.length > 4 && parts2.includes(p1)) {
                        commonLastName = p1
                        break
                    }
                }

                if (commonLastName) {
                    const remaining1 = parts1.filter(p => p !== commonLastName)
                    const remaining2 = parts2.filter(p => p !== commonLastName)

                    if (remaining1.length > 0 && remaining2.length > 0) {
                        const fn1 = remaining1[0]
                        const fn2 = remaining2[0]

                        // Check if First Name starts with same 3 letters
                        if (fn1.length >= 3 && fn2.length >= 3 && fn1.substring(0, 3) === fn2.substring(0, 3)) {
                            dbId = id
                            log(`Fallback shoda: ${data.originalName} ~ ${dbNormName}`)
                            break
                        }
                    }
                }
            }
        }
      }

      if (dbId) {
        const weekCount = data.weeks.size
        // Logic: >= 3 weeks -> 15h, else 9h (Fixed logic)
        const goalHours = weekCount >= 3 ? 15 : 9
        const weekLabel = weekCount >= 3 ? '1.-4. týden' : '1.-2. týden (zkrácená)'

        matched.push({
          id: dbId,
          name: data.originalName,
          dbName: dbStudents.find(s => s.id === dbId)?.name,
          schoolId: data.schoolId,
          goalHours,
          week: weekLabel
        })
      } else {
        unmatched.push(data.originalName)
      }
    }

    parsedStudents.value = matched
    unmatchedNames.value = unmatched
    log(`Spárováno ${matched.length} studentů. Nespárováno: ${unmatched.length}.`)

  } catch (e) {
    console.error(e)
    log('❌ CHYBA: ' + e.message)
  } finally {
    loading.value = false
  }
}

async function saveParsedData() {
  if (!confirm(`Opravdu chcete aktualizovat databázi pro ${parsedStudents.value.length} studentů?`)) return

  loading.value = true
  try {
    const batch = writeBatch(db)

    log('Ověřuji existenci škol...')
    for (const [id, data] of Object.entries(schools)) {
      const ref = doc(db, 'schools', id)
      batch.set(ref, data)
    }

    log('Ověřuji existenci FAQ...')
    const faqRef = doc(db, 'content', 'faq')
    batch.set(faqRef, { items: faq })

    log(`Zapisuji ${parsedStudents.value.length} studentů...`)
    for (const s of parsedStudents.value) {
      const ref = doc(db, 'students', s.id)
      batch.set(ref, {
        schoolId: s.schoolId,
        goalHours: s.goalHours,
        week: s.week
      }, { merge: true })
    }

    await batch.commit()
    log('✅ DATA BYLA ÚSPĚŠNĚ AKTUALIZOVÁNA!')

    // Save Import Metadata
    if (selectedFile.value) {
      await AdminService.saveImportHistory(selectedFile.value.name)
      lastImportInfo.value = {
        fileName: selectedFile.value.name,
        importTimestamp: new Date().toISOString()
      }
    }

    parsedStudents.value = []
    selectedFile.value = null
    unmatchedNames.value = []

  } catch (e) {
    console.error(e)
    log('❌ CHYBA při ukládání: ' + e.message)
  } finally {
    loading.value = false
  }
}

</script>
