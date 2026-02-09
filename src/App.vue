<script setup>
import { ref } from 'vue';
import Login from './components/Login.vue';
import Dashboard from './components/Dashboard.vue';
import AdminImport from './components/AdminImport.vue';

const showAdmin = ref(window.location.hash === '#admin');
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
  <AdminImport v-if="showAdmin" />
  <div v-else>
    <Dashboard
      v-if="isLoggedIn"
      :user="currentUser"
    />
    <Login
      v-else
      @login="handleLogin"
    />
  </div>
</template>
