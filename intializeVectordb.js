const { ChromaClient } = require('chromadb');
const fs = require('fs');
const pdf = require('pdf-parse');

// Function to read and extract text from PDF
async function extractTextFromPDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  return data.text;
}

// Function to split text into chunks
function splitTextIntoChunks(text, chunkSize) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

// Function to add documents to a ChromaDB collection
async function addDocumentsToChromaDB() {
  try {
    const client = new ChromaClient({path:'https://chroma-latest-gzr9.onrender.com'});
    const pdfText = await extractTextFromPDF('qnadoc.pdf'); // Path to your PDF

    // Split the text into chunks
    const chunks = splitTextIntoChunks(pdfText, 300); // Adjust chunk size as needed

    const collection = await client.getOrCreateCollection({
      name: "my_collection",
    });

    // Add each chunk as a separate document
    const ids = chunks.map((_, index) => `chunk-${index + 1}`);
    await collection.upsert({
      documents: chunks,
      ids: ids,
    });

    console.log("Documents added successfully!");
  } catch (error) {
    console.error("Error adding documents:", error);
  }
}

async function query() {
  try {
    const client = new ChromaClient({path:'https://chroma-latest-gzr9.onrender.com'});
    const collection = await client.getOrCreateCollection({
      name: "my_collection",
    });

    const results = await collection.query({
      queryTexts: ["return policy"], // Chroma will embed this for you
      nResults: 2, // How many results to return
    });

    console.log(results);
  } catch (error) {
    console.error("Error querying collection:", error);
  }
}

async function resetDB(){
    try {
      const client = new ChromaClient({path:'https://chroma-latest-gzr9.onrender.com'});
        await client.reset() ;
        // const coll = await client.getCollection({name: "my_collection"})
        // await client.deleteCollection({name: "my_collection"})
        
    } catch (error) {
        
    }
    

}
// Run the function to add documents
// resetDB();
addDocumentsToChromaDB();
// query();
