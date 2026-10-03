## backend\scripts\generate_synthetic_v3.py
"""
Genera 2000 leads sintéticos con features enriquecidas.
Las distribuciones por status se solapan intencionalmente para evitar
que el modelo aprenda patrones triviales. ROC-AUC esperado: 0.80-0.88.
"""
import os
import pandas as pd
import numpy as np


def generate_synthetic_leads(n=2000, seed=42):
    """Genera n leads sintéticos con el esquema V3."""
    np.random.seed(seed)

    sources = ["manual", "meta_ads", "organic", "referral", "other"]
    industries = ["technology", "retail", "finance", "health", "education", "manufacturing", "services", "other"]
    sizes = ["startup", "small", "medium", "large", "enterprise"]

    data = []

    for i in range(n):
        # === Status (mismas probabilidades) ===
        status = np.random.choice(
            ["lead", "prospect", "customer", "churned"],
            p=[0.40, 0.30, 0.20, 0.10]
        )

        # === Source (solapado, menos determinista) ===
        source = np.random.choice(
            sources,
            p=_source_probs_for_status(status)
        )

        # === Company ===
        company_industry = np.random.choice(industries)
        company_size = np.random.choice(sizes, p=[0.15, 0.30, 0.30, 0.20, 0.05])
        company_revenue = _revenue_for_size(company_size)

        # === Features de interacción (SOLAPADAS entre status) ===
        # Todas las distribuciones comparten rango. Las medias difieren,
        # pero hay overlap suficiente para que no sean separables trivialmente.
        base = _base_distributions_for_status(status)

        time_to_first = max(0, min(np.random.normal(base["ttf_mean"], base["ttf_std"]), 30))
        interactions_7d = max(0, int(np.random.normal(base["int7d_mean"], base["int7d_std"])))
        total_interactions = max(0, int(np.random.normal(base["total_mean"], base["total_std"])))
        days_since_last = max(0, int(np.random.normal(base["days_mean"], base["days_std"])))
        response_rate = float(np.clip(np.random.normal(base["resp_mean"], base["resp_std"]), 0, 1))
        sentiment_avg = float(np.clip(np.random.normal(base["sent_mean"], base["sent_std"]), 1, 5))

        interaction_frequency = total_interactions / max(1, total_interactions + days_since_last)

        # === Tags (con algo de ruido) ===
        tag_count = np.random.binomial(3, 0.4)
        has_vip_tag = int(np.random.random() < base["vip_prob"])
        has_hot_tag = int(np.random.random() < base["hot_prob"])
        has_cold_tag = int(np.random.random() < base["cold_prob"])
        has_risk_tag = int(np.random.random() < base["risk_prob"])

        # === Tasks (con ruido) ===
        total_tasks = max(0, int(np.random.normal(base["tasks_mean"], 1.0)))
        if total_tasks > 0:
            completion_prob = base["task_completion_prob"]
            completed_tasks = np.random.binomial(total_tasks, completion_prob)
        else:
            completed_tasks = 0
        overdue_tasks = int(np.random.random() < base["overdue_prob"]) * np.random.randint(0, 3)
        task_completion_rate = completed_tasks / max(1, total_tasks)

        # === Product Interests (correlacionado con status) ===
        if status == "customer":
            interest_count = np.random.poisson(2.5)
            avg_interest_price = float(np.random.normal(2_500_000, 800_000))
            interest_category_diversity = min(interest_count, np.random.randint(1, 4))
            has_high_value_interest = int(np.random.random() < 0.6)
        elif status == "prospect":
            interest_count = np.random.poisson(1.8)
            avg_interest_price = float(np.random.normal(2_000_000, 700_000))
            interest_category_diversity = min(interest_count, np.random.randint(1, 3))
            has_high_value_interest = int(np.random.random() < 0.4)
        elif status == "churned":
            interest_count = np.random.poisson(0.8)
            avg_interest_price = float(np.random.normal(1_200_000, 500_000))
            interest_category_diversity = min(interest_count, np.random.randint(0, 2))
            has_high_value_interest = int(np.random.random() < 0.15)
        else:  # lead
            interest_count = np.random.poisson(1.0)
            avg_interest_price = float(np.random.normal(1_500_000, 600_000))
            interest_category_diversity = min(interest_count, np.random.randint(0, 2))
            has_high_value_interest = int(np.random.random() < 0.2)

        if interest_count == 0:
            avg_interest_price = 0.0
            interest_category_diversity = 0
            has_high_value_interest = 0

        avg_interest_price = max(0, avg_interest_price)

        # === Opportunities (correlación leve con status, SIN leakage determinista) ===
        # has_won_deal / has_lost_deal dependen SUAVEMENTE del status vía probabilidades:
        # ningún caso fuerza won=1 para customer (eso era el leakage original).
        won_prob_by_status = {
            "customer": 0.45,
            "prospect": 0.20,
            "churned": 0.10,
            "lead": 0.08,
        }
        lost_prob_by_status = {
            "customer": 0.15,
            "prospect": 0.10,
            "churned": 0.55,
            "lead": 0.05,
        }
        has_won_deal = int(np.random.random() < won_prob_by_status[status])
        has_lost_deal = int(np.random.random() < lost_prob_by_status[status])

        if status == "customer":
            opportunity_count_total = np.random.poisson(2.0)
            opportunity_count_open = np.random.poisson(1.2)
        elif status == "prospect":
            opportunity_count_total = np.random.poisson(1.5)
            opportunity_count_open = np.random.poisson(1.3)
        elif status == "churned":
            opportunity_count_total = np.random.poisson(1.2)
            opportunity_count_open = np.random.poisson(0.3)
        else:  # lead
            opportunity_count_total = np.random.poisson(0.6)
            opportunity_count_open = np.random.poisson(0.5)

        # El pipeline abierto nunca puede superar el total de oportunidades.
        opportunity_count_open = min(opportunity_count_open, opportunity_count_total)

        if opportunity_count_open > 0:
            base_amount = np.random.normal(2_500_000, 1_500_000)
            pipeline_value_total = max(0, float(base_amount * opportunity_count_open))
            avg_prob = np.random.uniform(20, 70)
            pipeline_value_weighted = pipeline_value_total * (avg_prob / 100)
            avg_deal_probability = avg_prob
        else:
            pipeline_value_total = 0.0
            pipeline_value_weighted = 0.0
            avg_deal_probability = 0.0

        # days_since_last_won solo tiene valor si has_won_deal=1, independiente del status
        if has_won_deal:
            days_since_last_won = np.random.randint(1, 180)
        else:
            days_since_last_won = 999

        data.append({
            "source": source,
            "company_industry": company_industry,
            "company_size": company_size,
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
            "interest_count": int(interest_count),
            "avg_interest_price": round(avg_interest_price, 0),
            "interest_category_diversity": int(interest_category_diversity),
            "has_high_value_interest": int(has_high_value_interest),
            "opportunity_count_total": int(opportunity_count_total),
            "opportunity_count_open": int(opportunity_count_open),
            "pipeline_value_total": round(pipeline_value_total, 0),
            "pipeline_value_weighted": round(pipeline_value_weighted, 2),
            "avg_deal_probability": round(avg_deal_probability, 2),
            "has_won_deal": int(has_won_deal),
            "has_lost_deal": int(has_lost_deal),
            "days_since_last_won": int(days_since_last_won),
            "status": status,
            "converted": 1 if status == "customer" else 0,
            "churned": 1 if status == "churned" else 0,
        })

    df = pd.DataFrame(data)

    output_path = "data/processed/synthetic_leads_v3.csv"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)

    print(f"✅ Generados {n} leads sintéticos en {output_path}")
    print(f"\n📊 Distribución converted:")
    print(df["converted"].value_counts().to_string())
    print(f"\n📊 Distribución churned:")
    print(df["churned"].value_counts().to_string())
    print(f"\n📊 Distribución status:")
    print(df["status"].value_counts().to_string())

    print(f"\n📊 Correlación de features con converted:")
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    corr = df[numeric_cols].corr()["converted"].sort_values(ascending=False)
    for feat, val in corr.items():
        if feat not in ("converted", "churned"):
            print(f"   {feat}: {val:+.3f}")

    print(f"\n📊 Medias por status (para verificar overlap):")
    for feat in ["interactions_7d", "total_interactions", "sentiment_avg", "days_since_last_interaction"]:
        means = df.groupby("status")[feat].mean().round(2).to_dict()
        print(f"   {feat}: {means}")

    return df


def _base_distributions_for_status(status):
    """
    Distribuciones por status. Las medias difieren, pero los std son
    suficientemente grandes para que haya overlap entre grupos adyacentes.
    """
    configs = {
        "customer": {
            "ttf_mean": 2.5, "ttf_std": 2.0,
            "int7d_mean": 2.0, "int7d_std": 1.5,
            "total_mean": 10.0, "total_std": 4.0,
            "days_mean": 5.0, "days_std": 5.0,
            "resp_mean": 0.65, "resp_std": 0.15,
            "sent_mean": 4.0, "sent_std": 0.7,
            "vip_prob": 0.25, "hot_prob": 0.20, "cold_prob": 0.05, "risk_prob": 0.05,
            "tasks_mean": 1.5, "task_completion_prob": 0.65, "overdue_prob": 0.05,
        },
        "prospect": {
            "ttf_mean": 3.0, "ttf_std": 2.5,
            "int7d_mean": 1.8, "int7d_std": 1.4,
            "total_mean": 7.0, "total_std": 3.5,
            "days_mean": 8.0, "days_std": 7.0,
            "resp_mean": 0.55, "resp_std": 0.18,
            "sent_mean": 3.8, "sent_std": 0.8,
            "vip_prob": 0.20, "hot_prob": 0.30, "cold_prob": 0.08, "risk_prob": 0.10,
            "tasks_mean": 1.8, "task_completion_prob": 0.50, "overdue_prob": 0.10,
        },
        "lead": {
            "ttf_mean": 5.0, "ttf_std": 3.5,
            "int7d_mean": 1.0, "int7d_std": 1.2,
            "total_mean": 3.5, "total_std": 2.5,
            "days_mean": 20.0, "days_std": 12.0,
            "resp_mean": 0.40, "resp_std": 0.20,
            "sent_mean": 3.2, "sent_std": 0.9,
            "vip_prob": 0.08, "hot_prob": 0.10, "cold_prob": 0.25, "risk_prob": 0.15,
            "tasks_mean": 1.0, "task_completion_prob": 0.35, "overdue_prob": 0.15,
        },
        "churned": {
            "ttf_mean": 7.0, "ttf_std": 4.0,
            "int7d_mean": 0.5, "int7d_std": 0.9,
            "total_mean": 2.5, "total_std": 2.0,
            "days_mean": 55.0, "days_std": 25.0,
            "resp_mean": 0.25, "resp_std": 0.18,
            "sent_mean": 2.5, "sent_std": 1.0,
            "vip_prob": 0.03, "hot_prob": 0.05, "cold_prob": 0.35, "risk_prob": 0.40,
            "tasks_mean": 0.8, "task_completion_prob": 0.20, "overdue_prob": 0.35,
        },
    }
    return configs[status]


def _source_probs_for_status(status):
    """Probabilidades de source según status (menos extremas que antes)."""
    if status == "customer":
        return [0.15, 0.20, 0.20, 0.35, 0.10]
    if status == "churned":
        return [0.20, 0.30, 0.22, 0.15, 0.13]
    if status == "prospect":
        return [0.20, 0.28, 0.22, 0.20, 0.10]
    return [0.22, 0.28, 0.24, 0.16, 0.10]


def _revenue_for_size(size):
    ranges = {
        "startup": (10_000_000, 100_000_000),
        "small": (100_000_000, 500_000_000),
        "medium": (500_000_000, 2_000_000_000),
        "large": (2_000_000_000, 10_000_000_000),
        "enterprise": (10_000_000_000, 100_000_000_000),
    }
    low, high = ranges[size]
    return int(np.random.uniform(low, high))


if __name__ == "__main__":
    generate_synthetic_leads(2000)