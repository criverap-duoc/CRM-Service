import logging
import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

META_GRAPH_URL = "https://graph.facebook.com/v20.0"
OPENAI_URL = "https://api.openai.com/v1"


class MetaClient:
    def __init__(self, access_token=None):
        self.access_token = access_token or settings.META_ACCESS_TOKEN

    def get_leads(self, form_id, limit=25):
        url = f"{META_GRAPH_URL}/{form_id}/leads"
        params = {"limit": limit, "access_token": self.access_token}
        try:
            response = httpx.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as exc:
            logger.error("Meta API error [%s]: %s", exc.response.status_code, exc.response.text)
            raise
        except httpx.RequestError as exc:
            logger.error("Meta API connection error: %s", exc)
            raise


class OpenAIClient:
    def __init__(self, api_key=None):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self._has_api_key = bool(self.api_key)
        
        if not self._has_api_key:
            logger.warning("OpenAI API key no configurada. Usando modo simulado.")

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def chat(self, messages, model="gpt-4o-mini", max_tokens=512):
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
        }
        try:
            response = httpx.post(
                f"{OPENAI_URL}/chat/completions",
                headers=self._headers(),
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as exc:
            logger.error("OpenAI API error [%s]: %s", exc.response.status_code, exc.response.text)
            raise
        except httpx.RequestError as exc:
            logger.error("OpenAI connection error: %s", exc)
            raise

    def summarize_interaction(self, body):
        return self.chat(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a CRM assistant. Summarize the following customer interaction "
                        "in 2-3 sentences, highlighting key intent and any action items."
                    ),
                },
                {"role": "user", "content": body},
            ]
        )

    def analyze_sentiment(self, text: str) -> dict:
        """
        Analiza el sentimiento de un texto.
        Si no hay API key, usa un modo simulado basado en reglas.
        Retorna: {'label': 'positive'|'neutral'|'negative', 'score': 0-1}
        """
        # MODO SIMULADO: si no hay API key, usar reglas básicas
        if not self._has_api_key:
            return self._analyze_sentiment_simulated(text)
        
        # MODO REAL: usar OpenAI
        try:
            response = self.chat(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a sentiment analysis expert. Analyze the sentiment of the following "
                            "customer interaction text. Respond in JSON format with 'label' (positive/neutral/negative) "
                            "and 'score' (0-1, where 0 is very negative and 1 is very positive)."
                        )
                    },
                    {"role": "user", "content": text}
                ],
                max_tokens=100
            )
            
            # Parsear la respuesta
            import json
            response_text = response.strip()
            if response_text.startswith('```json'):
                response_text = response_text.replace('```json', '').replace('```', '').strip()
            
            result = json.loads(response_text)
            return {
                'label': result.get('label', 'neutral'),
                'score': result.get('score', 0.5)
            }
        except Exception as e:
            logger.error(f"Error en análisis de sentimiento con OpenAI: {e}")
            return self._analyze_sentiment_simulated(text)
    
    def _analyze_sentiment_simulated(self, text: str) -> dict:
        """
        Análisis de sentimiento simulado basado en reglas simples.
        Útil cuando no hay API key de OpenAI.
        """
        text_lower = text.lower()
        
        # Palabras positivas
        positive_words = [
            'excelente', 'gracias', 'contento', 'satisfecho', 'genial', 
            'bueno', 'bien', 'mejor', 'ayuda', 'resolvió', 'feliz',
            'agradecido', 'fantástico', 'increíble', 'perfecto'
        ]
        
        # Palabras negativas
        negative_words = [
            'problema', 'error', 'falla', 'malo', 'urgencia', 'queja',
            'tarde', 'lento', 'difícil', 'mal', 'peor', 'terrible',
            'frustrado', 'molesto', 'grave'
        ]
        
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        # Calcular score
        total = positive_count + negative_count
        if total == 0:
            return {'label': 'neutral', 'score': 0.5}
        
        score = positive_count / total
        
        # Etiqueta
        if score >= 0.7:
            label = 'positive'
        elif score <= 0.3:
            label = 'negative'
        else:
            label = 'neutral'
        
        return {
            'label': label,
            'score': round(score, 2)
        }