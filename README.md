# FindBack — Smart College Lost & Found System

A college-focused Lost & Found platform that helps students find lost items through **text search and image similarity**, powered by AI matching with RAG, embeddings, and vector search.

## Getting Started

See documentation below for project architecture and structure.

## Project Structure

```
FindBack/
├── backend/                    # Python FastAPI backend
│   ├── main.py                 # FastAPI app entry point, CORS, lifespan
│   ├── config.py               # Settings, environment variables
│   ├── database.py             # SQLAlchemy engine, session, base
│   ├── models.py               # SQLAlchemy ORM models
│   ├── schemas.py              # Pydantic request/response schemas
│   ├── auth.py                 # JWT auth, password hashing, login/register
│   ├── reports.py              # Lost & Found report endpoints
│   ├── matching.py             # Match scoring, candidate ranking
│   ├── embeddings.py           # Text + image embedding generation
│   ├── rag.py                  # LangChain RAG pipeline, match explanation
│   ├── admin.py                # Admin endpoints (receipt, claims, handover)
│   ├── notifications.py        # Notification creation & retrieval
│   ├── seed.py                 # Demo data seeder for presentations
│   └── requirements.txt        # Python dependencies
│
├── frontend/                   # React (Vite) frontend
│   ├── public/
│   │   └── findback-logo.svg
│   ├── src/
│   │   ├── main.jsx            # React entry point
│   │   ├── App.jsx             # Router, auth context, layout
│   │   ├── api.js              # Axios API client
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Auth state management
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Navigation bar
│   │   │   ├── StatusBadge.jsx  # Reusable status badges
│   │   │   ├── MatchCard.jsx    # Match result card with score
│   │   │   ├── ItemCard.jsx     # Item display card
│   │   │   ├── ImageUpload.jsx  # Drag & drop image uploader
│   │   │   └── ProtectedRoute.jsx  # Auth guard component
│   │   ├── pages/
│   │   │   ├── Login.jsx        # Login page
│   │   │   ├── Register.jsx     # Registration page
│   │   │   ├── Dashboard.jsx    # Student dashboard (I Lost / I Found)
│   │   │   ├── LostItemForm.jsx # Report lost item
│   │   │   ├── FoundItemForm.jsx # Report found item
│   │   │   ├── MyReports.jsx    # View my lost & found reports
│   │   │   ├── Matches.jsx      # View potential matches
│   │   │   ├── Search.jsx       # Text & image search
│   │   │   ├── Profile.jsx      # Profile & change password
│   │   │   ├── Notifications.jsx # Student notifications
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.jsx  # Admin overview
│   │   │   │   ├── PendingReceipt.jsx  # Confirm received items
│   │   │   │   ├── ClaimRequests.jsx   # Manage claim requests
│   │   │   │   ├── ActiveItems.jsx     # Browse active items
│   │   │   │   └── AdminNotifications.jsx # Admin notifications
│   │   │   └── NotFound.jsx     # 404 page
│   │   └── styles/
│   │       └── index.css        # Global styles, design system
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── uploads/                    # Uploaded images (gitignored)
│   └── .gitkeep
├── docker-compose.yml          # PostgreSQL + pgvector setup
├── .env.example                # Example environment variables
├── .gitignore
└── README.md
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + JavaScript |
| Backend | Python + FastAPI + Pydantic |
| Database | PostgreSQL + pgvector |
| Auth | JWT + bcrypt |
| Text Embeddings | Sentence-Transformers |
| Image Embeddings | OpenCLIP |
| RAG | LangChain |
| LLM | Google Gemini / Groq |

## License

This project is for educational/prototype purposes.
