import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.models.user import User
from app.core.security import get_password_hash
from app.routers import auth, users, tasks

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create database tables automatically
    Base.metadata.create_all(bind=engine)
    
    # 2. Seed default users if they do not exist
    db = SessionLocal()
    try:
        # Seed Admin
        admin_user = db.query(User).filter(User.email == "admin@taskflow.com").first()
        if not admin_user:
            admin_user = User(
                email="admin@taskflow.com",
                hashed_password=get_password_hash("admin123"),
                full_name="System Admin",
                role="admin"
            )
            db.add(admin_user)
            db.commit()
            
        # Seed Standard User
        normal_user = db.query(User).filter(User.email == "user@taskflow.com").first()
        if not normal_user:
            normal_user = User(
                email="user@taskflow.com",
                hashed_password=get_password_hash("user123"),
                full_name="John Doe",
                role="user"
            )
            db.add(normal_user)
            db.commit()
    finally:
        db.close()
        
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["Users"])
app.include_router(tasks.router, prefix=f"{settings.API_V1_STR}/tasks", tags=["Tasks"])

# Mount Frontend static files
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend"))
os.makedirs(os.path.join(frontend_dir, "css"), exist_ok=True)
os.makedirs(os.path.join(frontend_dir, "js"), exist_ok=True)

# Mount styles and scripts
app.mount("/css", StaticFiles(directory=os.path.join(frontend_dir, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(frontend_dir, "js")), name="js")

# Route root to index.html
@app.get("/")
def read_index():
    index_path = os.path.join(frontend_dir, "index.html")
    if not os.path.exists(index_path):
        # Create a basic placeholder file so it doesn't 404 immediately
        with open(index_path, "w") as f:
            f.write("<h1>Loading Task Flow...</h1>")
    return FileResponse(index_path)
