import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

class StudentService {
  async login(studentId) {
    if (!studentId) return null;
    const id = String(studentId).trim();
    try {
      const docRef = doc(db, 'students', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  }

  async getDashboardData(studentId) {
    if (!studentId) throw new Error("Student ID is required");
    const id = String(studentId).trim();

    try {
      // 1. Get Student Data (re-fetch to ensure fresh data)
      const studentRef = doc(db, 'students', id);
      const studentSnap = await getDoc(studentRef);

      if (!studentSnap.exists()) {
        throw new Error("Student not found");
      }

      const studentData = studentSnap.data();
      const schoolId = studentData.schoolId;

      // 2. Get School Data
      let schoolData = null;
      if (schoolId) {
        const schoolRef = doc(db, 'schools', schoolId);
        const schoolSnap = await getDoc(schoolRef);
        if (schoolSnap.exists()) {
          schoolData = { id: schoolSnap.id, ...schoolSnap.data() };
        }
      }

      // 3. Get Team (students in the same school)
      const team = [];
      if (schoolId) {
        const q = query(collection(db, 'students'), where('schoolId', '==', schoolId));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          if (doc.id !== id) {
             team.push({ id: doc.id, ...doc.data() });
          }
        });
      }

      // 4. Get FAQ
      let faq = [];
      // Primary strategy: content/faq
      try {
        const faqRef = doc(db, 'content', 'faq');
        const faqSnap = await getDoc(faqRef);

        if (faqSnap.exists()) {
          faq = faqSnap.data().items || [];
        } else {
          // Fallback strategy: separate faq collection
          const faqCol = collection(db, 'faq');
          const faqSnapshot = await getDocs(faqCol);
          if (!faqSnapshot.empty) {
            faq = faqSnapshot.docs.map(d => d.data());
          }
        }
      } catch (e) {
        console.warn("Failed to load FAQ:", e);
      }

      return {
        user: { id, ...studentData },
        school: schoolData,
        team: team,
        faq: faq
      };

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      throw error;
    }
  }
}

export default new StudentService();
