"""
Validadores personalizados para el app de contactos.
"""
import re
from django.core.validators import EmailValidator


class UnicodeEmailValidator(EmailValidator):
    """
    Validador de email que admite caracteres UTF-8 (acentos, eñe, diéresis, etc.)
    en la parte local del email, cumpliendo con la RFC 6531 (SMTPUTF).

    Django's ``EmailValidator`` por defecto rechaza caracteres no-ASCII en la
    parte local. Esto es problemático porque los contactos creados vía
    ``populate_data.py`` o fixtures pueden tener emails con acentos
    (ej. ``ana.martínez9@ejemplo.com``) que se guardan directamente en la BD
    sin pasar por la validación del serializer, y luego fallan al hacer
    PATCH/PUT desde el frontend.
    """

    # Extensión del user_regex original de Django para permitir caracteres
    # Latin-1 Supplement (U+00C0–U+00FF): áéíóúüñÁÉÍÓÚÜÑ, ç, etc.
    # Esto cubre todos los acentos que aparecen en nombres propios españoles.
    user_regex = re.compile(
        # dot-atom con soporte UTF-8 (Latin-1 Supplement: À-ÿ)
        r"(^[-!#$%&'*+/=?^_`{}|~0-9A-Z\u00C0-\u00FF]+"
        r"(\.[-!#$%&'*+/=?^_`{}|~0-9A-Z\u00C0-\u00FF]+)*\Z"
        # quoted-string (igual al original de Django)
        r'|^\"([\001-\010\013\014\016-\037!#-\[\]-\177]|\\[\001-\011\013\014\016-\177])*\"\Z)',
        re.IGNORECASE,
    )
