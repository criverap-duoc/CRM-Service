## backend\scripts\export_real_data.py
"""
Exporta datos reales de la DB a un CSV con features enriquecidas
y dos targets: converted y churned.
"""
import os
import sys
import django
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "crm_service.settings.dev")
django.setup()

from apps.contacts.models import Contact
from apps.analytics.ml.features import build_features_for_contact, ALL_FEATURES


def export_data():
    """Exporta contactos con features enriquecidas y targets."""
    data = []
    contacts = (
        Contact.objects
        .select_related("company", "assigned_to")
        .prefetch_related("tags", "tasks", "interactions")
    )

    for contact in contacts:
        features = build_features_for_contact(contact)
        features["contact_id"] = contact.id
        features["status"] = contact.status
        features["converted"] = 1 if contact.status == "customer" else 0
        features["churned"] = 1 if contact.status == "churned" else 0
        data.append(features)

    df = pd.DataFrame(data)

    # Ordenar columnas: features + metadata + targets
    ordered_cols = (
        ["contact_id"]
        + ALL_FEATURES
        + ["status", "converted", "churned"]
    )
    df = df[ordered_cols]

    output_path = "data/processed/real_leads.csv"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)

    print(f"✅ Exportados {len(df)} registros a {output_path}")
    print(f"📊 Distribución converted:")
    print(df["converted"].value_counts().to_string())
    print(f"\n📊 Distribución churned:")
    print(df["churned"].value_counts().to_string())
    print(f"\n📊 Distribución status:")
    print(df["status"].value_counts().to_string())
    print(f"\n📊 Features: {len(ALL_FEATURES)} + 2 targets")

    return df


if __name__ == "__main__":
    export_data()