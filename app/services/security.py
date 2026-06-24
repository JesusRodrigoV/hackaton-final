import json
import base64
from typing import Any, Dict
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes

# Generación automática de llaves RSA de 2048 bits para la sesión del servicio
_PRIVATE_KEY = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048
)
PUBLIC_KEY = _PRIVATE_KEY.public_key()

def generar_firma_evento(credito_id: Any, evento_tipo: str, payload: Dict[str, Any]) -> str:
    """
    Normaliza los datos, genera el hash SHA-256 y firma con la llave privada RSA.
    """
    estructura_bloque = {
        "credito_id": str(credito_id),
        "evento_tipo": evento_tipo,
        "payload": payload
    }
    
    # Serialización canónica para asegurar que el hash sea siempre el mismo
    json_canonico = json.dumps(estructura_bloque, sort_keys=True, default=str)
    datos_bytes = json_canonico.encode("utf-8")
    
    # Firma criptográfica RSA usando SHA-256
    firma = _PRIVATE_KEY.sign(
        datos_bytes,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )
    
    return base64.b64encode(firma).decode("utf-8")

def verificar_firma_evento(credito_id: Any, evento_tipo: str, payload: Dict[str, Any], firma_b64: str) -> bool:
    """
    Verifica con la llave pública si el evento fue alterado.
    """
    estructura_bloque = {
        "credito_id": str(credito_id),
        "evento_tipo": evento_tipo,
        "payload": payload
    }
    
    json_canonico = json.dumps(estructura_bloque, sort_keys=True, default=str)
    datos_bytes = json_canonico.encode("utf-8")
    
    try:
        firma_bytes = base64.b64decode(firma_b64)
        PUBLIC_KEY.verify(
            firma_bytes,
            datos_bytes,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return True
    except Exception:
        return False