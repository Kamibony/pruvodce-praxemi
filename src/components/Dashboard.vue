<script setup>
import { ref, onMounted, defineProps } from 'vue';
import StudentService from '../services/StudentService';

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
});

const school = ref(null);
const team = ref([]);
const faq = ref([]);
const loading = ref(true);
const error = ref(null);

const openFaqIndex = ref(null);

const toggleFaq = (index) => {
  openFaqIndex.value = openFaqIndex.value === index ? null : index;
};

onMounted(async () => {
  try {
    loading.value = true;
    const data = await StudentService.getDashboardData(props.user.id);
    school.value = data.school;
    team.value = data.team;
    faq.value = data.faq;
  } catch (err) {
    console.error(err);
    error.value = "Nepodařilo se načíst data.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col font-sans">
    <!-- Header -->
    <header class="bg-blue-600 text-white shadow-md">
      <div class="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 class="text-xl font-bold tracking-tight">Průvodce praxemi</h1>
        <div class="text-sm font-medium bg-blue-700 px-3 py-1 rounded-full">{{ user.name }}</div>
      </div>
    </header>

    <main class="flex-grow container mx-auto px-4 py-8 space-y-8 max-w-4xl">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong class="font-bold">Chyba!</strong>
        <span class="block sm:inline">{{ error }}</span>
      </div>

      <div v-else>
        <!-- Greeting -->
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
          <h2 class="text-3xl font-bold text-gray-800">Ahoj, {{ user.name.split(' ')[0] }}!</h2>
          <p class="text-gray-600 mt-2 text-lg">Vítej ve své aplikaci pro správu praxe.</p>
        </div>

        <!-- My School Card -->
        <section class="bg-white rounded-xl shadow-md overflow-hidden border-t-4 border-blue-600 transition hover:shadow-lg mb-8">
          <div class="p-6">
            <h3 class="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <span class="bg-blue-100 text-blue-600 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </span>
              Moje škola
            </h3>

            <div v-if="school" class="space-y-4">
              <div>
                <p class="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Název školy</p>
                <p class="text-xl font-medium text-gray-900">{{ school.name }}</p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p class="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Zaměření</p>
                  <p class="text-gray-900 bg-gray-100 inline-block px-2 py-1 rounded">{{ school.focus }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Termín</p>
                  <p class="text-gray-900 font-medium">{{ user.week }}</p>
                </div>
              </div>

              <div class="bg-blue-50 p-4 rounded-lg mt-2 border border-blue-100">
                <p class="text-sm text-blue-800 font-bold mb-1 uppercase tracking-wide">Kontakt na koordinátora</p>
                <p class="text-blue-900 font-medium">{{ school.coord }}</p>
              </div>
            </div>
            <div v-else class="text-red-500 bg-red-50 p-4 rounded-lg">
              Informace o škole nejsou dostupné. Kontaktujte prosím garanta.
            </div>
          </div>
        </section>

        <!-- My Team Card -->
        <section class="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg mb-8">
          <h3 class="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <span class="bg-green-100 text-green-600 p-2 rounded-full mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            Můj tým <span class="text-gray-400 text-base font-normal ml-2">(spolužáci na stejné škole)</span>
          </h3>

          <div v-if="team.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="student in team" :key="student.id" class="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-white hover:shadow-md transition duration-200">
              <div class="h-10 w-10 min-w-[2.5rem] rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold mr-3 shadow-inner">
                {{ student.name.charAt(0) }}
              </div>
              <div class="overflow-hidden">
                <p class="font-bold text-gray-900 truncate">{{ student.name }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ student.week }}</p>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p>Na této škole jste zatím jediný student.</p>
          </div>
        </section>

        <!-- FAQ Section -->
        <section class="bg-white rounded-xl shadow-md p-6">
          <h3 class="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <span class="bg-yellow-100 text-yellow-600 p-2 rounded-full mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            Časté dotazy
          </h3>

          <div class="space-y-3">
            <div v-for="(item, index) in faq" :key="index" class="border border-gray-200 rounded-lg overflow-hidden">
              <button
                @click="toggleFaq(index)"
                class="w-full text-left px-5 py-4 bg-white hover:bg-gray-50 focus:outline-none flex justify-between items-center transition-colors duration-200"
              >
                <span class="font-medium text-gray-800 text-base pr-4">{{ item.q }}</span>
                <span class="text-blue-500 transform transition-transform duration-200 flex-shrink-0" :class="{ 'rotate-180': openFaqIndex === index }">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </span>
              </button>
              <div
                v-show="openFaqIndex === index"
                class="px-5 py-4 bg-gray-50 text-gray-700 leading-relaxed border-t border-gray-200 shadow-inner"
              >
                {{ item.a }}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-gray-900 text-gray-300 mt-12 py-10">
      <div class="container mx-auto px-4 text-center">
        <h4 class="font-bold text-xl text-white mb-2">Garant praxe</h4>
        <p class="text-lg">JUDr. Aneta Vadovičová</p>
        <a href="mailto:vadovicova@ivp.czu.cz" class="text-blue-400 hover:text-blue-300 transition-colors mt-2 inline-flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          vadovicova@ivp.czu.cz
        </a>
        <div class="mt-8 text-sm text-gray-600 border-t border-gray-800 pt-6">
          &copy; 2023 Průvodce praxemi pro univerzitní studenty.
        </div>
      </div>
    </footer>
  </div>
</template>
