import { db } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';

class PracticeService {
  /**
   * Adds a new practice log for a student.
   * @param {string} studentId - The ID of the student.
   * @param {object} logData - The log data { date, activity, hours }.
   * @returns {Promise<string>} The ID of the created log.
   */
  async addLog(studentId, logData) {
    if (!studentId) throw new Error("Student ID is required");

    // Validate logData
    if (!logData.activity || logData.activity.length < 5) {
      throw new Error("Activity must be at least 5 characters long.");
    }
    if (logData.hours < 0.5 || logData.hours > 12) {
      throw new Error("Hours must be between 0.5 and 12.");
    }

    try {
      const logsRef = collection(db, 'students', studentId, 'logs');
      // Ensure date is a valid Firestore Timestamp or Date object
      const date = logData.date instanceof Date ? logData.date : new Date(logData.date);

      const docRef = await addDoc(logsRef, {
        date: Timestamp.fromDate(date),
        activity: logData.activity,
        hours: Number(logData.hours),
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error("Error adding log:", error);
      throw error;
    }
  }

  /**
   * Retrieves practice logs for a student, ordered by date descending.
   * @param {string} studentId - The ID of the student.
   * @returns {Promise<Array>} List of logs.
   */
  async getLogs(studentId) {
    if (!studentId) throw new Error("Student ID is required");

    try {
      const logsRef = collection(db, 'students', studentId, 'logs');
      const q = query(logsRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Timestamp to JS Date for easier usage in UI
        date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)
      }));
    } catch (error) {
      console.error("Error fetching logs:", error);
      throw error;
    }
  }

  /**
   * Calculates total hours from a list of logs.
   * @param {Array} logs - List of logs.
   * @returns {number} Total hours.
   */
  calculateTotalHours(logs) {
    if (!Array.isArray(logs)) return 0;
    return logs.reduce((total, log) => total + (Number(log.hours) || 0), 0);
  }
}

export default new PracticeService();
