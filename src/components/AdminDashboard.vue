<script setup>
import { ref, onMounted } from 'vue';
import AdminService from '../services/AdminService';

const students = ref([]);
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
  try {
    loading.value = true;
    students.value = await AdminService.getAllStudentsWithStats();
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
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong class="font-bold">Chyba!</strong>
        <span class="block sm:inline">{{ error }}</span>
      </div>

      <div v-else class="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
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
    </main>
  </div>
</template>
