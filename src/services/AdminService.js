import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import PracticeService from './PracticeService';

class AdminService {
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
          totalHours = PracticeService.calculateTotalHours(logs); // Note: calculateTotalHours is synchronous if logs is array
          // Wait, PracticeService.calculateTotalHours is an instance method? Yes.
          // But wait, logs is an array of objects. calculateTotalHours takes array.
          // Let's check PracticeService definition.
          // calculateTotalHours(logs) { ... }
          // Yes.

          // Actually, getLogs returns Promise<Array>. So we await it.
          // Then calculateTotalHours.

           // Re-read PracticeService.js:
           // calculateTotalHours(logs) { if (!Array.isArray(logs)) return 0; ... }
           // Yes.

           // However, if getLogs throws (e.g. permission denied?), we catch it.
        } catch (e) {
          console.warn(`Failed to fetch logs for student ${studentId}`, e);
        }

        return {
          id: studentId,
          name: studentData.name || 'Neznámý',
          schoolId: studentData.schoolId || '',
          schoolName: schoolsMap[studentData.schoolId] || 'Neznámá škola',
          totalHours: totalHours,
          status: totalHours >= 15 ? 'Splněno' : 'Probíhá' // Assuming 15h goal
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
}

export default new AdminService();
