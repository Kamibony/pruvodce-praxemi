<script setup>
import { ref, onMounted, computed, defineProps } from 'vue';
import PracticeService from '../services/PracticeService';
import AiService from '../services/AiService';

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
});

// State
const evaluations = ref([]);
const loading = ref(true);
const error = ref(null);
const viewMode = ref('list'); // 'list', 'form'
const submitting = ref(false);

// Form Data
const formData = ref({
  date: new Date().toISOString().slice(0, 10),
  subject: '',
  topic: '',
  goalText: '',
  sections: {
    goals: {
      title: 'Cíle výuky',
      comment: '',
      criteria: [
        { id: 'smart_goals', label: 'Cíle byly formulovány jasně a srozumitelně (SMART)', value: null },
        { id: 'structure_shared', label: 'Žákům byla sdělena struktura hodiny', value: null },
        { id: 'educational_goals', label: 'Byly zohledněny výchovné cíle (např. komunikace, BOZP)', value: null }
      ]
    },
    flow: {
      title: 'Průběh výuky',
      comment: '',
      criteria: [
        { id: 'logical_structure', label: 'Logická návaznost částí (úvod, expozice, fixace, závěr)', value: null },
        { id: 'methods', label: 'Vhodnost zvolených metod a forem výuky', value: null },
        { id: 'content_correctness', label: 'Věcná správnost a přiměřenost obsahu', value: null },
        { id: 'time_management', label: 'Dodržení časového plánu', value: null }
      ]
    },
    materials: {
      title: 'Materiály a motivace',
      comment: '',
      criteria: [
        { id: 'material_use', label: 'Účelné využití pomůcek a techniky', value: null },
        { id: 'interdisciplinary', label: 'Aplikace mezipředmětových vztahů', value: null },
        { id: 'motivation', label: 'Schopnost motivovat a aktivizovat žáky', value: null }
      ]
    },
    personality: {
      title: 'Osobnost učitele',
      comment: '',
      criteria: [
        { id: 'communication', label: 'Komunikační dovednosti (verbální i neverbální)', value: null },
        { id: 'classroom_mgmt', label: 'Řízení třídy a udržení kázně', value: null },
        { id: 'relationship', label: 'Vztah k žákům a empatie', value: null },
        { id: 'appearance', label: 'Celkové vystupování a vzhled', value: null }
      ]
    }
  }
});

// Bloom Auditor State
const bloomAnalysis = ref(null);
const analyzingBloom = ref(false);

// Accordion State
const openSection = ref('goals');

const toggleSection = (sectionKey) => {
  openSection.value = openSection.value === sectionKey ? null : sectionKey;
};

// Actions
const fetchEvaluations = async () => {
  try {
    loading.value = true;
    evaluations.value = await PracticeService.getMicroteachings(props.user.id);
  } catch (err) {
    console.error(err);
    error.value = "Nepodařilo se načíst hodnocení.";
  } finally {
    loading.value = false;
  }
};

const startNewEvaluation = () => {
  // Reset form
  formData.value = {
    date: new Date().toISOString().slice(0, 10),
    subject: '',
    topic: '',
    goalText: '',
    sections: {
      goals: {
        title: 'Cíle výuky',
        comment: '',
        criteria: [
          { id: 'smart_goals', label: 'Cíle byly formulovány jasně a srozumitelně (SMART)', value: null },
          { id: 'structure_shared', label: 'Žákům byla sdělena struktura hodiny', value: null },
          { id: 'educational_goals', label: 'Byly zohledněny výchovné cíle (např. komunikace, BOZP)', value: null }
        ]
      },
      flow: {
        title: 'Průběh výuky',
        comment: '',
        criteria: [
          { id: 'logical_structure', label: 'Logická návaznost částí (úvod, expozice, fixace, závěr)', value: null },
          { id: 'methods', label: 'Vhodnost zvolených metod a forem výuky', value: null },
          { id: 'content_correctness', label: 'Věcná správnost a přiměřenost obsahu', value: null },
          { id: 'time_management', label: 'Dodržení časového plánu', value: null }
        ]
      },
      materials: {
        title: 'Materiály a motivace',
        comment: '',
        criteria: [
          { id: 'material_use', label: 'Účelné využití pomůcek a techniky', value: null },
          { id: 'interdisciplinary', label: 'Aplikace mezipředmětových vztahů', value: null },
          { id: 'motivation', label: 'Schopnost motivovat a aktivizovat žáky', value: null }
        ]
      },
      personality: {
        title: 'Osobnost učitele',
        comment: '',
        criteria: [
          { id: 'communication', label: 'Komunikační dovednosti (verbální i neverbální)', value: null },
          { id: 'classroom_mgmt', label: 'Řízení třídy a udržení kázně', value: null },
          { id: 'relationship', label: 'Vztah k žákům a empatie', value: null },
          { id: 'appearance', label: 'Celkové vystupování a vzhled', value: null }
        ]
      }
    }
  };
  bloomAnalysis.value = null;
  viewMode.value = 'form';
};

const cancelEvaluation = () => {
  viewMode.value = 'list';
};

const saveEvaluation = async () => {
  try {
    submitting.value = true;
    await PracticeService.addMicroteaching(props.user.id, {
      ...formData.value,
      bloomAnalysis: bloomAnalysis.value
    });
    await fetchEvaluations();
    viewMode.value = 'list';
  } catch (err) {
    console.error(err);
    alert("Chyba při ukládání: " + err.message);
  } finally {
    submitting.value = false;
  }
};

const analyzeBloom = async () => {
  if (!formData.value.goalText) return;
  analyzingBloom.value = true;
  try {
    bloomAnalysis.value = await AiService.analyzeBloom(formData.value.goalText);
  } catch (err) {
    console.error(err);
    bloomAnalysis.value = "Chyba při analýze.";
  } finally {
    analyzingBloom.value = false;
  }
};

const viewEvaluation = (evaluation) => {
  // Populate form with existing data (read-only mode could be added, but for now just load it)
  // Deep copy to avoid reference issues
  formData.value = JSON.parse(JSON.stringify(evaluation));
  // Ensure date is string
  if (formData.value.date && typeof formData.value.date !== 'string') {
      // It might be a timestamp from Firestore if not handled in service
      // Service handles toDate(), so it should be a Date object
      // But let's be safe. Wait, service returns Date object for createdAt, but `date` field in data is stored as string in addMicroteaching?
      // In addMicroteaching: `...evaluationData`. So `date` is stored as string 'YYYY-MM-DD'.
      // Correct.
  }

  if (evaluation.bloomAnalysis) {
    bloomAnalysis.value = evaluation.bloomAnalysis;
  } else {
    bloomAnalysis.value = null;
  }

  viewMode.value = 'form';
};

// Init
onMounted(fetchEvaluations);

</script>

<template>
  <div class="bg-white rounded-xl shadow-md overflow-hidden min-h-[500px]">

    <!-- Header -->
    <div class="bg-indigo-600 px-6 py-4 flex justify-between items-center">
      <h2 class="text-xl font-bold text-white flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        Výstupy (Microteaching)
      </h2>
      <button
        v-if="viewMode === 'list'"
        @click="startNewEvaluation"
        class="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-colors text-sm"
      >
        + Nové hodnocení
      </button>
      <button
        v-else
        @click="cancelEvaluation"
        class="bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-800 transition-colors text-sm"
      >
        Zpět na seznam
      </button>
    </div>

    <!-- Content -->
    <div class="p-6">

      <!-- List View -->
      <div v-if="viewMode === 'list'">
        <div v-if="loading" class="text-center py-10">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p class="mt-4 text-gray-500">Načítám hodnocení...</p>
        </div>

        <div v-else-if="evaluations.length === 0" class="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p class="text-gray-500">Zatím žádná hodnocení.</p>
          <button @click="startNewEvaluation" class="mt-4 text-indigo-600 font-medium hover:underline">Vytvořit první hodnocení</button>
        </div>

        <div v-else class="grid gap-4">
          <div
            v-for="evaluation in evaluations"
            :key="evaluation.id"
            @click="viewEvaluation(evaluation)"
            class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-shadow hover:shadow-sm flex justify-between items-center"
          >
            <div>
              <h3 class="font-bold text-gray-800">{{ evaluation.subject }} - {{ evaluation.topic }}</h3>
              <p class="text-sm text-gray-500">{{ new Date(evaluation.date).toLocaleDateString('cs-CZ') }}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Form View -->
      <div v-else class="space-y-8">

        <!-- Basic Info -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Datum</label>
            <input v-model="formData.date" type="date" class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Předmět</label>
            <input v-model="formData.subject" type="text" placeholder="např. Matematika" class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Téma</label>
            <input v-model="formData.topic" type="text" placeholder="např. Kvadratické rovnice" class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border px-3 py-2">
          </div>
        </div>

        <!-- Bloom's Auditor -->
        <div class="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
          <h3 class="font-bold text-indigo-800 flex items-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
            </svg>
            Bloomův auditor cílů
          </h3>

          <div class="flex flex-col md:flex-row gap-4">
            <div class="flex-grow">
              <label class="block text-xs font-medium text-indigo-600 uppercase mb-1">Cíl hodiny</label>
              <textarea
                v-model="formData.goalText"
                rows="2"
                placeholder="Napište cíl hodiny (např. Žák dokáže vlastními slovy vysvětlit...)"
                class="w-full rounded-md border-indigo-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3"
              ></textarea>
            </div>
            <div class="flex items-end">
              <button
                @click="analyzeBloom"
                :disabled="!formData.goalText || analyzingBloom"
                class="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap h-[42px] flex items-center justify-center min-w-[120px]"
              >
                <span v-if="analyzingBloom" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                Analyzovat
              </button>
            </div>
          </div>

          <div v-if="bloomAnalysis" class="mt-4 bg-white p-4 rounded-lg border border-indigo-100 text-sm text-gray-700 whitespace-pre-line shadow-sm">
            <h4 class="font-bold text-gray-800 mb-2">Výsledek analýzy:</h4>
            {{ bloomAnalysis }}
          </div>
        </div>

        <!-- Accordion Form -->
        <div class="space-y-4">
          <div
            v-for="(section, key) in formData.sections"
            :key="key"
            class="border border-gray-200 rounded-xl overflow-hidden shadow-sm"
          >
            <!-- Accordion Header -->
            <button
              @click="toggleSection(key)"
              class="w-full px-6 py-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span class="font-bold text-gray-800 text-lg">{{ section.title }}</span>
              <span
                class="transform transition-transform duration-200 text-gray-400"
                :class="{ 'rotate-180': openSection === key }"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </span>
            </button>

            <!-- Accordion Body -->
            <div v-show="openSection === key" class="p-6 bg-white border-t border-gray-100">

              <!-- Criteria List -->
              <div class="space-y-4 mb-6">
                <div v-for="criterion in section.criteria" :key="criterion.id" class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-50 last:border-0">
                  <span class="text-gray-700 text-sm font-medium">{{ criterion.label }}</span>
                  <div class="flex space-x-2 shrink-0">
                    <button
                      @click="criterion.value = 'yes'"
                      class="px-3 py-1 text-xs rounded-full border transition-colors"
                      :class="criterion.value === 'yes' ? 'bg-green-100 text-green-700 border-green-200 font-bold' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'"
                    >
                      ANO
                    </button>
                    <button
                      @click="criterion.value = 'partial'"
                      class="px-3 py-1 text-xs rounded-full border transition-colors"
                      :class="criterion.value === 'partial' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 font-bold' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'"
                    >
                      ČÁSTEČNĚ
                    </button>
                    <button
                      @click="criterion.value = 'no'"
                      class="px-3 py-1 text-xs rounded-full border transition-colors"
                      :class="criterion.value === 'no' ? 'bg-red-100 text-red-700 border-red-200 font-bold' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'"
                    >
                      NE
                    </button>
                  </div>
                </div>
              </div>

              <!-- Comment -->
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Komentář / Reflexe</label>
                <textarea
                  v-model="section.comment"
                  rows="3"
                  class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border p-3"
                  placeholder="Vlastní postřehy k této části..."
                ></textarea>
              </div>

            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end pt-4">
          <button
            @click="cancelEvaluation"
            class="mr-4 px-6 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            Zrušit
          </button>
          <button
            @click="saveEvaluation"
            :disabled="submitting"
            class="px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none flex items-center"
          >
            <span v-if="submitting" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
            Uložit hodnocení
          </button>
        </div>

      </div>
    </div>
  </div>
</template>
