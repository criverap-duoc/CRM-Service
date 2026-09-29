"""
Construcción unificada de features para los modelos de ML.
Todos los modelos (lead scoring, churn, segmentación) usan el mismo set.
"""
from datetime import timedelta
from django.utils import timezone


# Columnas categóricas que necesitan encoding
CATEGORICAL_FEATURES = [
    "source",
    "company_industry",
    "company_size",
]

# Orden exacto de las features numéricas en el vector final.
# El entrenamiento y la inferencia DEBEN usar este mismo orden.
NUMERIC_FEATURES = [
    "time_to_first_interaction",
    "interactions_7d",
    "interaction_frequency",
    "days_since_last_interaction",
    "response_rate",
    "total_interactions",
    "sentiment_avg",
    "company_revenue",
    "tag_count",
    "has_vip_tag",
    "has_hot_tag",
    "has_cold_tag",
    "has_risk_tag",
    "total_tasks",
    "completed_tasks",
    "overdue_tasks",
    "task_completion_rate",
]

# Orden final: categóricas + numéricas
ALL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES


def build_features_for_contact(contact):
    """
    Construye el diccionario de features para un contacto.

    Devuelve un dict con TODAS las columnas de ALL_FEATURES.
    Los valores categóricos se devuelven como strings; el encoder los convierte.
    Los valores numéricos se devuelven como floats/int.
    """
    now = timezone.now()

    # === Interacciones ===
    interactions = contact.interactions.all().order_by("occurred_at")
    total_interactions = interactions.count()

    first = interactions.first()
    if first:
        delta = (first.occurred_at - contact.created_at).total_seconds() / 86400
        time_to_first = max(0, min(delta, 30))
    else:
        time_to_first = 30

    week_ago = now - timedelta(days=7)
    interactions_7d = interactions.filter(occurred_at__gte=week_ago).count()

    last = interactions.last()
    if last:
        days_since_last = (now - last.occurred_at).days
    else:
        days_since_last = 999

    days_since_created = max(1, (now - contact.created_at).days)
    interaction_frequency = total_interactions / days_since_created

    outbound = interactions.filter(direction="outbound").count()
    inbound = interactions.filter(direction="inbound").count()
    if outbound > 0:
        response_rate = min(1.0, inbound / outbound)
    else:
        response_rate = 0.5 if inbound > 0 else 0.1

    # === Sentimiento ===
    sentiments = contact.interactions.filter(
        sentiment_analysis__isnull=False
    ).values_list("sentiment_analysis__label", flat=True)

    if sentiments:
        values = [
            5.0 if label == "positive" else 1.0 if label == "negative" else 3.0
            for label in sentiments
        ]
        sentiment_avg = sum(values) / len(values)
    else:
        sentiment_avg = 3.0

    # === Company ===
    if contact.company:
        company_industry = contact.company.industry or "other"
        company_size = contact.company.size or "small"
        company_revenue = contact.company.annual_revenue or 0
    else:
        company_industry = "other"
        company_size = "small"
        company_revenue = 0

    # === Tags ===
    tag_names = [t.name.lower() for t in contact.tags.all()]
    tag_count = len(tag_names)
    has_vip_tag = 1 if "vip" in tag_names else 0
    has_hot_tag = 1 if "caliente" in tag_names else 0
    has_cold_tag = 1 if "frío" in tag_names or "frio" in tag_names else 0
    has_risk_tag = 1 if "en riesgo" in tag_names else 0

    # === Tasks ===
    tasks = contact.tasks.all()
    total_tasks = tasks.count()
    completed_tasks = tasks.filter(status="completed").count()
    overdue_tasks = tasks.filter(
        due_date__lt=now
    ).exclude(status__in=["completed", "cancelled"]).count()

    if total_tasks > 0:
        task_completion_rate = completed_tasks / total_tasks
    else:
        task_completion_rate = 0.0

    return {
        # Categóricas
        "source": contact.source,
        "company_industry": company_industry,
        "company_size": company_size,
        # Numéricas
        "time_to_first_interaction": round(time_to_first, 2),
        "interactions_7d": interactions_7d,
        "interaction_frequency": round(interaction_frequency, 4),
        "days_since_last_interaction": days_since_last,
        "response_rate": round(response_rate, 3),
        "total_interactions": total_interactions,
        "sentiment_avg": round(sentiment_avg, 2),
        "company_revenue": company_revenue,
        "tag_count": tag_count,
        "has_vip_tag": has_vip_tag,
        "has_hot_tag": has_hot_tag,
        "has_cold_tag": has_cold_tag,
        "has_risk_tag": has_risk_tag,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "overdue_tasks": overdue_tasks,
        "task_completion_rate": round(task_completion_rate, 3),
    }


def features_to_vector(features_dict, encoders, feature_columns):
    """
    Convierte un dict de features al vector ordenado que el modelo espera.

    - Aplica encoders a las categóricas.
    - Rellena faltantes con 0.
    - Respeta el orden de feature_columns.
    """
    vector = []
    for col in feature_columns:
        value = features_dict.get(col, 0)
        # Aplicar encoder si es categórica
        if col in encoders and isinstance(value, str):
            encoder = encoders[col]
            try:
                value = encoder.transform([value])[0]
            except (ValueError, KeyError):
                # Valor no visto en entrenamiento → usar 0
                value = 0
        vector.append(value)
    return vector