# AI Assignment Generator

An AI-powered web application that generates structured academic assignments from uploaded PDFs or images.  
The system ensures reliable and consistent output using prompt engineering, validation, and fallback mechanisms.

## ✨ Features

- 🔐 Authentication (Login-based access)
- 📊 Assignment Dashboard
  - View assignments
  - Delete assignments
- ➕ Create Assignment
  - Upload PDF/Image as source
  - Configure question types, count, and marks
  - Add instructions for AI
- 🧠 AI-Powered Generation
  - Context-based question generation using Gemini AI
  - Structured sections (MCQ, Short, Long, etc.)
- 🔄 Regenerate Assignment
  - Generate a new version without re-entering input
- 🛡️ Fallback System
  - Ensures output even if AI fails or is incomplete
- 📄 Download as PDF

## 🧠 How It Works
Upload File → Extract Text → Build Prompt → AI Generation → Validate → Fallback → Final Output

1. Extracts text from PDF (pdf-parse) or image (OCR)
2. Normalizes and cleans extracted content
3. Builds a structured prompt dynamically
4. Sends request to Gemini AI
5. Parses and validates response
6. Applies fallback if needed
7. Returns structured assignment

##  Tech Stack

### Frontend
- Next.js
- React
- Tailwind CSS

### Backend
- Node.js
- Express.js

### AI & Processing
- Gemini AI (Google GenAI)
- pdf-parse (PDF extraction)
- Tesseract.js (OCR)

### Queue & Caching
- BullMQ
- Redis

##  Project Structure
/frontend /backend ├── controllers ├── services ├── utils ├── queue ├── config


## Key Design Decisions

- **Structured Prompt Engineering**  
  Ensures AI generates consistent and relevant questions

- **Validation Layer**  
  Filters invalid or unrelated AI outputs

- **Fallback Mechanism**  
  Guarantees output even if AI fails

- **Queue-Based Processing (BullMQ)**  
  Handles AI generation asynchronously to avoid API blocking

## 🎯 Future Improvements

- Better semantic understanding for question generation
- Improved MCQ distractor quality
- Cloud storage for uploaded files (AWS S3)
- Role-based authentication

---

## 🙌 Conclusion

This project focuses on building a reliable AI system rather than just using AI, by combining prompt engineering, validation, and fallback handling to ensure production-ready output.
