<template>
  <div class="bg-white p-6 rounded-lg shadow border border-gray-200 mt-8">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-gray-800">Správa dokumentů (AI Znalostní báze)</h2>
      <div v-if="statusMessage" :class="statusClass" class="text-sm font-medium px-3 py-1 rounded">
        {{ statusMessage }}
      </div>
    </div>

    <p class="text-sm text-gray-600 mb-4">
      Zde spravujete dokumenty, které slouží jako zdroj informací pro AI asistenta.
      AI bude odpovídat výhradně na základě obsahu těchto dokumentů.
    </p>

    <!-- File Upload -->
    <div class="mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">Nahrát nový dokument</label>
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

    <!-- Documents List -->
    <div class="mb-4">
      <h3 class="text-lg font-semibold text-gray-800 mb-3">Nahrané dokumenty</h3>

      <div v-if="documents.length === 0" class="text-gray-500 italic text-sm">
        Žádné dokumenty nebyly nahrány.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Název souboru</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum nahrání</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akce</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="doc in documents" :key="doc.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ doc.filename }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(doc.uploadedAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  @click="deleteDocument(doc.id)"
                  class="text-red-600 hover:text-red-900"
                  :disabled="isDeleting === doc.id"
                >
                  {{ isDeleting === doc.id ? 'Mazání...' : 'Smazat' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import AdminService from '../services/AdminService';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const documents = ref([]);
const isProcessing = ref(false);
const isDeleting = ref(null); // ID of document being deleted
const statusMessage = ref('');
const statusType = ref('info');

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
  await loadDocuments();
});

const loadDocuments = async () => {
  try {
    const docs = await AdminService.getKnowledgeBaseDocuments();
    // Sort by uploadedAt desc
    documents.value = docs.sort((a, b) => {
        const dateA = new Date(a.uploadedAt || 0);
        const dateB = new Date(b.uploadedAt || 0);
        return dateB - dateA;
    });
  } catch (error) {
    console.error('Error loading documents:', error);
    showStatus('Nepodařilo se načíst dokumenty.', 'error');
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

    const newDoc = {
        id: crypto.randomUUID(),
        filename: file.name,
        content: text,
        uploadedAt: new Date().toISOString()
    };

    await AdminService.addKnowledgeBaseDocument(newDoc);
    await loadDocuments(); // Reload list
    showStatus('Dokument úspěšně nahrán.', 'success');
  } catch (error) {
    console.error('Error parsing file:', error);
    showStatus(`Chyba při zpracování souboru: ${error.message}`, 'error');
  } finally {
    isProcessing.value = false;
    event.target.value = '';
  }
};

const deleteDocument = async (id) => {
    if(!confirm('Opravdu chcete smazat tento dokument?')) return;

    isDeleting.value = id;
    try {
        await AdminService.deleteKnowledgeBaseDocument(id);
        await loadDocuments();
        showStatus('Dokument byl smazán.', 'success');
    } catch (e) {
        console.error("Delete failed", e);
        showStatus('Chyba při mazání dokumentu.', 'error');
    } finally {
        isDeleting.value = null;
    }
}

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

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ') + ' ' + date.toLocaleTimeString('cs-CZ');
}
</script>
