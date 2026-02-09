<script setup>
import { ref } from 'vue';
import Login from './components/Login.vue';
import Dashboard from './components/Dashboard.vue';
import db from './db.json';

const isLoggedIn = ref(false);
const currentUser = ref(null);
const loginError = ref('');

const handleLogin = (code) => {
  // Simple case-insensitive check
  const student = db.students.find(s => s.id.toLowerCase() === code.trim().toLowerCase());

  if (student) {
    currentUser.value = student;
    isLoggedIn.value = true;
    loginError.value = '';
  } else {
    loginError.value = 'Neplatný kód. Zkontrolujte prosím zadání.';
  }
};
</script>

<template>
  <Dashboard
    v-if="isLoggedIn"
    :user="currentUser"
  />
  <Login
    v-else
    :error="loginError"
    @login="handleLogin"
  />
</template>
