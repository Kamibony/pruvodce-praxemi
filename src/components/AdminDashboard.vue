<script setup>
import { ref, onMounted, computed } from 'vue';
import AdminService from '../services/AdminService';
import AdminImport from './AdminImport.vue';
import { students as sourceStudents } from '../data/migrationData';

const students = ref([]);
const schools = ref({});
const loading = ref(true);
const error = ref(null);
const cleanupLoading = ref(false);
const cleanupResult = ref(null);

const runCleanup = async () => {
  if (!confirm('Opravdu chcete smazat studenty, kteří nejsou v Excelu (AdminImport)? Tato akce je nevratná.')) {
    return;
  }

  cleanupLoading.value = true;
  cleanupResult.value = null;

  try {
    const validIds = sourceStudents.map(s => s.id);
    const deletedNames = await AdminService.cleanupDatabase(validIds);

    if (deletedNames.length > 0) {
      cleanupResult.value = `Smazáno ${deletedNames.length} záznamů:\n${deletedNames.join(', ')}`;
      // Refresh list
      const [studentsData, schoolsData] = await Promise.all([
        AdminService.getAllStudentsWithStats(),
        AdminService.getSchools()
      ]);
      students.value = studentsData;
      schools.value = schoolsData;
    } else {
      cleanupResult.value = "Žádné staré záznamy nebyly nalezeny. Databáze je čistá.";
    }
  } catch (e) {
    console.error(e);
    alert("Chyba při čištění databáze: " + e.message);
  } finally {
    cleanupLoading.value = false;
  }
};

const orphanedStudents = computed(() => {
  return students.value.filter(student => {
    // Check if schoolId exists and is NOT in the schools map
    // We assume empty string means 'really no school assigned' and is valid?
    // Or maybe empty string is also an error?
    // The prompt says "students whose schoolId does not exist in the schools object".
    // If schoolId is "nezarazeno", it is not empty, and not in schools.
    if (!student.schoolId) return false;
    return !schools.value.hasOwnProperty(student.schoolId);
  });
});

onMounted(async () => {
  try {
    loading.value = true;
    const [studentsData, schoolsData] = await Promise.all([
      AdminService.getAllStudentsWithStats(),
      AdminService.getSchools()
    ]);
    students.value = studentsData;
    schools.value = schoolsData;
  } catch (e) {
    console.error(e);
    error.value = "Nepodařilo se načíst data.";
  } finally {
    loading.value = false;
  }
});

const getRowClass = (student) => {
  // Highlight students with < 50% progress (7.5h) in red
  if (student.totalHours < 7.5) {
    return 'bg-red-50 hover:bg-red-100';
  }
  return 'hover:bg-gray-50';
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 font-sans">
    <!-- Header -->
    <header class="bg-gray-900 text-white shadow-md">
      <div class="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 class="text-xl font-bold tracking-tight">Administrace praxí</h1>
        <div class="text-sm font-medium bg-gray-700 px-3 py-1 rounded-full">Admin Dashboard</div>
      </div>
    </header>

    <main class="container mx-auto px-4 py-8 max-w-6xl">
      <!-- Actions Toolbar -->
      <div class="bg-white shadow-sm p-4 mb-6 flex flex-col md:flex-row items-center justify-between rounded-lg border border-gray-200">
        <div class="mb-4 md:mb-0">
          <h2 class="text-lg font-semibold text-gray-700">Akce databáze</h2>
          <p class="text-sm text-gray-500">Správa a údržba záznamů.</p>
        </div>
        <div class="flex space-x-3">
          <button
            @click="runCleanup"
            :disabled="cleanupLoading || loading"
            class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 flex items-center transition-colors shadow"
          >
            <span v-if="cleanupLoading" class="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
            Smazat staré záznamy (Cleanup)
          </button>
        </div>
      </div>

      <div class="mb-6">
        <AdminImport />
      </div>

      <!-- Cleanup Result Message -->
      <div v-if="cleanupResult" class="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 mb-6 rounded shadow-sm whitespace-pre-line relative">
        <div class="font-bold mb-1">Výsledek čištění:</div>
        {{ cleanupResult }}
        <button @click="cleanupResult = null" class="absolute top-2 right-2 text-blue-400 hover:text-blue-600 font-bold">&times;</button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong class="font-bold">Chyba!</strong>
        <span class="block sm:inline">{{ error }}</span>
      </div>

      <div v-else class="space-y-6">
        <!-- Health Check Warning -->
        <div v-if="orphanedStudents.length > 0" class="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Kontrola integrity dat</h3>
              <div class="mt-2 text-sm text-red-700">
                <ul class="list-disc pl-5 space-y-1">
                  <li v-for="student in orphanedStudents" :key="student.id">
                    Chyba: Student <strong>{{ student.name }}</strong> má neznámou školu [{{ student.schoolId }}].
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 class="text-lg font-semibold text-gray-800">Přehled studentů</h2>
          <span class="text-sm text-gray-500">Celkem studentů: {{ students.length }}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jméno</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Škola</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Odpracováno</th>
                <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="student in students" :key="student.id" :class="getRowClass(student)" class="transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs mr-3">
                      {{ student.name.charAt(0) }}
                    </div>
                    <div class="text-sm font-medium text-gray-900">{{ student.name }}</div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ student.schoolName }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                  {{ student.totalHours }} h
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                  <span
                    class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                    :class="student.status === 'Splněno' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
                  >
                    {{ student.status }}
                  </span>
                </td>
              </tr>
              <tr v-if="students.length === 0">
                 <td colspan="4" class="px-6 py-8 text-center text-sm text-gray-500">
                    Žádní studenti k zobrazení.
                 </td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </main>
  </div>
</template>
