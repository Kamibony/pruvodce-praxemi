<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import Login from './components/Login.vue';
import Dashboard from './components/Dashboard.vue';
import AdminImport from './components/AdminImport.vue';
import AdminDashboard from './components/AdminDashboard.vue';

const currentHash = ref(window.location.hash);
const isLoggedIn = ref(false);
const currentUser = ref(null);

const handleLogin = (user) => {
  if (user) {
    currentUser.value = user;
    isLoggedIn.value = true;
  }
};

const updateHash = () => {
  currentHash.value = window.location.hash;
};

onMounted(() => {
  window.addEventListener('hashchange', updateHash);
});

onUnmounted(() => {
  window.removeEventListener('hashchange', updateHash);
});

const isRoute = (route) => currentHash.value === route;
</script>

<template>
  <AdminDashboard v-if="isRoute('#admin-dashboard')" />
  <AdminImport v-else-if="isRoute('#admin')" />
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
