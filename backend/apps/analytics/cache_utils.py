"""Utilidades de cache compartidas entre apps.

/segment/stats/ (apps/analytics/views.py) devuelve la distribución de
segmentos calculada con las features de build_features_for_contacts(),
que leen contactos, empresas, tags, intereses (productos), tareas,
interacciones y oportunidades. Cualquier mutación de esos recursos
puede mover el conteo de un segmento, así que los viewsets que los
editan descartan la clave cacheada.

Este módulo no importa apps/analytics/ml/ a propósito: cache_utils se
importa desde los viewsets de contacts/interactions/tasks/tags/
opportunities y no debe arrastrar sklearn/pandas.
"""
import logging

from django.core.cache import cache

logger = logging.getLogger(__name__)

# Única fuente de verdad de la clave. SegmentStatsView.CACHE_KEY la usa.
SEGMENT_STATS_CACHE_KEY = "segment_stats_v3"


def invalidate_segment_stats_cache() -> None:
    """Descartar el cache de /segment/stats/ sin romper la request.

    Redis caído, inaccesible o con un backend de cache mal configurado
    NO debe convertir un POST/PATCH/DELETE que ya se guardó en la DB en
    un 500: se loguea un warning y se sigue. El valor cacheado expira
    solo por TTL, así que el peor caso es servir el conteo viejo hasta
    que expire (a lo más, el TTL de SegmentStatsView).
    """
    try:
        cache.delete(SEGMENT_STATS_CACHE_KEY)
    except Exception as exc:
        logger.warning(
            "No se pudo invalidar %s (el cache expira por TTL): %s",
            SEGMENT_STATS_CACHE_KEY,
            exc,
        )
