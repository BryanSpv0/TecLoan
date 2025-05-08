from django.contrib.auth.models import AbstractUser
from django.db import models

# Extensión del modelo de usuario
class Usuario(AbstractUser):
    TIPO_USUARIO = [
        ('APRENDIZ', 'Aprendiz'),
        ('DOCENTE', 'Docente'),
        ('ADMINISTRADOR', 'Administrador'),
    ]
    tipo_usuario = models.CharField(max_length=15, choices=TIPO_USUARIO)
    telefono = models.CharField(max_length=15, blank=True, null=True)
    firma = models.ImageField(upload_to='firmas/', blank=True, null=True)
    documento = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.tipo_usuario})"

    class Meta:
        swappable = 'AUTH_USER_MODEL'

class Equipo(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    disponible = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre

class Aula(models.Model):
    nombre = models.CharField(max_length=100)
    capacidad = models.PositiveIntegerField()
    disponible = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre

class Prestamo(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    equipo = models.ForeignKey(Equipo, on_delete=models.SET_NULL, null=True, blank=True)
    aula = models.ForeignKey(Aula, on_delete=models.SET_NULL, null=True, blank=True)
    fecha_prestamo = models.DateTimeField(auto_now_add=True)
    fecha_devolucion = models.DateTimeField(null=True, blank=True)
    devuelto = models.BooleanField(default=False)

    def __str__(self):
        return f"Préstamo de {self.usuario.username} - {self.fecha_prestamo.strftime('%Y-%m-%d')}"

class CodigoQR(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE)
    imagen_qr = models.ImageField(upload_to='codigos_qr/')
    creado = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"QR de {self.usuario.username}"

class LogActividad(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True)
    accion = models.TextField()
    fecha = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.usuario.username if self.usuario else 'Desconocido'} - {self.accion} - {self.fecha.strftime('%Y-%m-%d %H:%M')}"


