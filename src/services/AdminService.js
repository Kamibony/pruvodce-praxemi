import { db } from '../firebase';
import { collection, getDocs, deleteDoc, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import PracticeService from './PracticeService';

class AdminService {
  /**
   * Updates a student's data.
   * @param {string} studentId - The ID of the student.
   * @param {object} data - The data to update (name, schoolId, goalHours).
   * @returns {Promise<void>}
   */
  async updateStudent(studentId, data) {
    if (!studentId) throw new Error("Student ID is required");
    try {
      const studentRef = doc(db, 'students', studentId);
      await updateDoc(studentRef, data);
    } catch (error) {
      console.error("Error updating student:", error);
      throw error;
    }
  }

  /**
   * Deletes a student.
   * @param {string} studentId - The ID of the student.
   * @returns {Promise<void>}
   */
  async deleteStudent(studentId) {
    if (!studentId) throw new Error("Student ID is required");
    // Safety check: Never delete the test user
    if (studentId === '999999') throw new Error("Cannot delete test user 999999");

    try {
      await deleteDoc(doc(db, 'students', studentId));
    } catch (error) {
      console.error("Error deleting student:", error);
      throw error;
    }
  }

  /**
   * Removes students from Firestore that are not in the valid ID list.
   * @param {Array<string>} validStudentIds - List of valid student IDs.
   * @returns {Promise<Array<string>>} List of deleted student names (or IDs).
   */
  async cleanupDatabase(validStudentIds) {
    if (!validStudentIds || !Array.isArray(validStudentIds)) {
      throw new Error("Invalid validStudentIds provided");
    }

    const deletedStudents = [];
    try {
      const studentsSnap = await getDocs(collection(db, 'students'));

      const deletePromises = [];

      for (const docSnap of studentsSnap.docs) {
        const studentId = docSnap.id;

        // Safety check: Never delete the test user
        if (studentId === '999999') continue;

        if (!validStudentIds.includes(studentId)) {
          const studentName = docSnap.data().name || studentId;
          deletedStudents.push(`${studentName} (${studentId})`);

          // Add to delete promises
          deletePromises.push(deleteDoc(doc(db, 'students', studentId)));
        }
      }

      await Promise.all(deletePromises);
      return deletedStudents;

    } catch (error) {
      console.error("Error cleaning up database:", error);
      throw error;
    }
  }

  /**
   * Fetches all schools.
   * @returns {Promise<Object>} Map of school IDs to names.
   */
  async getSchools() {
    try {
      const schoolsSnap = await getDocs(collection(db, 'schools'));
      const schoolsMap = {};
      schoolsSnap.forEach(doc => {
        schoolsMap[doc.id] = doc.data().name;
      });
      return schoolsMap;
    } catch (error) {
      console.error("Error fetching schools:", error);
      throw error;
    }
  }

  /**
   * Fetches all students with basic info (id, name).
   * @returns {Promise<Array>} List of students { id, name }.
   */
  async getAllStudentsBasic() {
    try {
      const studentsSnap = await getDocs(collection(db, 'students'));
      return studentsSnap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || ''
      }));
    } catch (error) {
      console.error("Error fetching students:", error);
      throw error;
    }
  }

  /**
   * Fetches all students and calculates their total practice hours.
   * optimize: fetches schools once, and fetches logs in parallel.
   * @returns {Promise<Array>} List of students with stats.
   */
  async getAllStudentsWithStats() {
    try {
      // 1. Fetch Students and Schools in parallel
      const [studentsSnap, schoolsMap] = await Promise.all([
        getDocs(collection(db, 'students')),
        this.getSchools()
      ]);

      // 3. Process each student
      const studentPromises = studentsSnap.docs.map(async (docSnap) => {
        const studentData = docSnap.data();
        const studentId = docSnap.id;

        // Fetch logs for this student
        let totalHours = 0;
        try {
          // Re-using PracticeService logic
          const logs = await PracticeService.getLogs(studentId);
          totalHours = PracticeService.calculateTotalHours(logs);
        } catch (e) {
          console.warn(`Failed to fetch logs for student ${studentId}`, e);
        }

        const goalHours = studentData.goalHours || 15;

        return {
          id: studentId,
          name: studentData.name || 'Neznámý',
          schoolId: studentData.schoolId || '',
          schoolName: schoolsMap[studentData.schoolId] || 'Neznámá škola',
          totalHours: totalHours,
          goalHours: goalHours,
          status: totalHours >= goalHours ? 'Splněno' : 'Probíhá'
        };
      });

      // 4. Wait for all students to be processed
      const students = await Promise.all(studentPromises);

      return students;
    } catch (error) {
      console.error("Error fetching admin data:", error);
      throw error;
    }
  }

  // --- Knowledge Base Methods ---

  /**
   * Fetches the list of knowledge base documents.
   * @returns {Promise<Array>} List of documents.
   */
  async getKnowledgeBaseDocuments() {
    try {
      const docRef = doc(db, 'system_settings', 'knowledgeBase');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().documents || [];
      }
      return [];
    } catch (error) {
      console.error("Error fetching knowledge base documents:", error);
      throw error;
    }
  }

  /**
   * Adds a document to the knowledge base.
   * @param {object} documentData - The document object { id, filename, content, uploadedAt }.
   * @returns {Promise<void>}
   */
  async addKnowledgeBaseDocument(documentData) {
    if (!documentData || !documentData.id || !documentData.content) {
      throw new Error("Invalid document data");
    }
    try {
      const docRef = doc(db, 'system_settings', 'knowledgeBase');
      const docSnap = await getDoc(docRef);

      let documents = [];
      if (docSnap.exists()) {
        documents = docSnap.data().documents || [];
      }

      documents.push(documentData);

      await setDoc(docRef, { documents: documents }, { merge: true });
    } catch (error) {
      console.error("Error adding knowledge base document:", error);
      throw error;
    }
  }

  /**
   * Removes a document from the knowledge base by ID.
   * @param {string} documentId - The ID of the document to remove.
   * @returns {Promise<void>}
   */
  async deleteKnowledgeBaseDocument(documentId) {
    if (!documentId) throw new Error("Document ID is required");
    try {
      const docRef = doc(db, 'system_settings', 'knowledgeBase');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        let documents = docSnap.data().documents || [];
        const initialLength = documents.length;
        documents = documents.filter(doc => doc.id !== documentId);

        if (documents.length !== initialLength) {
          await updateDoc(docRef, { documents: documents });
        }
      }
    } catch (error) {
      console.error("Error deleting knowledge base document:", error);
      throw error;
    }
  }

  // --- Import History Methods ---

  /**
   * Saves the metadata of the last successful import.
   * @param {string} fileName - The name of the imported file.
   * @returns {Promise<void>}
   */
  async saveImportHistory(fileName) {
    if (!fileName) throw new Error("File name is required");
    try {
      const docRef = doc(db, 'system_settings', 'importHistory');
      await setDoc(docRef, {
        fileName: fileName,
        importTimestamp: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving import history:", error);
      throw error;
    }
  }

  /**
   * Fetches the last import history metadata.
   * @returns {Promise<Object|null>} Object containing fileName and importTimestamp, or null if not found.
   */
  async getImportHistory() {
    try {
      const docRef = doc(db, 'system_settings', 'importHistory');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error("Error fetching import history:", error);
      throw error;
    }
  }
}

export default new AdminService();
