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
            <li>57 študentov (IDs z Excelu, mená vo formáte Meno Priezvisko)</li>
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

const loading = ref(false)
const logs = ref([])
const log = (msg) => logs.value.push(`> ${msg}`)

// --- HARDCODED DATA SOURCE ---

const schools = {
  "horovice": { "name": "SOŠ a SOU Hořovice", "focus": "pedagogické lyceum", "coord": "Ředitel: Ing. Vladimír Kebert, CSc., tel.: +420 731 582 691" },
  "auto_skola": { "name": "Střední škola automobilní", "focus": "automechanik", "coord": "Kontaktujte sekretariát SŠ automobilní" },
  "jezdectvi": { "name": "SOŠ a SOU (jezdectví)", "focus": "chovatelství", "coord": "Ředitelka: Ing. Soňa Froňková, Ph.D., tel. 257 941 094" },
  "vos_umelecka": { "name": "VOŠ umělecká a řemeslná", "focus": "právo a diplomacie", "coord": "Ředitelka Dr. Jana Porvichová, tel. 724 884 143" },
  "gastro_krbu": { "name": "SŠ Gastronomie U KRBU", "focus": "gastronomie", "coord": "Zástupkyně: ing. Věra Pavlíková, tel. 274 019 103" },
  "klanovice": { "name": "Klánovice - Hotelová škola", "focus": "hotelnictví", "coord": "Sekretariát Hotelové školy Klánovice" },
  "alsovo": { "name": "VOŠ, SOŠ A G, Alšovo nábřeží 6", "focus": "dentální hygiena", "coord": "Zástupkyně pro odborné předměty: Alšovo nábřeží" },
  "jarov": { "name": "Střední odborná škola Jarov", "focus": "truhlář", "coord": "Ing. Bc. Gabriela Kotrčová, tel. 266 106 275" },
  "gym_praha9": { "name": "Gymnázium a SOŠ, Praha 9", "focus": "kadeřník", "coord": "Lukáš Kovalský, Tel. 737 283 491" },
  "zemedelska": { "name": "Střední zemědělská škola", "focus": "veřejná správa", "coord": "Jitka Gregorová, tel. 313 251 013" },
  "cakovice": { "name": "SOU Čakovice", "focus": "chovatel zvířat", "coord": "Sekretariát SOU Čakovice" },
  "radotin": { "name": "SOU Praha - Radotín", "focus": "automechanik", "coord": "Sekretariát SOU Radotín" },
  "klatovy": { "name": "SŠZ a P Klatovy", "focus": "zahradník", "coord": "SŠZ a P Klatovy" },
  "podnikani_gastro": { "name": "SŠ podnikání a gastronomie", "focus": "cukrář", "coord": "PhDr. Bc. Štěpničková Olga, tel. 281 028 907" },
  "jilove": { "name": "SŠ Jílové u Prahy", "focus": "cukrář/podnikání", "coord": "Ředitel: Mgr. Radek Coufal, tel. 736 622 550" }
}

const faq = [
  { "q": "Mám zkrácenou praxi, když neučím?", "a": "Ne. Rozsah je stanoven metodikou (např. 12 týdnů pro UPV). Praxe je povinná bez ohledu na vaše zaměstnání." },
  { "q": "Je to 15 dní nebo 15 hodin?", "a": "Nezaměňovat. 15 hodin jsou zpravidla 'výstupy' (učíte vy), ale ve škole musíte být přítomni podle dohody s cvičným učitelem, obvykle více dní." },
  { "q": "Kdy mám kontaktovat školu?", "a": "Nejpozději 14 dní před nástupem na praxi. Kontaktní údaje vidíte na své nástěnce." },
  { "q": "Co když nestíhám/jsem nemocný?", "a": "Okamžitě kontaktujte cvičného učitele na škole a garanta praxe (JUDr. Vadovičová). Absenci je nutné nahradit." }
]

const students = [
  { "id": "242285", "name": "David Bašus", "schoolId": "radotin", "week": "1.-4. týden" },
  { "id": "213837", "name": "Ing. Jakub Bednář", "schoolId": "podnikani_gastro", "week": "1.-4. týden" },
  { "id": "242287", "name": "Denisa Cibulková", "schoolId": "gym_praha9", "week": "1.-4. týden" },
  { "id": "242288", "name": "Helena Cinegrová", "schoolId": "gym_praha9", "week": "1.-4. týden" },
  { "id": "242290", "name": "Natálie Černá", "schoolId": "vos_umelecka", "week": "1.-4. týden" },
  { "id": "242291", "name": "Josef Černý", "schoolId": "radotin", "week": "1.-4. týden" },
  { "id": "242292", "name": "Ondřej Drtina", "schoolId": "jarov", "week": "1.-4. týden" },
  { "id": "242293", "name": "Marek Farkaš", "schoolId": "jarov", "week": "1.-4. týden" },
  { "id": "244083", "name": "Eva Fischerová", "schoolId": "nezarazeno", "week": "1.-4. týden" },
  { "id": "242294", "name": "Klára Fulmeková", "schoolId": "horovice", "week": "1.-4. týden" },
  { "id": "242286", "name": "Alena Hájek Borlová", "schoolId": "gym_praha9", "week": "1.-4. týden" },
  { "id": "60630", "name": "Jan Hlavatý", "schoolId": "vos_umelecka", "week": "1.-4. týden" },
  { "id": "242296", "name": "Simon Hönig", "schoolId": "zemedelska", "week": "1.-4. týden" },
  { "id": "210067", "name": "Kamila Chlebná, DiS.", "schoolId": "alsovo", "week": "1.-4. týden" },
  { "id": "244087", "name": "Marta Chorobíková", "schoolId": "nezarazeno", "week": "1.-4. týden" },
  { "id": "242299", "name": "Martin Janda", "schoolId": "jarov", "week": "1.-4. týden" },
  { "id": "226063", "name": "Petr Jehlička", "schoolId": "nezarazeno", "week": "1.-4. týden" },
  { "id": "242301", "name": "Ondřej Jelínek", "schoolId": "gym_praha9", "week": "1.-4. týden" },
  { "id": "242302", "name": "Amálie Jeřábková", "schoolId": "klanovice", "week": "1.-4. týden" },
  { "id": "242303", "name": "Irena Kaňková", "schoolId": "gastro_krbu", "week": "1.-4. týden" },
  { "id": "210068", "name": "Veronika Kaňková, Dis.", "schoolId": "alsovo", "week": "1.-4. týden" },
  { "id": "234616", "name": "Natálie Kapalínová", "schoolId": "cakovice", "week": "1.-4. týden" },
  { "id": "247146", "name": "David Kec", "schoolId": "radotin", "week": "1.-4. týden" },
  { "id": "247716", "name": "Vít Kinský", "schoolId": "nezarazeno", "week": "1.-4. týden" },
  { "id": "242306", "name": "Nikola Kozlová", "schoolId": "gym_praha9", "week": "1.-4. týden" },
  { "id": "242307", "name": "Jan Krejčí", "schoolId": "vos_umelecka", "week": "1.-4. týden" },
  { "id": "242308", "name": "Karolína Křížková", "schoolId": "podnikani_gastro", "week": "1.-4. týden" },
  { "id": "242309", "name": "Pavel Kučera", "schoolId": "jarov", "week": "1.-4. týden" },
  { "id": "242310", "name": "Pavla Kučerová", "schoolId": "podnikani_gastro", "week": "1.-4. týden" },
  { "id": "242312", "name": "Jana Macháčková", "schoolId": "klanovice", "week": "1.-4. týden" },
  { "id": "242313", "name": "Machulka Pavel, DiS.", "schoolId": "nezarazeno", "week": "1.-4. týden" },
  { "id": "242314", "name": "Nikola Melničáková", "schoolId": "zemedelska", "week": "1.-4. týden" },
  { "id": "242315", "name": "Eva Mórová", "schoolId": "klanovice", "week": "1.-4. týden" },
  { "id": "242316", "name": "Lucie Možiová", "schoolId": "gastro_krbu", "week": "1.-4. týden" },
  { "id": "246466", "name": "Kristýna Nováková", "schoolId": "jezdectvi", "week": "1.-4. týden" },
  { "id": "210069", "name": "Nikol Ondráčková", "schoolId": "gym_praha9", "week": "1.-4. týden" },
  { "id": "246984", "name": "Lenka Pfeiferová", "schoolId": "jezdectvi", "week": "1.-4. týden" },
  { "id": "211394", "name": "Vít Pochobradský", "schoolId": "nezarazeno", "week": "1.-4. týden" },
  { "id": "210070", "name": "Vladimír Preksl", "schoolId": "radotin", "week": "1.-4. týden" },
  { "id": "242317", "name": "Sára Přibylová", "schoolId": "jarov", "week": "1.-4. týden" },
  { "id": "249299", "name": "Barbara Stjepanovičová", "schoolId": "jezdectvi", "week": "1.-4. týden" },
  { "id": "242321", "name": "Petr Šimeček", "schoolId": "gastro_krbu", "week": "1.-4. týden" },
  { "id": "242322", "name": "Dita Šimůnková", "schoolId": "jilove", "week": "1.-4. týden" },
  { "id": "100202", "name": "Ing. Jiřina Špálová", "schoolId": "jilove", "week": "1.-4. týden" },
  { "id": "210065", "name": "David Štrunc", "schoolId": "gym_praha9", "week": "1.-4. týden" },
  { "id": "242323", "name": "Michal Švarc", "schoolId": "horovice", "week": "1.-4. týden" },
  { "id": "242324", "name": "Kristýna Švarcová", "schoolId": "horovice", "week": "1.-4. týden" },
  { "id": "210066", "name": "František Touš", "schoolId": "gastro_krbu", "week": "1.-4. týden" },
  { "id": "242279", "name": "Šárka Turynská", "schoolId": "vos_umelecka", "week": "1.-4. týden" },
  { "id": "249472", "name": "Jiří Úlovec", "schoolId": "klatovy", "week": "1.-4. týden" },
  { "id": "242280", "name": "Veronika Vaňková", "schoolId": "zemedelska", "week": "1.-4. týden" },
  { "id": "157852", "name": "Pavlína Veselá Štochlová", "schoolId": "vos_umelecka", "week": "1.-4. týden" },
  { "id": "242281", "name": "Veronika Veselá", "schoolId": "gym_praha9", "week": "1.-4. týden" },
  { "id": "222132", "name": "Michaela Vycpálková", "schoolId": "nezarazeno", "week": "1.-4. týden" },
  { "id": "242282", "name": "Marek Zámostný", "schoolId": "auto_skola", "week": "1.-4. týden" },
  { "id": "242283", "name": "Ivana Zýková", "schoolId": "gym_praha9", "week": "1.-4. týden" },
  { "id": "242284", "name": "Romana Židlíková", "schoolId": "jilove", "week": "1.-4. týden" }
]

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