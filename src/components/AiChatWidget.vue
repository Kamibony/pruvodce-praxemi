<script setup>
import { ref, nextTick, watch } from 'vue';

const isOpen = ref(false);
const messages = ref([
  { id: 1, text: "Ahoj! Jsem tvůj AI Sensei. S čím ti mohu pomoci?", isUser: false }
]);
const newMessage = ref("");
const isTyping = ref(false);
const chatBody = ref(null);

const toggleChat = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    scrollToBottom();
  }
};

const scrollToBottom = async () => {
  await nextTick();
  if (chatBody.value) {
    chatBody.value.scrollTop = chatBody.value.scrollHeight;
  }
};

const sendMessage = async () => {
  if (!newMessage.value.trim()) return;

  // Add user message
  messages.value.push({
    id: Date.now(),
    text: newMessage.value,
    isUser: true
  });

  newMessage.value = "";
  scrollToBottom();

  // Simulate AI thinking
  isTyping.value = true;

  // Mock Response Logic
  setTimeout(() => {
    isTyping.value = false;
    messages.value.push({
      id: Date.now() + 1,
      text: "To je zajímavá otázka! Jako AI Sensei se stále učím, ale brzy ti budu umět odpovědět lépe. Zatím si zapiš svou praxi do deníku.",
      isUser: false
    });
    scrollToBottom();
  }, 1500);
};
</script>

<template>
  <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-4">

    <!-- Chat Window -->
    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div v-if="isOpen" class="w-80 h-96 bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden">
        <!-- Header -->
        <div class="bg-blue-600 p-4 flex justify-between items-center text-white">
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <h3 class="font-bold text-sm">AI Sensei</h3>
          </div>
          <button @click="toggleChat" class="text-blue-200 hover:text-white transition-colors focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <!-- Messages -->
        <div ref="chatBody" class="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
          <div v-for="msg in messages" :key="msg.id" class="flex" :class="msg.isUser ? 'justify-end' : 'justify-start'">
            <div
              class="max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm"
              :class="msg.isUser ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'"
            >
              {{ msg.text }}
            </div>
          </div>

          <!-- Typing Indicator -->
          <div v-if="isTyping" class="flex justify-start">
            <div class="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex space-x-1 items-center">
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0s"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="p-3 bg-white border-t border-gray-100">
          <form @submit.prevent="sendMessage" class="flex items-center space-x-2">
            <input
              v-model="newMessage"
              type="text"
              placeholder="Napiš zprávu..."
              class="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            >
            <button
              type="submit"
              :disabled="!newMessage.trim() || isTyping"
              class="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </transition>

    <!-- FAB Button -->
    <button
      @click="toggleChat"
      class="text-white p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
      :class="isOpen ? 'bg-red-500 hover:bg-red-600 rotate-90' : 'bg-blue-600 hover:bg-blue-700'"
    >
      <!-- Using simple chat icon -->
      <svg v-if="!isOpen" xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>
