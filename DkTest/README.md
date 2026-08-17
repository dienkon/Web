# DkTEST - Exam Management System

DkTEST is a modern, clean, and minimalist examination system built with React, Vite, Tailwind CSS, and Firebase.

## JSON Format

DkTEST features a robust **JSON Exam Import/Export Engine** designed to handle full exam data, question banks, and individual sections safely and efficiently. The JSON format is considered a primary exchange format for DkTEST.

### Schema Version

The current schema version is **V3**. The system uses a strict versioning mechanism to ensure backward and forward compatibility.

```json
{
  "version": 3,
  "exportType": "exam",
  ...
}
```

### Import JSON

You can import JSON files in the following ways:
- **Admin Dashboard**: Import an entire exam (creates a new exam or updates an existing one).
- **Exam Editor**: Import a Question Bank directly into a specific section.

Features of the Import Engine:
- **Validation**: Strict validation of schemas using `zod`.
- **Normalization**: Automatic conversion of legacy formats (like `mcq`, `short`) to V3 standard (`single_choice`, `short_answer`).
- **Preview**: Displays a summary of the exam, question count, and any validation warnings before committing to the database.
- **Batched Uploads**: Questions are mapped to their respective sections and uploaded efficiently.
- **Safety**: Re-generates unique IDs for questions if importing as a new copy to avoid Firestore conflicts.

### Export JSON

Exporting is highly granular. You can export:
1. **Full Exam**: In the Exam Editor, click "Export Full JSON" to download the exam metadata, sections, and all questions.
2. **Specific Section**: In the section menu, click the download icon to export only that section and its questions.
3. **Question Bank**: Select specific questions and export them.

### Migration & Legacy Compatibility

The engine guarantees backward compatibility with older exam structures (V1 and V2).
- If you import a V2 file without sections, the system will automatically create a default "Phần I" section and place all questions there.
- Legacy `originalOptions` and `optionOrder` fields are correctly interpreted to retain the originally intended correct answers without randomizing them incorrectly.

### Example JSON

For a detailed example of the V3 Schema, please see:
- Schema Definition: `docs/schemas/exam-v3.schema.json`
- Example Data: `docs/exam-json-example.json`

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up Firebase:
   - Create a Firebase project.
   - Enable Firestore.
   - Copy `firebase-applet-config.json` configuration or use `.env` vars.
3. Start the dev server:
   ```bash
   npm run dev
   ```
