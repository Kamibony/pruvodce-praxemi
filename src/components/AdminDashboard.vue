<script setup>
import { ref, onMounted, computed } from 'vue';
import { utils, writeFile } from 'xlsx';
import AdminService from '../services/AdminService';
import AdminImport from './AdminImport.vue';

const students = ref([]);
const schools = ref({});
const loading = ref(true);
const error = ref(null);
const searchQuery = ref('');

// Edit Modal State
const isEditModalOpen = ref(false);
const editingStudent = ref(null);
const isSaving = ref(false);

const filteredStudents = computed(() => {
  if (!searchQuery.value) return students.value;
  const lowerQuery = searchQuery.value.toLowerCase();
  return students.value.filter(s => s.name.toLowerCase().includes(lowerQuery));
});

const orphanedStudents = computed(() => {
  return students.value.filter(student => {
    if (!student.schoolId) return false;
    return !schools.value.hasOwnProperty(student.schoolId);
  });
});

const loadData = async () => {
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
};

onMounted(loadData);

const exportToExcel = () => {
  const data = filteredStudents.value.map(s => ({
    'Jméno': s.name,
    'Škola': s.schoolName,
    'Cílový počet hodin': s.goalHours,
    'Odpracováno hodin': s.totalHours,
    'Status': s.status
  }));

  const ws = utils.json_to_sheet(data);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Studenti");
  writeFile(wb, "prehled_studentu.xlsx");
};

const openEditModal = (student) => {
  editingStudent.value = { ...student };
  isEditModalOpen.value = true;
};

const closeEditModal = () => {
  isEditModalOpen.value = false;
  editingStudent.value = null;
};

const saveStudent = async () => {
  if (!editingStudent.value) return;
  isSaving.value = true;
  try {
    await AdminService.updateStudent(editingStudent.value.id, {
      name: editingStudent.value.name,
      schoolId: editingStudent.value.schoolId,
      goalHours: Number(editingStudent.value.goalHours)
    });

    // Refresh local data
    const index = students.value.findIndex(s => s.id === editingStudent.value.id);
    if (index !== -1) {
       const schoolName = schools.value[editingStudent.value.schoolId] || 'Neznámá škola';
       const status = students.value[index].totalHours >= editingStudent.value.goalHours ? 'Splněno' : 'Probíhá';

       students.value[index] = {
         ...students.value[index],
         ...editingStudent.value,
         schoolName,
         status
       };
    }
    closeEditModal();
  } catch (e) {
    alert("Chyba při ukládání: " + e.message);
  } finally {
    isSaving.value = false;
  }
};

const deleteStudent = async (student) => {
  if (!confirm(`Opravdu chcete smazat studenta ${student.name}? Tato akce je nevratná.`)) return;

  try {
    await AdminService.deleteStudent(student.id);
    students.value = students.value.filter(s => s.id !== student.id);
  } catch (e) {
    alert("Chyba při mazání: " + e.message);
  }
};

const getRowClass = (student) => {
  if (student.totalHours < (student.goalHours / 2)) {
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
      <!-- Import Section -->
      <div class="mb-6">
        <AdminImport />
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
              <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
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

        <!-- Student Table Section -->
        <div class="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          <div class="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
               <h2 class="text-lg font-semibold text-gray-800">Přehled studentů</h2>
               <span class="text-sm text-gray-500">Celkem studentů: {{ filteredStudents.length }}</span>
            </div>

            <div class="flex flex-col md:flex-row gap-2 w-full md:w-auto">
               <input
                 v-model="searchQuery"
                 type="text"
                 placeholder="Hledat studenta..."
                 class="border rounded px-3 py-2 text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
               />
               <button
                 @click="exportToExcel"
                 class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-sm flex items-center justify-center gap-2 whitespace-nowrap"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                 </svg>
                 Exportovat do Excelu
               </button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jméno</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Škola</th>
                  <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cíl (h)</th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Odpracováno</th>
                  <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Akce</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="student in filteredStudents" :key="student.id" :class="getRowClass(student)" class="transition-colors">
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
                  <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 font-medium">
                    {{ student.goalHours }}
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
                  <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button @click="openEditModal(student)" class="text-blue-600 hover:text-blue-900 mr-3">Upravit</button>
                    <button @click="deleteStudent(student)" class="text-red-600 hover:text-red-900">Smazat</button>
                  </td>
                </tr>
                <tr v-if="filteredStudents.length === 0">
                   <td colspan="6" class="px-6 py-8 text-center text-sm text-gray-500">
                      Žádní studenti k zobrazení.
                   </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>

    <!-- Edit Modal -->
    <div v-if="isEditModalOpen" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div class="bg-white p-5 rounded-lg shadow-xl w-96">
        <h3 class="text-lg font-bold mb-4 text-gray-800">Upravit studenta</h3>
        <form @submit.prevent="saveStudent">
          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">Jméno</label>
            <input v-model="editingStudent.name" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" type="text" required>
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">Škola</label>
            <select v-model="editingStudent.schoolId" class="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Vyberte školu --</option>
              <option v-for="(name, id) in schools" :key="id" :value="id">{{ name }}</option>
            </select>
          </div>
          <div class="mb-6">
            <label class="block text-gray-700 text-sm font-bold mb-2">Cílový počet hodin</label>
            <input v-model="editingStudent.goalHours" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" type="number" required>
          </div>
          <div class="flex justify-end space-x-2">
             <button type="button" @click="closeEditModal" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition">Zrušit</button>
             <button type="submit" :disabled="isSaving" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition flex items-center">
                <span v-if="isSaving" class="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                {{ isSaving ? 'Ukládám...' : 'Uložit' }}
             </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
