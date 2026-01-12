# 1. Project Overview Document

## 📄 PROJECT CHARTER

| Field            | Details                                   |
| ---------------- | ----------------------------------------- |
| **Project Name** | StudyLens — AI Visual Learning Companion  |
| **Version**      | 1.0.0                                     |
| **Created Date** | January 12, 2026                          |
| **Last Updated** | January 12, 2026                          |
| **Author**       | [Your Name]                               |
| **Hackathon**    | Google DeepMind Gemini 3 Global Hackathon |
| **Deadline**     | February 10, 2026, 6:45 AM GMT+5:45       |

---

### 1.1 Executive Summary

**StudyLens** is an AI-powered visual learning companion that enables students worldwide to instantly understand any educational content by simply pointing their camera at it. Leveraging Google's Gemini 3 multimodal capabilities, the application reads, analyzes, and explains textbook pages, handwritten notes, diagrams, and problem sets in the student's preferred language.

### 1.2 Problem Statement

| Problem                                               | Impact                                          |
| ----------------------------------------------------- | ----------------------------------------------- |
| Students get stuck on homework with no immediate help | Frustration, incomplete learning                |
| Private tutors are expensive ($20-80/hour globally)   | Limited access for middle/lower income families |
| Parents often can't help with modern curriculum       | Students remain stuck                           |
| YouTube/Google searches are time-consuming            | Irrelevant results, wrong grade level           |
| Language barriers in education                        | Non-English speakers disadvantaged              |
| Rural areas lack quality tutors                       | Educational inequality                          |

### 1.3 Solution Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      STUDYLENS FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   📸 CAPTURE          🤖 PROCESS           📖 LEARN         │
│   ─────────────────────────────────────────────────────     │
│                                                             │
│   Student points      Gemini 3 Vision      Instant          │
│   camera at any   →   reads & analyzes  →  step-by-step     │
│   educational         the content          explanation       │
│   content                                  in any language   │
│                                                             │
│   • Textbooks         • Subject ID         • Simple answer  │
│   • Handwritten       • Topic detection    • Detailed steps │
│   • Diagrams          • Problem solving    • Concept theory │
│   • Whiteboards       • Multi-language     • Practice Qs    │
│   • Exam papers       • Context aware      • Follow-ups     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 Project Setup & Environment Configuration

```
# Create new Next.js project with latest settings
npx create-next-app@latest studylens --typescript --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*"

# Navigate to project
cd studylens
```

### 1.5 Install Core Dependencies

```
# UI Components & Styling
npm install class-variance-authority clsx tailwind-merge lucide-react
npm install @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast

# State Management
npm install zustand

# Database & ORM
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# AI Integration
npm install @google/genai

# File Upload & Image Processing
npm install browser-image-compression

# Utilities
npm install nanoid zod
```
