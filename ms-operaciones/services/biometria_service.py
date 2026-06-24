import hashlib


def generar_vector(ci: str, nombre: str) -> str:
    seed = f"{ci}:{nombre}"
    h = hashlib.sha256()
    h.update(seed.encode("utf-8"))
    return h.hexdigest()


def verificar_vector(vector: str) -> dict:
    if vector is None or str(vector).strip() == "":
        return {"estado_biometrico": "NO_VERIFICADO", "riesgo_fraude": "ALTO"}
    return {"estado_biometrico": "VERIFICADO", "riesgo_fraude": "BAJO"}
