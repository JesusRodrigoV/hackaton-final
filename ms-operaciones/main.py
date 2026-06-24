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


@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)