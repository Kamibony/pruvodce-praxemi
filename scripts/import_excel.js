import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, writeBatch } from "firebase/firestore";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIGURATION
// TODO: Replace with your actual Firebase configuration or ensure environment variables are set
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: "pruvodce-praxemi-2026.firebaseapp.com",
  projectId: "pruvodce-praxemi-2026",
  storageBucket: "pruvodce-praxemi-2026.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: process.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DB_JSON_PATH = path.resolve(__dirname, "../src/db.json");
const EXCEL_PATH = path.resolve(__dirname, "../UPV 3.xlsx");

// Czech Localization Map
const LOCALIZATION_MAP = {
  "1. týždeň": "1. týden",
  "2. týždeň": "2. týden",
  "3. týždeň": "3. týden",
  "4. týždeň": "4. týden",
  "týždeň": "týden"
};

const localizeString = (str) => {
  if (!str) return "";
  let localized = String(str);
  for (const [slovak, czech] of Object.entries(LOCALIZATION_MAP)) {
    if (localized.includes(slovak)) {
      localized = localized.replace(slovak, czech);
    }
  }
  return localized;
};

const importData = async () => {
  try {
    console.log("Starting migration...");

    // 1. Seed Static Content (FAQ)
    console.log("Seeding FAQ...");
    const faqData = [
      {
        q: "Mám zkrácenou praxi, když neučím?",
        a: "Ne. Rozsah je stanoven metodikou (např. 12 týdnů). Praxe je povinná."
      },
      {
        q: "Je to 15 dní nebo 15 hodin?",
        a: "Nezaměňovat. 15 hodin jsou 'výstupy' (učíte vy), ale ve škole musíte být přítomni dle dohody."
      },
      {
        q: "Kdy mám kontaktovat školu?",
        a: "Nejpozději 14 dní před nástupem. Kontakty máte na nástěnce."
      },
      {
        q: "Co když nestíhám/jsem nemocný?",
        a: "Okamžitě kontaktujte cvičného učitele a garanta (JUDr. Vadovičová)."
      }
    ];

    try {
      await setDoc(doc(db, "content", "faq"), { items: faqData });
      console.log("FAQ seeded.");
    } catch (e) {
      console.error("Failed to seed FAQ (Permission/Auth Error?):", e.message);
    }

    // 2. Seed Schools from db.json
    if (fs.existsSync(DB_JSON_PATH)) {
      console.log("Reading db.json for schools...");
      const dbJson = JSON.parse(fs.readFileSync(DB_JSON_PATH, "utf8"));
      const schools = dbJson.schools;

      const batch = writeBatch(db);
      let count = 0;

      for (const [id, data] of Object.entries(schools)) {
        const schoolRef = doc(db, "schools", id);
        batch.set(schoolRef, data);
        count++;
      }
      try {
        await batch.commit();
        console.log(`Uploaded ${count} schools.`);
      } catch (e) {
        console.error("Failed to upload schools (Permission/Auth Error?):", e.message);
      }
    } else {
      console.warn("src/db.json not found, skipping schools import.");
    }

    // 3. Parse UPV 3.xlsx and Upload Students
    if (fs.existsSync(EXCEL_PATH)) {
      console.log("Parsing UPV 3.xlsx...");
      const workbook = XLSX.readFile(EXCEL_PATH);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);

      console.log(`Found ${rows.length} rows in Excel.`);

      const chunks = [];
      const chunkSize = 450; // Firestore limit is 500 operations per batch
      for (let i = 0; i < rows.length; i += chunkSize) {
        chunks.push(rows.slice(i, i + chunkSize));
      }

      let totalStudents = 0;
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        let batchHasOps = false;

        for (const row of chunk) {
          // Flexible column mapping
          const idRaw = row["ID osoby"] || row["ID"] || row["id"];
          if (!idRaw) continue;

          const id = String(idRaw).trim();
          const name = row["Celé jméno"] || row["Name"] || row["name"] || row["Jméno"];

          // Try to find week column
          const weekRaw = row["Termín"] || row["Týden"] || row["Week"] || row["week"] || "";

          // Try to find school column
          const schoolIdRaw = row["Škola"] || row["School"] || row["schoolId"] || "";

          const studentData = {
            name: name,
            week: localizeString(weekRaw),
            schoolId: String(schoolIdRaw).trim()
          };

          const studentRef = doc(db, "students", id);
          batch.set(studentRef, studentData, { merge: true });
          batchHasOps = true;
          totalStudents++;
        }

        if (batchHasOps) {
          try {
            await batch.commit();
            console.log(`Committed batch of students.`);
          } catch (e) {
            console.error("Failed to upload student batch (Permission/Auth Error?):", e.message);
          }
        }
      }
      console.log(`Processed ${totalStudents} students.`);

    } else {
      console.error("UPV 3.xlsx not found! Make sure it is in the root directory.");
    }

    console.log("Migration finished.");
    process.exit(0);

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

importData();
