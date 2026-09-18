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

EMPRESAS = [
    'Tech Solutions SpA', 'Innovación Digital Ltda', 'Consultora Andina',
    'DataCorp Chile', 'Marketing Pro', 'Soluciones TI', 'Grupo Vertice',
    'StartupLab', 'Cloud Services', 'Análisis y Datos', 'ERP Consultores',
    'Sistemas Integrales', 'Redes y Comunicaciones', 'Software Factory',
    'Transformación Digital', 'Inteligencia de Negocios', 'CRM Expertos',
    'Automatización Total', 'Visión Artificial', 'Blockchain Chile'
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


def generate_contacts(n=50):
    """Genera n contactos aleatorios"""
    # Obtener usuarios para asignar
    users = list(User.objects.all())
    if not users:
        print("❌ No hay usuarios. Crea un superusuario primero.")
        return []
    
    contacts_created = []
    used_emails = set()
    
    for i in range(n):
        first_name = random.choice(NOMBRES)
        last_name = random.choice(APELLIDOS)
        email = f"{first_name.lower()}.{last_name.lower()}{i}@ejemplo.com"
        
        # Evitar duplicados
        while email in used_emails:
            email = f"{first_name.lower()}.{last_name.lower()}{random.randint(1000,9999)}@ejemplo.com"
        used_emails.add(email)
        
        contact = Contact.objects.create(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=f"+569{random.randint(10000000, 99999999)}",
            company=random.choice(EMPRESAS),
            status=random.choice(STATUSES),
            source=random.choice(SOURCES),
            assigned_to=random.choice(users),
            notes=f"Contacto generado automáticamente. Industria: {random.choice(INDUSTRIAS)}. Cargo: {random.choice(CARGOS)}",
        )
        contacts_created.append(contact)
    
    print(f"✅ {len(contacts_created)} contactos creados")
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