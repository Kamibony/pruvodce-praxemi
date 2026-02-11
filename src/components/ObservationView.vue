<script setup>
import { ref, computed, onUnmounted } from 'vue';

// Constants
const EVENT_TYPES = {
  TEACHER: 'teacher_activity',
  STUDENT: 'student_activity',
  ADMIN: 'admin' // Use for notes or other events
};

const LABELS = {
  [EVENT_TYPES.TEACHER]: 'Aktivita učitele',
  [EVENT_TYPES.STUDENT]: 'Aktivita žáků',
  [EVENT_TYPES.ADMIN]: 'Poznámka / Jiné'
};

const QUESTIONS = [
  { id: 'topic_intro', label: 'Úvod do tématu (motivace, cíle)', rows: 3 },
  { id: 'methods', label: 'Použité metody a formy výuky', rows: 4 },
  { id: 'student_engagement', label: 'Zapojení žáků / Aktivita', rows: 3 },
  { id: 'conclusion', label: 'Závěr hodiny a hodnocení', rows: 3 }
];

// State
const isRunning = ref(false);
const startTime = ref(null);
const elapsedTime = ref(0); // in ms
const currentMode = ref(null); // 'teacher_activity' | 'student_activity' | null
const lastTick = ref(null);
const timerInterval = ref(null);

const durations = ref({
  [EVENT_TYPES.TEACHER]: 0,
  [EVENT_TYPES.STUDENT]: 0
});

const events = ref([]); // { id, timestamp, type, note }
const answers = ref({});

// Initialize answers
QUESTIONS.forEach(q => {
  answers.value[q.id] = '';
});

// Computed
const formattedTime = computed(() => {
  const totalSeconds = Math.floor(elapsedTime.value / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
});

const trackedDuration = computed(() => {
  return durations.value[EVENT_TYPES.TEACHER] + durations.value[EVENT_TYPES.STUDENT];
});

const stats = computed(() => {
  const total = trackedDuration.value || 1; // Avoid division by zero
  const teacherPct = (durations.value[EVENT_TYPES.TEACHER] / total) * 100;
  const studentPct = (durations.value[EVENT_TYPES.STUDENT] / total) * 100;
  return {
    teacher: Math.round(teacherPct),
    student: Math.round(studentPct)
  };
});

// Actions
const startTimer = () => {
  if (isRunning.value) return;

  isRunning.value = true;
  if (!startTime.value) {
    startTime.value = Date.now();
    // Default to admin/neutral mode initially or wait for input?
    // Let's wait for input.
  }
  lastTick.value = Date.now();

  timerInterval.value = setInterval(() => {
    const now = Date.now();
    const delta = now - lastTick.value;
    lastTick.value = now;

    elapsedTime.value += delta;

    if (currentMode.value && durations.value[currentMode.value] !== undefined) {
      durations.value[currentMode.value] += delta;
    }
  }, 100); // Update every 100ms for smoothness
};

const stopTimer = () => {
  if (!isRunning.value) return;
  isRunning.value = false;
  clearInterval(timerInterval.value);
  currentMode.value = null; // Stop tracking specific activity duration
};

const toggleTimer = () => {
  if (isRunning.value) stopTimer();
  else startTimer();
};

const logEvent = (type) => {
  if (!isRunning.value) startTimer(); // Auto-start if clicking an activity

  // If switching modes, log the switch
  if (currentMode.value !== type) {
    currentMode.value = type;
  }

  events.value.push({
    id: Date.now(),
    timestamp: elapsedTime.value,
    type: type,
    note: ''
  });

  // Scroll to bottom of timeline (optional, usually handled by UI ref)
};

const formatTimestamp = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const secs = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const goBack = () => {
  window.location.hash = ''; // Return to Dashboard
};

const saveObservation = () => {
  // Mock save
  const observationData = {
    date: new Date().toISOString(),
    duration: elapsedTime.value,
    stats: stats.value,
    events: events.value,
    answers: answers.value
  };
  console.log('Saving Observation:', observationData);
  alert('Náslech byl úspěšně uložen (simulace).');
  goBack();
};

onUnmounted(() => {
  if (timerInterval.value) clearInterval(timerInterval.value);
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col font-sans">
    <!-- Header -->
    <header class="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
      <div class="container mx-auto px-4 py-3 flex justify-between items-center">
        <div class="flex items-center space-x-3">
          <button @click="goBack" class="text-gray-500 hover:text-gray-800 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 class="text-lg font-bold text-gray-800">Pedagogický náslech</h1>
        </div>

        <div class="flex items-center space-x-4">
          <div class="text-2xl font-mono font-bold text-gray-900 w-20 text-center">
            {{ formattedTime }}
          </div>
          <button
            @click="toggleTimer"
            class="px-4 py-2 rounded-full font-medium transition-colors shadow-sm flex items-center space-x-2"
            :class="isRunning ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'"
          >
            <span v-if="isRunning">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd" />
              </svg>
            </span>
            <span v-else>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
              </svg>
            </span>
            <span>{{ isRunning ? 'Stop' : 'Start' }}</span>
          </button>
        </div>
      </div>
    </header>

    <main class="flex-grow container mx-auto px-4 py-6 max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-8">

      <!-- Left Column: Controls & Stats -->
      <div class="lg:col-span-1 space-y-6">

        <!-- Activity Logger -->
        <section class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 class="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Záznam aktivity</h2>
          <div class="grid grid-cols-1 gap-4">
            <button
              @click="logEvent(EVENT_TYPES.TEACHER)"
              class="flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200"
              :class="currentMode === EVENT_TYPES.TEACHER ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-700'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span class="font-bold">Učitel</span>
            </button>

            <button
              @click="logEvent(EVENT_TYPES.STUDENT)"
              class="flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200"
              :class="currentMode === EVENT_TYPES.STUDENT ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200' : 'border-gray-200 hover:border-green-300 hover:bg-gray-50 text-gray-700'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span class="font-bold">Žáci</span>
            </button>

            <button
              @click="logEvent(EVENT_TYPES.ADMIN)"
              class="flex items-center justify-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Přidat poznámku
            </button>
          </div>
        </section>

        <!-- Live Stats -->
        <section class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 class="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Poměr aktivity</h2>

          <div class="flex justify-between items-end mb-2 text-sm font-medium">
            <span class="text-blue-600">Učitel: {{ stats.teacher }}%</span>
            <span class="text-green-600">Žáci: {{ stats.student }}%</span>
          </div>

          <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden flex">
            <div
              class="bg-blue-500 h-full transition-all duration-500"
              :style="{ width: `${stats.teacher}%` }"
            ></div>
            <div
              class="bg-green-500 h-full transition-all duration-500"
              :style="{ width: `${stats.student}%` }"
            ></div>
          </div>

          <div class="mt-4 text-xs text-gray-400 text-center">
            Měřeno na základě času stráveného v jednotlivých módech.
          </div>
        </section>
      </div>

      <!-- Center & Right: Timeline & Form -->
      <div class="lg:col-span-2 space-y-8">

        <!-- Timeline -->
        <section class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col max-h-[500px]">
          <div class="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 class="font-bold text-gray-700">Časová osa</h2>
            <span class="text-xs text-gray-500 bg-white px-2 py-1 rounded border">{{ events.length }} událostí</span>
          </div>

          <div class="overflow-y-auto p-4 space-y-4 flex-grow custom-scrollbar">
            <div v-if="events.length === 0" class="text-center py-10 text-gray-400 italic">
              Zatím žádné události. Spusťte časovač a logujte aktivitu.
            </div>

            <div
              v-for="(event, index) in events"
              :key="event.id"
              class="relative pl-6 border-l-2 pb-4 last:pb-0"
              :class="{
                'border-blue-300': event.type === EVENT_TYPES.TEACHER,
                'border-green-300': event.type === EVENT_TYPES.STUDENT,
                'border-gray-300': event.type === EVENT_TYPES.ADMIN
              }"
            >
              <!-- Timeline Dot -->
              <div
                class="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 bg-white"
                :class="{
                  'border-blue-500': event.type === EVENT_TYPES.TEACHER,
                  'border-green-500': event.type === EVENT_TYPES.STUDENT,
                  'border-gray-400': event.type === EVENT_TYPES.ADMIN
                }"
              ></div>

              <div class="flex justify-between items-start mb-1">
                <span
                  class="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded"
                  :class="{
                    'bg-blue-100 text-blue-800': event.type === EVENT_TYPES.TEACHER,
                    'bg-green-100 text-green-800': event.type === EVENT_TYPES.STUDENT,
                    'bg-gray-100 text-gray-800': event.type === EVENT_TYPES.ADMIN
                  }"
                >
                  {{ LABELS[event.type] }}
                </span>
                <span class="text-xs font-mono text-gray-500">{{ formatTimestamp(event.timestamp) }}</span>
              </div>

              <input
                v-model="event.note"
                type="text"
                placeholder="Poznámka..."
                class="w-full text-sm border-gray-200 rounded-md focus:border-blue-500 focus:ring-blue-500 bg-gray-50 px-3 py-1.5 transition-colors hover:bg-white"
              >
            </div>
          </div>
        </section>

        <!-- Reflection Form -->
        <section class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 class="text-lg font-bold text-gray-800 mb-6 border-b pb-2">Reflexe hodiny</h2>

          <form @submit.prevent="saveObservation" class="space-y-6">
            <div v-for="q in QUESTIONS" :key="q.id">
              <label :for="q.id" class="block text-sm font-medium text-gray-700 mb-2">
                {{ q.label }}
              </label>
              <textarea
                :id="q.id"
                v-model="answers[q.id]"
                :rows="q.rows"
                class="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Vaše postřehy..."
              ></textarea>
            </div>

            <div class="pt-4 flex justify-end">
              <button
                type="submit"
                class="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Uložit náslech
              </button>
            </div>
          </form>
        </section>

      </div>
    </main>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
