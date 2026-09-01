from django.urls import path
from .views import LeadScoreView, SentimentAnalysisView, SentimentStatsView

urlpatterns = [
    path('lead-score/<int:contact_id>/', LeadScoreView.as_view(), name='lead-score'),
    path('sentiment/<int:interaction_id>/', SentimentAnalysisView.as_view(), name='sentiment'),
    path('sentiment/stats/', SentimentStatsView.as_view(), name='sentiment-stats'),
]