<script setup>
import { ref, defineEmits } from 'vue';
import StudentService from '../services/StudentService';

const emit = defineEmits(['login']);
const code = ref('');
const error = ref('');
const loading = ref(false);

const handleSubmit = async () => {
  if (!code.value.trim()) return;

  loading.value = true;
  error.value = '';

  try {
    const user = await StudentService.login(code.value.trim());
    if (user) {
      emit('login', user);
    } else {
      error.value = 'Neplatný kód. Zkontrolujte prosím zadání.';
    }
  } catch (err) {
    console.error(err);
    error.value = 'Chyba při přihlašování. Zkuste to prosím později.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100 px-4">
    <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
      <h2 class="text-2xl font-bold mb-6 text-center text-blue-600">Průvodce praxemi</h2>
      <form @submit.prevent="handleSubmit">
        <div class="mb-6">
          <label for="code" class="block text-gray-700 text-sm font-bold mb-2">Váš kód</label>
          <input
            id="code"
            v-model="code"
            type="text"
            placeholder="např. 242324"
            class="shadow-sm appearance-none border rounded w-full py-3 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            :disabled="loading"
          />
        </div>
        <p v-if="error" class="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded border border-red-100">{{ error }}</p>
        <button
          type="submit"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out shadow-lg transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading"
        >
          <span v-if="loading">Přihlašování...</span>
          <span v-else>Vstoupit</span>
        </button>
      </form>
      <p class="text-center text-gray-400 text-xs mt-6">Zadejte kód, který jste obdrželi od garanta.</p>
    </div>
  </div>
</template>
