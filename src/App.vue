<script setup>
import { ref } from 'vue';
import Login from './components/Login.vue';
import Dashboard from './components/Dashboard.vue';

const isLoggedIn = ref(false);
const currentUser = ref(null);

const handleLogin = (user) => {
  if (user) {
    currentUser.value = user;
    isLoggedIn.value = true;
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
    @login="handleLogin"
  />
</template>
