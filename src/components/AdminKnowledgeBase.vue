<template>
  <div class="bg-white p-6 rounded-lg shadow border border-gray-200 mt-8">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-gray-800">AI Znalostní báze</h2>
      <div v-if="statusMessage" :class="statusClass" class="text-sm font-medium px-3 py-1 rounded">
        {{ statusMessage }}
      </div>
    </div>

    <p class="text-sm text-gray-600 mb-4">
      Zde můžete nahrát dokumenty (PDF, DOCX, TXT), které budou sloužit jako zdroj informací pro AI asistenta.
      Text můžete také ručně upravit.
    </p>

    <!-- File Upload -->
    <div class="mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">Nahrát dokument</label>
      <div class="flex items-center gap-4">
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          @change="handleFileUpload"
          class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          :disabled="isProcessing"
        />
        <span v-if="isProcessing" class="text-sm text-blue-600 animate-pulse">Zpracovávám...</span>
      </div>
    </div>

    <!-- Editor -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Obsah znalostní báze
        <span class="text-xs text-gray-500 font-normal ml-2">(Tento text bude použit jako instrukce pro AI)</span>
      </label>
      <textarea
        v-model="knowledgeBaseContent"
        rows="15"
        class="w-full px-3 py-2 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 font-mono"
        placeholder="Zde se zobrazí text z nahraného dokumentu..."
      ></textarea>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-3">
      <button
        @click="resetToDefault"
        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Obnovit výchozí
      </button>
      <button
        @click="saveKnowledgeBase"
        :disabled="isSaving"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center gap-2"
      >
        <span v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        {{ isSaving ? 'Ukládám...' : 'Uložit pro AI' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import mammoth from 'mammoth';
import { SYSTEM_INSTRUCTION as defaultInstruction } from '../data/knowledgeBase';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const knowledgeBaseContent = ref('');
const isProcessing = ref(false);
const isSaving = ref(false);
const statusMessage = ref('');
const statusType = ref('info'); // info, success, error

const statusClass = computed(() => {
  switch (statusType.value) {
    case 'success': return 'bg-green-100 text-green-800';
    case 'error': return 'bg-red-100 text-red-800';
    default: return 'bg-blue-100 text-blue-800';
  }
});

const showStatus = (msg, type = 'info', duration = 3000) => {
  statusMessage.value = msg;
  statusType.value = type;
  if (duration > 0) {
    setTimeout(() => {
      statusMessage.value = '';
    }, duration);
  }
};

onMounted(async () => {
  await loadKnowledgeBase();
});

const loadKnowledgeBase = async () => {
  try {
    const docRef = doc(db, 'system_settings', 'knowledgeBase');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      knowledgeBaseContent.value = docSnap.data().content;
    } else {
      // Fallback to default if not set in DB
      knowledgeBaseContent.value = defaultInstruction;
    }
  } catch (error) {
    console.error('Error loading knowledge base:', error);
    showStatus('Nepodařilo se načíst znalostní bázi.', 'error');
  }
};

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  isProcessing.value = true;
  showStatus('Zpracovávám soubor...', 'info', 0);

  try {
    let text = '';
    const fileType = file.name.split('.').pop().toLowerCase();

    if (fileType === 'txt') {
      text = await parseTxt(file);
    } else if (fileType === 'docx') {
      text = await parseDocx(file);
    } else if (fileType === 'pdf') {
      text = await parsePdf(file);
    } else {
      throw new Error('Nepodporovaný formát souboru.');
    }

    // Append or Replace? Let's replace for now as per "upload... to feed" usually implies setting the source.
    // However, user might want to append. Let's make it replace but user can copy-paste if needed.
    // Or better: Confirm with user? No, simplicity first. Just set it.
    knowledgeBaseContent.value = text;
    showStatus('Soubor úspěšně zpracován.', 'success');
  } catch (error) {
    console.error('Error parsing file:', error);
    showStatus(`Chyba při zpracování souboru: ${error.message}`, 'error');
  } finally {
    isProcessing.value = false;
    // Clear the input so the same file can be selected again if needed
    event.target.value = '';
  }
};

const parseTxt = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

const parseDocx = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

const parsePdf = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument(arrayBuffer);
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText;
};

const saveKnowledgeBase = async () => {
  if (!knowledgeBaseContent.value.trim()) {
    showStatus('Znalostní báze nemůže být prázdná.', 'error');
    return;
  }

  isSaving.value = true;
  try {
    const docRef = doc(db, 'system_settings', 'knowledgeBase');
    await setDoc(docRef, {
      content: knowledgeBaseContent.value,
      updatedAt: new Date()
    });
    showStatus('Znalostní báze byla uložena.', 'success');
  } catch (error) {
    console.error('Error saving knowledge base:', error);
    showStatus('Chyba při ukládání do databáze.', 'error');
  } finally {
    isSaving.value = false;
  }
};

const resetToDefault = () => {
  if (confirm('Opravdu chcete obnovit výchozí systémovou instrukci? Neuložené změny budou ztraceny.')) {
    knowledgeBaseContent.value = defaultInstruction;
  }
};
</script>
