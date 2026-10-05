## crm_service\apps\integrations\urls.py
from django.urls import path
from .views import MetaWebhookView, SummarizeContactView, SummarizeInteractionView

urlpatterns = [
    path("meta/webhook/", MetaWebhookView.as_view(), name="meta-webhook"),
    path("ai/summarize/", SummarizeInteractionView.as_view(), name="ai-summarize"),
    path("ai/summarize-contact/", SummarizeContactView.as_view(), name="ai-summarize-contact"),
]
