from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from config.database import engine, Base

from routers import usuarios, fraude, desembolsos, inversionistas

app = FastAPI(title="MS3 - Fraude, Desembolsos y Operaciones")

app.include_router(usuarios.router)
app.include_router(fraude.router)
app.include_router(desembolsos.router)
app.include_router(inversionistas.router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": str(exc)})


#@app.on_event("startup")
#def on_startup():
    # create tables synchronously using sync_engine for metadata
    #Base.metadata.create_all(bind=engine.sync_engine)
#    async with engine.begin() as conn:
#        await conn.run_sync(Base.metadata.create_all)  # ✅ correcto
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)  # ✅ correcto

# ARRANQUE:
# 1. Crea un archivo .env con: DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/ms_operaciones
# 2. Instala dependencias: pip install -r requirements.txt
# 3. Levanta el servicio: uvicorn main:app --host 0.0.0.0 --port 8003 --reload
