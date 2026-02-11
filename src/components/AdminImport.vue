<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
    <div class="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full">
      <h1 class="text-2xl font-bold mb-6 text-gray-800">Admin Migrácia Dát (Excel Source)</h1>

      <div class="space-y-4">
        <p class="text-gray-600">
          Tento nástroj natvrdo prepíše databázu údajmi z Excelu UPV 3.xlsx.
        </p>
        <div class="bg-blue-50 p-4 rounded text-sm">
          <strong>Pripravené na upload:</strong>
          <ul class="list-disc ml-5">
            <li>{{ students.length }} študentov (IDs z Excelu, mená vo formáte Meno Priezvisko)</li>
            <li>15 škôl</li>
            <li>FAQ (Čeština)</li>
          </ul>
        </div>

        <button
          @click="runMigration"
          :disabled="loading"
          class="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition disabled:opacity-50"
        >
          {{ loading ? 'Nahrávam...' : 'SPUSTIŤ MIGRÁCIU 🚀' }}
        </button>

        <div v-if="logs.length" class="mt-4 p-4 bg-gray-900 text-green-400 font-mono text-xs rounded h-64 overflow-y-auto">
          <div v-for="(log, i) in logs" :key="i">{{ log }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { doc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { students, schools, faq } from '../data/migrationData'

const loading = ref(false)
const logs = ref([])
const log = (msg) => logs.value.push(`> ${msg}`)

// --- HARDCODED DATA SOURCE ---

async function runMigration() {
  if (!confirm('Naozaj chcete prepísať databázu?')) return
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

    log(`Pripravujem ${students.length} študentov...`)
    for (const s of students) {
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