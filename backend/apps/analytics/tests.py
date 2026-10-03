## backend\apps\analytics\tests.py
"""
Tests para los endpoints de analytics y los modelos ML V3.
"""
import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient

from apps.contacts.models import Contact
from apps.companies.models import Company
from apps.tags.models import Tag
from apps.tasks.models import Task
from apps.interactions.models import Interaction
from apps.analytics.models import SentimentAnalysis
from apps.products.models import Product
from apps.opportunities.models import Opportunity
from apps.analytics.ml.features import build_features_for_contact


# ============================================================
# Fixtures
# ============================================================

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    """Usuario autenticado básico."""
    return User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpass123",
    )


@pytest.fixture
def auth_client(api_client, user):
    """Cliente autenticado con JWT."""
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


@pytest.fixture
def company(db):
    return Company.objects.create(
        name="Acme SpA",
        industry="technology",
        size="medium",
        country="Chile",
        annual_revenue=500_000_000,
    )


@pytest.fixture
def tag_vip(db):
    return Tag.objects.create(name="VIP", color="#ef4444")


@pytest.fixture
def contact_with_data(db, user, company, tag_vip):
    """Contacto con interacciones, tags y tareas para tener features no triviales."""
    contact = Contact.objects.create(
        first_name="Ana",
        last_name="Pérez",
        email="ana@example.com",
        phone="+56912345678",
        company=company,
        status="prospect",
        source="referral",
        assigned_to=user,
    )
    contact.tags.add(tag_vip)

    # 3 interacciones recientes con sentimiento positivo
    now = timezone.now()
    for i in range(3):
        interaction = Interaction.objects.create(
            contact=contact,
            agent=user,
            channel="email",
            direction="inbound" if i % 2 == 0 else "outbound",
            subject=f"Interacción {i+1}",
            body="Contenido de prueba positivo",
            occurred_at=now - timedelta(days=i),
        )
        SentimentAnalysis.objects.create(
            interaction=interaction,
            label="positive",
            score=0.9,
        )

    # 2 tareas, una completada
    Task.objects.create(
        title="Llamar seguimiento",
        contact=contact,
        assigned_to=user,
        status="completed",
        priority="high",
        due_date=now - timedelta(days=1),
    )
    Task.objects.create(
        title="Enviar propuesta",
        contact=contact,
        assigned_to=user,
        status="pending",
        priority="medium",
        due_date=now + timedelta(days=2),
    )

    return contact


# ============================================================
# Tests: Lead Score
# ============================================================

@pytest.mark.django_db
class TestLeadScoreEndpoint:

    def test_requires_authentication(self, api_client, contact_with_data):
        """Sin token, el endpoint devuelve 401."""
        response = api_client.get(f"/api/v3/lead-score/{contact_with_data.id}/")
        assert response.status_code == 401

    def test_returns_valid_lead_score(self, auth_client, contact_with_data):
        """El endpoint devuelve un score en rango 0-100 con label."""
        response = auth_client.get(f"/api/v3/lead-score/{contact_with_data.id}/")
        assert response.status_code == 200

        data = response.json()
        assert "lead_score" in data
        assert 0 <= data["lead_score"] <= 100
        assert "label" in data
        assert len(data["label"]) > 0
        assert "model_used" in data
        assert data["model_used"] == "ml_v3"

    def test_returns_features(self, auth_client, contact_with_data):
        """El endpoint incluye las features usadas por el modelo."""
        response = auth_client.get(f"/api/v3/lead-score/{contact_with_data.id}/")
        data = response.json()

        assert "features" in data
        features = data["features"]
        # Algunas features clave deben estar presentes
        assert "total_interactions" in features
        assert "sentiment_avg" in features
        assert "company_industry" in features
        # Con 3 interacciones y sentimiento positivo, debe reflejarlo
        assert features["total_interactions"] == 3
        assert features["sentiment_avg"] == 5.0  # positive → 5.0
        assert features["company_industry"] == "technology"

    def test_404_for_nonexistent_contact(self, auth_client):
        """Contacto inexistente devuelve 404."""
        response = auth_client.get("/api/v3/lead-score/99999/")
        assert response.status_code == 404

    def test_lead_score_without_interactions(self, auth_client, user, company):
        """Contacto sin interacciones devuelve un score bajo."""
        contact = Contact.objects.create(
            first_name="Sin",
            last_name="Actividad",
            email="sin@example.com",
            company=company,
            assigned_to=user,
        )
        response = auth_client.get(f"/api/v3/lead-score/{contact.id}/")
        assert response.status_code == 200
        data = response.json()
        # Sin interacciones y sentimiento neutro, el score debe ser bajo
        assert data["lead_score"] < 50


# ============================================================
# Tests: Churn
# ============================================================

@pytest.mark.django_db
class TestChurnEndpoint:

    def test_requires_authentication(self, api_client, contact_with_data):
        response = api_client.get(f"/api/v3/churn/{contact_with_data.id}/")
        assert response.status_code == 401

    def test_returns_valid_churn(self, auth_client, contact_with_data):
        """El endpoint devuelve probabilidad 0-100 y risk_level."""
        response = auth_client.get(f"/api/v3/churn/{contact_with_data.id}/")
        assert response.status_code == 200

        data = response.json()
        assert "churn_probability" in data
        assert 0 <= data["churn_probability"] <= 100
        assert "risk_level" in data
        assert "key_factors" in data
        assert data["model_used"] == "ml_v3"

    def test_risk_level_consistent_with_probability(self, auth_client, contact_with_data):
        """risk_level debe ser coherente con la probabilidad."""
        response = auth_client.get(f"/api/v3/churn/{contact_with_data.id}/")
        data = response.json()
        prob = data["churn_probability"]
        risk = data["risk_level"]

        if prob >= 70:
            assert "Alto" in risk
        elif prob >= 40:
            assert "medio" in risk.lower()
        else:
            assert "Bajo" in risk

    def test_churned_contact_has_high_churn(self, auth_client, user):
        """Un contacto ya churned debe tener churn alto."""
        contact = Contact.objects.create(
            first_name="Ya",
            last_name="Se fue",
            email="churned@example.com",
            status="churned",
            assigned_to=user,
        )
        response = auth_client.get(f"/api/v3/churn/{contact.id}/")
        assert response.status_code == 200
        data = response.json()
        assert data["churn_probability"] > 50


# ============================================================
# Tests: Segmentación
# ============================================================

@pytest.mark.django_db
class TestSegmentEndpoint:

    def test_requires_authentication(self, api_client, contact_with_data):
        response = api_client.get(f"/api/v3/segment/{contact_with_data.id}/")
        assert response.status_code == 401

    def test_returns_valid_segment(self, auth_client, contact_with_data):
        """El endpoint devuelve cluster válido y label."""
        response = auth_client.get(f"/api/v3/segment/{contact_with_data.id}/")
        assert response.status_code == 200

        data = response.json()
        assert "segment" in data
        segment = data["segment"]
        assert segment["cluster"] in [0, 1, 2]
        assert len(segment["label"]) > 0
        assert data["model_used"] == "ml_v3"

    def test_segment_includes_stats(self, auth_client, contact_with_data):
        """El segmento incluye stats del cluster."""
        response = auth_client.get(f"/api/v3/segment/{contact_with_data.id}/")
        data = response.json()
        segment = data["segment"]

        assert "stats" in segment
        stats = segment["stats"]
        # Los stats deben tener campos clave
        assert "size" in stats
        assert "conversion_rate" in stats
        assert "churn_rate" in stats


# ============================================================
# Tests: Sentiment Stats
# ============================================================

@pytest.mark.django_db
class TestSentimentStatsEndpoint:

    def test_requires_authentication(self, api_client):
        response = api_client.get("/api/v3/sentiment/stats/")
        assert response.status_code == 401

    def test_returns_aggregated_distribution(self, auth_client, contact_with_data):
        """Devuelve distribución agregada de sentimientos."""
        response = auth_client.get("/api/v3/sentiment/stats/")
        assert response.status_code == 200

        data = response.json()
        assert "distribution" in data
        dist = data["distribution"]
        # El contacto tiene 3 interacciones positivas
        assert dist["positive"] == 3
        assert dist["neutral"] == 0
        assert dist["negative"] == 0
        assert dist["total"] == 3


# ============================================================
# Tests: Segment Stats
# ============================================================

@pytest.mark.django_db
class TestSegmentStatsEndpoint:

    def test_requires_authentication(self, api_client):
        response = api_client.get("/api/v3/segment/stats/")
        assert response.status_code == 401

    def test_returns_clusters(self, auth_client, contact_with_data):
        """Devuelve los 3 clusters con count y estadísticas."""
        response = auth_client.get("/api/v3/segment/stats/")
        assert response.status_code == 200

        data = response.json()
        assert "clusters" in data
        assert len(data["clusters"]) == 3
        assert "total_analyzed" in data

        for cluster in data["clusters"]:
            assert cluster["cluster"] in [0, 1, 2]
            assert cluster["count"] >= 0
            assert len(cluster["label"]) > 0

    def test_total_analyzed_matches_sum(self, auth_client, contact_with_data):
        """La suma de counts debe ser igual a total_analyzed."""
        response = auth_client.get("/api/v3/segment/stats/")
        data = response.json()
        total_from_clusters = sum(c["count"] for c in data["clusters"])
        assert total_from_clusters == data["total_analyzed"]


# ============================================================
# Tests: Features derivadas de Product y Opportunity
# ============================================================

@pytest.mark.django_db
class TestProductOpportunityFeatures:

    def test_features_include_product_and_opportunity(self, db, user, company):
        """build_features_for_contact incluye las 12 features nuevas de Product/Opportunity."""
        contact = Contact.objects.create(
            first_name="Interesado",
            last_name="Productos",
            email="interesado@example.com",
            company=company,
            status="prospect",
            source="referral",
            assigned_to=user,
        )

        # 2 productos de interés
        product_a = Product.objects.create(
            name="Plan Pro",
            sku="SKU-PRO",
            category="software",
            unit_price=3_000_000,
        )
        product_b = Product.objects.create(
            name="Servidor",
            sku="SKU-SRV",
            category="hardware",
            unit_price=1_000_000,
        )
        contact.interests.add(product_a, product_b)

        # 1 oportunidad abierta
        Opportunity.objects.create(
            name="Deal abierto",
            contact=contact,
            amount=5_000_000,
            stage="negotiation",
            probability=80,
        )

        features = build_features_for_contact(contact)

        new_features = [
            "interest_count",
            "avg_interest_price",
            "interest_category_diversity",
            "has_high_value_interest",
            "opportunity_count_total",
            "opportunity_count_open",
            "pipeline_value_total",
            "pipeline_value_weighted",
            "avg_deal_probability",
            "has_won_deal",
            "has_lost_deal",
            "days_since_last_won",
        ]
        for feat in new_features:
            assert feat in features

        assert features["interest_count"] == 2
        assert features["opportunity_count_open"] == 1
        assert features["pipeline_value_total"] > 0

    def test_lead_score_higher_with_open_opportunity(self, auth_client, user, company):
        """Un contacto con oportunidad abierta grande tiene score >= que uno sin ella."""
        contact_without = Contact.objects.create(
            first_name="Sin",
            last_name="Deal",
            email="sin_deal@example.com",
            company=company,
            status="prospect",
            source="referral",
            assigned_to=user,
        )
        contact_with = Contact.objects.create(
            first_name="Con",
            last_name="Deal",
            email="con_deal@example.com",
            company=company,
            status="prospect",
            source="referral",
            assigned_to=user,
        )
        Opportunity.objects.create(
            name="Deal grande",
            contact=contact_with,
            amount=5_000_000,
            stage="negotiation",
            probability=80,
        )

        response_without = auth_client.get(f"/api/v3/lead-score/{contact_without.id}/")
        response_with = auth_client.get(f"/api/v3/lead-score/{contact_with.id}/")
        assert response_without.status_code == 200
        assert response_with.status_code == 200

        score_without = response_without.json()["lead_score"]
        score_with = response_with.json()["lead_score"]
        assert score_with >= score_without
