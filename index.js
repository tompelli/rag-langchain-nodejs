require("dotenv").config();
const readline = require("readline");
const fs = require("fs"); // Importiere das fs-Modul
const path = require("path"); // Importiere das path-Modul

const { chunkTexts } = require("./src/chunk-texts");
const { embedTexts } = require("./src/embed-texts");
const { generateAnswer } = require("./src/generate-answer");
const { extractTextsFromPDF } = require("./src/parse-pdf");
const {
  checkIndexExists,
  createIndex,
  describeIndexStats,
  retrieveRelevantChunks,
  storeEmbeddings,
  deleteIndex,
  DB_INDEX,
} = require("./src/vector-db");

const processPdf = async (pdfDirectory = "./pdfs/") => {
  console.log(`Processing PDFs from directory: ${pdfDirectory}`);
  try {
    const files = fs.readdirSync(pdfDirectory);
    const pdfFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === ".pdf"
    );

    if (pdfFiles.length === 0) {
      console.log(`No PDF files found in directory: ${pdfDirectory}`);
      return;
    }

    console.log(`Found ${pdfFiles.length} PDF file(s) to process:`, pdfFiles);

    for (const pdfFile of pdfFiles) {
      // pdfFile ist der Dateiname, z.B. "mein-dokument.pdf"
      const pdfpath = path.join(pdfDirectory, pdfFile);
      console.log(`Processing PDF: ${pdfpath}`);
      const pdfTexts = await extractTextsFromPDF(pdfpath);
      console.log("## Extracted Texts from PDF ##", pdfTexts.length);
      if (pdfTexts && pdfTexts.length > 0) {
        const pdfChunks = chunkTexts(pdfTexts);
        const embeddingsData = await embedTexts(pdfChunks); // embedTexts gibt [{embedding: [], chunk: ''}, ...] zurück

        // Erweitere jedes Embedding-Objekt um den pdfFile-Namen
        const embeddingsWithMetadata = embeddingsData.map((item) => ({
          ...item,
          pdfFile: pdfFile, // Füge den Dateinamen der PDF hinzu
        }));

        await storeEmbeddings(embeddingsWithMetadata); // Übergebe die erweiterten Daten
        console.log(
          `Finished processing and storing embeddings for: ${pdfpath}`
        );
      } else {
        console.log(
          `No text extracted or empty content for PDF: ${pdfpath}. Skipping.`
        );
      }
    }
    console.log("All PDF files processed.");
  } catch (error) {
    console.error(
      `Error processing PDFs from directory ${pdfDirectory}:`,
      error
    );
    if (error.code === "ENOENT") {
      console.error(
        `Please ensure the directory "${pdfDirectory}" exists and contains PDF files.`
      );
    }
  }
};

const init = async () => {
  const indexExists = await checkIndexExists();
  console.log("Index existiert:", indexExists);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    if (indexExists) {
      const deleteAnswer = await new Promise((resolve) => {
        rl.question(
          `Index "${DB_INDEX}" existiert. Möchten Sie ihn löschen? (ja/NEIN) [NEIN]: `, // DB_INDEX hier verwenden
          (input) => resolve(input.trim().toLowerCase())
        );
      });

      if (deleteAnswer === "ja" || deleteAnswer === "j") {
        console.log(`Index "${DB_INDEX}" wird gelöscht...`); // DB_INDEX hier verwenden
        await deleteIndex();
        console.log(
          `Index "${DB_INDEX}" erfolgreich gelöscht. Programm wird beendet.`
        ); // DB_INDEX hier verwenden
        rl.close();
        process.exit(0); // Programm beenden
      } else {
        console.log("Index wird nicht gelöscht.");
        const indexStats = await describeIndexStats();
        console.log("Vorhandene Index-Statistiken:", indexStats);
      }
    } else {
      console.log("Index nicht gefunden. Er wird erstellt...");
      await createIndex();
      console.log("Index erfolgreich erstellt.");
    }

    const processAnswer = await new Promise((resolve) => {
      rl.question(
        "Möchten Sie PDF-Daten verarbeiten und Einbettungen im Index speichern? (ja/NEIN) [NEIN]: ",
        (input) => resolve(input.trim().toLowerCase())
      );
    });

    if (processAnswer === "ja" || processAnswer === "j") {
      console.log(
        "PDF wird verarbeitet und Einbettungen werden im Index gespeichert..."
      );
      await processPdf(); // Verwendet den Standard-PDF-Pfad oder einen übergebenen
      console.log(
        "PDF-Verarbeitung und Speicherung der Einbettungen abgeschlossen."
      );
      const indexStatsAfter = await describeIndexStats();
      console.log("Index-Statistiken nach der Verarbeitung:", indexStatsAfter);
    } else {
      console.log(
        "PDF-Verarbeitung übersprungen. Der Index wird nicht mit neuen Daten gefüllt."
      );
    }
  } finally {
    if (!rl.closed) {
      rl.close();
    }
  }
};

const main = async () => {
  await init();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Hilfsfunktion, um rl.question zu "promisifyen"
  const askQuestion = async (promptText) => {
    return new Promise((resolve) => {
      rl.question(promptText, resolve);
    });
  };

  try {
    let keepAsking = true;
    while (keepAsking) {
      const query = await askQuestion(
        'Enter your query (type "quit" to exit): '
      );

      if (query.toLowerCase() === "quit" || query.toLowerCase() === "exit") {
        console.log("Exiting...");
        keepAsking = false;
      } else {
        const { chunks, pdfFiles } = await retrieveRelevantChunks(query);
        const answer = await generateAnswer(query, chunks);
        // Print the query and answer with different colors
        console.log("-----------------------------------");
        console.log(`Query: ${query}`);
        console.log(`\x1b[31mAnswer: ${answer}\x1b[0m`); // \x1b[31m sets the text color to red, \x1b[0m resets it
        console.log(`Chunks: ${chunks.length}`);
        console.log(`References: ${pdfFiles}`);
        console.log("-----------------------------------");
      }
    }
  } catch (error) {
    console.error("Ein Fehler ist in der Hauptschleife aufgetreten:", error);
  } finally {
    rl.close(); // Stellt sicher, dass readline immer geschlossen wird
  }
};

// Run the main function
main();
