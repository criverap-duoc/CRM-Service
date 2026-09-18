from django.urls import path
from .views import (
    LeadScoreView, 
    SentimentAnalysisView, 
    SentimentStatsView,
    ExportContactsCSVView,
    ExportInteractionsCSVView,
    ChurnPredictionView,
    LeadSegmentationView,
    AgentDashboardView,
)

urlpatterns = [
    path('lead-score/<int:contact_id>/', LeadScoreView.as_view(), name='lead-score'),
    path('sentiment/<int:interaction_id>/', SentimentAnalysisView.as_view(), name='sentiment'),
    path('sentiment/stats/', SentimentStatsView.as_view(), name='sentiment-stats'),
    path('export/contacts/', ExportContactsCSVView.as_view(), name='export-contacts'),
    path('export/interactions/', ExportInteractionsCSVView.as_view(), name='export-interactions'),
    path('churn/<int:contact_id>/', ChurnPredictionView.as_view(), name='churn-prediction'),
    path('segment/<int:contact_id>/', LeadSegmentationView.as_view(), name='lead-segmentation'),
    path('agents/dashboard/', AgentDashboardView.as_view(), name='agent-dashboard'),
]