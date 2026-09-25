## backend\scripts\populate_data.py
"""
Script para poblar la base de datos con datos de prueba diversos.
Genera contactos, interacciones y análisis de sentimiento.
"""
import os
import sys
import django
import random
from datetime import datetime, timedelta

# Configurar Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_service.settings.dev')
django.setup()

from django.contrib.auth.models import User
from django.utils import timezone
from apps.contacts.models import Contact
from apps.interactions.models import Interaction
from apps.analytics.models import SentimentAnalysis
from apps.companies.models import Company
from apps.tags.models import Tag

# Datos para generar
NOMBRES = [
    'María', 'Carlos', 'Ana', 'Pedro', 'Laura', 'Diego', 'Sofía', 'Javier',
    'Valentina', 'Andrés', 'Camila', 'Felipe', 'Isabella', 'Matías', 'Florencia',
    'Sebastián', 'Josefa', 'Nicolás', 'Antonia', 'Gabriel', 'Martina', 'Lucas',
    'Catalina', 'Benjamín', 'Constanza', 'Vicente', 'Javiera', 'Ignacio',
    'Fernanda', 'Cristóbal', 'Amanda', 'Tomás', 'Trinidad', 'Maximiliano',
    'Emilia', 'Facundo', 'Renata', 'Agustín', 'Paz', 'Bruno'
]

APELLIDOS = [
    'González', 'Rodríguez', 'Martínez', 'Sánchez', 'Fernández', 'López',
    'Pérez', 'García', 'Silva', 'Rojas', 'Muñoz', 'Contreras', 'Sepúlveda',
    'Morales', 'Fuentes', 'Araya', 'Reyes', 'Cáceres', 'Vargas', 'Castillo',
    'Flores', 'Herrera', 'Riquelme', 'Vera', 'Torres', 'Ramírez', 'Cortés',
    'Navarro', 'Pizarro', 'Salazar', 'Guzmán', 'Valenzuela', 'Tapia', 'Bravo',
    'Miranda', 'Soto', 'Paredes', 'Carrasco', 'Núñez', 'Álvarez'
]

# Empresas con metadata realista para features de ML
EMPRESAS_DATA = [
    ("Tech Solutions SpA", "technology", "medium"),
    ("Innovación Digital Ltda", "technology", "small"),
    ("Consultora Andina", "services", "medium"),
    ("DataCorp Chile", "technology", "large"),
    ("Marketing Pro", "services", "small"),
    ("Soluciones TI", "technology", "medium"),
    ("Grupo Vertice", "finance", "large"),
    ("StartupLab", "technology", "startup"),
    ("Cloud Services", "technology", "medium"),
    ("Análisis y Datos", "technology", "small"),
    ("ERP Consultores", "services", "medium"),
    ("Sistemas Integrales", "technology", "medium"),
    ("Redes y Comunicaciones", "technology", "large"),
    ("Software Factory", "technology", "medium"),
    ("Transformación Digital", "services", "small"),
    ("Inteligencia de Negocios", "technology", "small"),
    ("CRM Expertos", "technology", "startup"),
    ("Automatización Total", "manufacturing", "large"),
    ("Visión Artificial", "technology", "startup"),
    ("Blockchain Chile", "finance", "startup"),
    ("Retail Express", "retail", "medium"),
    ("Clínica Vida", "health", "large"),
    ("Colegio Futuro", "education", "medium"),
]

# Tags por defecto con metadata para UI
TAGS_DATA = [
    ("VIP", "#ef4444", "Cliente prioritario"),
    ("Pyme", "#22c55e", "Pequeña o mediana empresa"),
    ("Enterprise", "#6366f1", "Corporación grande"),
    ("Frío", "#94a3b8", "Contacto sin actividad reciente"),
    ("Caliente", "#f97316", "Alta intención de compra"),
    ("En riesgo", "#f43f5e", "Riesgo de churn detectado"),
    ("Referido", "#8b5cf6", "Llegó por recomendación"),
    ("Meta Ads", "#0ea5e9", "Origen en campaña pagada"),
    ("Renovación", "#14b8a6", "Contacto en ciclo de renovación"),
    ("Onboarding", "#eab308", "En proceso de incorporación"),
]

INDUSTRIAS = ['tech', 'healthcare', 'finance', 'retail', 'education', 'other']

CARGOS = [
    'Gerente General', 'Director de TI', 'Jefe de Proyectos', 'Analista de Datos',
    'Desarrollador Senior', 'Product Manager', 'CTO', 'CIO', 'Consultor',
    'Especialista en Marketing', 'Ventas', 'Recursos Humanos'
]

# Textos para interacciones (con diferentes sentimientos)
TEXTOS_POSITIVOS = [
    'Excelente atención, muy satisfecho con el servicio.',
    'Gracias por la rápida respuesta, el equipo está muy contento.',
    'La solución funcionó perfectamente, muy agradecido.',
    'Gran trabajo, superó nuestras expectativas.',
    'Muy buena experiencia, recomendaré sus servicios.',
    'El equipo resolvió todo rápidamente, excelente.',
    'Estamos muy felices con los resultados obtenidos.',
    'La implementación fue impecable, gracias por el apoyo.',
]

TEXTOS_NEUTRALES = [
    'Recibido, quedo atento a novedades.',
    'Entendido, revisaré la información y responderé.',
    'Gracias por la información, la analizaré.',
    'Ok, quedamos en contacto para la próxima semana.',
    'De acuerdo, procederé según lo indicado.',
    'Recibido el documento, lo revisaré en detalle.',
]

TEXTOS_NEGATIVOS = [
    'Estoy teniendo problemas con la integración, no funciona.',
    'El sistema está muy lento, necesito una solución urgente.',
    'No estoy satisfecho con el servicio, esperaba más.',
    'Hay errores en los datos, por favor revisar.',
    'La respuesta ha tardado demasiado, estoy molesto.',
    'No logro que funcione correctamente, necesito ayuda.',
    'El soporte no ha sido efectivo, sigo con problemas.',
    'La funcionalidad tiene fallas graves, urgencia.',
]

CHANNELS = ['email', 'phone', 'whatsapp', 'chat', 'meeting', 'other']
DIRECTIONS = ['inbound', 'outbound']
STATUSES = ['lead', 'prospect', 'customer', 'churned']
SOURCES = ['manual', 'meta_ads', 'organic', 'referral', 'other']

def ensure_companies(users):
    """Crea las empresas si no existen. Devuelve la lista de Company."""
    companies = []
    for name, industry, size in EMPRESAS_DATA:
        company, _ = Company.objects.get_or_create(
            name=name,
            defaults={
                "industry": industry,
                "size": size,
                "country": "Chile",
                "annual_revenue": random.randint(50_000_000, 5_000_000_000),
                "created_by": random.choice(users) if users else None,
            },
        )
        companies.append(company)
    return companies

def ensure_tags(users):
    """Crea los tags si no existen. Devuelve la lista de Tag."""
    tags = []
    for name, color, description in TAGS_DATA:
        tag, _ = Tag.objects.get_or_create(
            name=name,
            defaults={
                "color": color,
                "description": description,
                "created_by": random.choice(users) if users else None,
            },
        )
        tags.append(tag)
    return tags

def generate_contacts(n=50):
    """Genera n contactos aleatorios, con empresa y tags asignados."""
    users = list(User.objects.all())
    if not users:
        print("❌ No hay usuarios. Crea un superusuario primero.")
        return []

    companies = ensure_companies(users)
    tags = ensure_tags(users)
    contacts_created = []
    used_emails = set()

    for i in range(n):
        first_name = random.choice(NOMBRES)
        last_name = random.choice(APELLIDOS)
        email = f"{first_name.lower()}.{last_name.lower()}{i}@ejemplo.com"

        while email in used_emails:
            email = f"{first_name.lower()}.{last_name.lower()}{random.randint(1000,9999)}@ejemplo.com"
        used_emails.add(email)

        contact = Contact.objects.create(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=f"+569{random.randint(10000000, 99999999)}",
            company=random.choice(companies),
            status=random.choice(STATUSES),
            source=random.choice(SOURCES),
            assigned_to=random.choice(users),
            notes=f"Contacto generado automáticamente. Cargo: {random.choice(CARGOS)}",
        )

        # Asignar entre 1 y 3 tags aleatorios
        num_tags = random.randint(1, 3)
        selected_tags = random.sample(tags, num_tags)
        contact.tags.set(selected_tags)

        contacts_created.append(contact)

    print(f"✅ {len(contacts_created)} contactos creados")
    print(f"✅ {len(companies)} empresas aseguradas")
    print(f"✅ {len(tags)} tags asegurados")
    return contacts_created

def generate_interactions(contacts, interactions_per_contact=(1, 8)):
    """Genera interacciones para cada contacto"""
    users = list(User.objects.all())
    interactions_created = []
    
    for contact in contacts:
        num_interactions = random.randint(*interactions_per_contact)
        
        for j in range(num_interactions):
            # Elegir sentimiento y texto correspondiente
            sentiment_type = random.choices(
                ['positive', 'neutral', 'negative'],
                weights=[0.5, 0.3, 0.2]
            )[0]
            
            if sentiment_type == 'positive':
                body = random.choice(TEXTOS_POSITIVOS)
            elif sentiment_type == 'negative':
                body = random.choice(TEXTOS_NEGATIVOS)
            else:
                body = random.choice(TEXTOS_NEUTRALES)
            
            # Fecha aleatoria en los últimos 90 días
            days_ago = random.randint(0, 90)
            occurred_at = timezone.now() - timedelta(days=days_ago, hours=random.randint(0, 23))
            
            interaction = Interaction.objects.create(
                contact=contact,
                agent=random.choice(users) if users else None,
                channel=random.choice(CHANNELS),
                direction=random.choice(DIRECTIONS),
                subject=f"Interacción {j+1} - {contact.full_name}",
                body=body,
                occurred_at=occurred_at,
            )
            interactions_created.append(interaction)
            
            # Crear análisis de sentimiento automático
            score_map = {
                'positive': random.uniform(0.7, 1.0),
                'neutral': random.uniform(0.4, 0.6),
                'negative': random.uniform(0.0, 0.3),
            }
            
            SentimentAnalysis.objects.create(
                interaction=interaction,
                label=sentiment_type,
                score=round(score_map[sentiment_type], 2),
            )
    
    print(f"✅ {len(interactions_created)} interacciones creadas con análisis de sentimiento")
    return interactions_created


def main():
    print("🚀 Generando datos de prueba para CRM Service V3...")
    print("-" * 50)
    
    # Preguntar cuántos contactos crear
    try:
        n = int(input("¿Cuántos contactos deseas crear? (default: 50): ") or "50")
    except ValueError:
        n = 50
    
    # Generar contactos
    contacts = generate_contacts(n)
    
    if contacts:
        # Generar interacciones
        generate_interactions(contacts)
    
    print("-" * 50)
    print(f"📊 Resumen:")
    print(f"   - Contactos totales: {Contact.objects.count()}")
    print(f"   - Interacciones totales: {Interaction.objects.count()}")
    print(f"   - Análisis de sentimiento: {SentimentAnalysis.objects.count()}")
    print("✅ Proceso completado")


if __name__ == "__main__":
    main()