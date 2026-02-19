<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
    <div class="bg-white p-8 rounded-lg shadow-xl max-w-4xl w-full">
      <h1 class="text-2xl font-bold mb-6 text-gray-800">Admin Migrácia Dát</h1>

      <!-- NEW SECTION: Dynamic Excel Import -->
      <div class="mb-8 border-b pb-8">
        <h2 class="text-xl font-semibold mb-4 text-blue-800">1. Dynamický Import (Excel/CSV)</h2>
        <div class="space-y-4">
          <label class="block mb-2 text-sm font-medium text-gray-900" for="file_input">Nahrať rozvrh (XLSX/CSV)</label>
          <input
            id="file_input"
            type="file"
            @change="handleFileUpload"
            accept=".xlsx, .xls, .csv"
            class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
          />
          <p class="mt-1 text-sm text-gray-500">Očakávané stĺpce: 'ID osoby', 'Celé jméno s tituly', '1. týden'...</p>

          <div v-if="parsedStudents.length > 0" class="mt-4">
            <h3 class="font-bold mb-2">Náhľad dát ({{ parsedStudents.length }} záznamov):</h3>
            <div class="overflow-x-auto max-h-64 border rounded">
              <table class="min-w-full text-sm text-left">
                <thead class="bg-gray-100 sticky top-0">
                  <tr>
                    <th class="p-2 border-b">ID</th>
                    <th class="p-2 border-b">Meno</th>
                    <th class="p-2 border-b">Škola (ID)</th>
                    <th class="p-2 border-b">Cieľ</th>
                    <th class="p-2 border-b">Týždne</th>
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
              {{ loading ? 'Ukladám...' : 'ULOŽIŤ NAČÍTANÉ DÁTA DO DB' }}
            </button>
          </div>
        </div>
      </div>

      <!-- OLD SECTION: Hardcoded Migration -->
      <div>
        <h2 class="text-xl font-semibold mb-4 text-gray-600">2. Hardcoded Migrácia (Legacy)</h2>
        <div class="space-y-4 opacity-75">
          <p class="text-gray-600 text-sm">
            Tento nástroj natvrdo prepíše databázu údajmi z <code>src/data/migrationData.js</code>.
          </p>
          <div class="bg-gray-50 p-4 rounded text-sm">
            <strong>Pripravené na upload:</strong>
            <ul class="list-disc ml-5">
              <li>{{ hardcodedStudents.length }} študentov</li>
              <li>{{ Object.keys(schools).length }} škôl</li>
              <li>FAQ (Čeština)</li>
            </ul>
          </div>

          <button
            @click="runMigration"
            :disabled="loading"
            class="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition disabled:opacity-50"
          >
            {{ loading ? 'Nahrávam...' : 'SPUSTIŤ LEGACY MIGRÁCIU' }}
          </button>
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
import { ref } from 'vue'
import { doc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { students as hardcodedStudents, schools, faq } from '../data/migrationData'
import { read, utils } from 'xlsx'

const loading = ref(false)
const logs = ref([])
const parsedStudents = ref([])

const log = (msg) => logs.value.push(`> ${msg}`)

// --- DYNAMIC IMPORT LOGIC ---

function normalizeString(str) {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

async function handleFileUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  loading.value = true
  logs.value = []
  log(`Načítavam súbor: ${file.name}`)

  try {
    const data = await file.arrayBuffer()
    const workbook = read(data)
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const json = utils.sheet_to_json(worksheet)

    log(`Nájdených ${json.length} riadkov. Analyzujem...`)
    if (json.length > 0) {
      log('Kľúče prvého riadku: ' + Object.keys(json[0]).join(', '))
    }

    const result = []

    // Create mapping for fuzzy search of schools
    const schoolEntries = Object.entries(schools).map(([id, data]) => ({
      id,
      name: data.name,
      normalizedName: normalizeString(data.name)
    }))

    for (const row of json) {
      // 1. Extract ID and Name
      const idRaw = row['ID osoby'] || row['Osobní číslo'] || row['id']
      const name = row['Celé jméno s tituly'] || row['Jméno'] || row['name']

      if (!idRaw || !name) continue // Skip invalid rows

      const id = String(idRaw).trim()

      // 2. Determine Practice Length
      // Check columns for content
      const week1 = row['1. týden'] || row['1. tyden']
      const week2 = row['2. týden'] || row['2. tyden']
      const week3 = row['3. týden'] || row['3. tyden']
      const week4 = row['4. týden'] || row['4. tyden']

      const hasWeek3 = !!week3
      const hasWeek4 = !!week4

      const isShort = !hasWeek3 && !hasWeek4
      const goalHours = isShort ? 9 : 15
      const weekLabel = isShort ? '1.-2. týden' : '1.-4. týden'

      // 3. School Mapping
      let schoolId = 'nezarazeno'

      // Collect all text from week columns to find school name
      const scheduleText = [week1, week2, week3, week4].filter(Boolean).join(' ')
      const normalizedSchedule = normalizeString(scheduleText)

      for (const school of schoolEntries) {
        // 1. Exact/Substring match of full name
        if (normalizedSchedule.includes(school.normalizedName) ||
            (school.normalizedName.length > 5 && normalizedSchedule.includes(school.normalizedName.substring(0, 10)))) {
            schoolId = school.id
            break
        }

        // 2. Significant word match (e.g. "Horovice" inside "SOS a SOU Horovice")
        const schoolWords = school.normalizedName.split(/\s+/).filter(w => w.length > 3)
        const ignored = ['stredni', 'skola', 'odborna', 'vyssi', 'sou', 'sos', 'gymnazium', 'prazska', 'praha', 'skoly']
        const significantSchoolWords = schoolWords.filter(w => !ignored.includes(w))

        if (significantSchoolWords.length > 0 && significantSchoolWords.some(w => normalizedSchedule.includes(w))) {
           schoolId = school.id
           break
        }
      }

      result.push({
        id,
        name,
        schoolId,
        week: weekLabel,
        goalHours
      })
    }

    parsedStudents.value = result
    log(`Spracovaných ${result.length} študentov.`)

  } catch (e) {
    console.error(e)
    log('❌ CHYBA pri čítaní súboru: ' + e.message)
  } finally {
    loading.value = false
  }
}

async function saveParsedData() {
  if (!confirm(`Naozaj chcete prepísať databázu ${parsedStudents.value.length} záznamami?`)) return

  loading.value = true
  // logs.value = [] // Keep logs from parsing

  try {
    const batch = writeBatch(db)
    let count = 0

    log('Uisťujem sa, že existujú školy...')
    for (const [id, data] of Object.entries(schools)) {
      const ref = doc(db, 'schools', id)
      batch.set(ref, data)
    }

    log('Uisťujem sa, že existujú FAQ...')
    const faqRef = doc(db, 'content', 'faq')
    batch.set(faqRef, { items: faq })

    log(`Zapisujem ${parsedStudents.value.length} študentov...`)
    for (const s of parsedStudents.value) {
      const ref = doc(db, 'students', s.id)
      batch.set(ref, s, { merge: true })
      count++
    }

    log(`Odosielam dávku...`)
    await batch.commit()
    log('✅ DÁTA BOLI ULOŽENÉ!')

  } catch (e) {
    console.error(e)
    log('❌ CHYBA pri ukladaní: ' + e.message)
  } finally {
    loading.value = false
  }
}

// --- HARDCODED DATA SOURCE (LEGACY) ---

async function runMigration() {
  if (!confirm('Naozaj chcete prepísať databázu (Legacy)?')) return
  loading.value = true
  logs.value = []

  try {
    const batch = writeBatch(db)
    let count = 0

    log('Pripravujem školy...')
    for (const [id, data] of Object.entries(schools)) {
      const ref = doc(db, 'schools', id)
      batch.set(ref, data)
      count++
    }

    log('Pripravujem FAQ...')
    const faqRef = doc(db, 'content', 'faq')
    batch.set(faqRef, { items: faq })
    count++

    log(`Pripravujem ${hardcodedStudents.length} študentov...`)
    for (const s of hardcodedStudents) {
      const ref = doc(db, 'students', s.id)
      batch.set(ref, s)
      count++
    }

    log(`Odosielam ${count} záznamov do Firestore...`)
    await batch.commit()
    log('✅ HOTOVO! Databáza je aktualizovaná.')

  } catch (e) {
    console.error(e)
    log('❌ CHYBA: ' + e.message)
  } finally {
    loading.value = false
  }
}
</script>