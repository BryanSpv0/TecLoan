from django.contrib import admin
from django.urls import path
from gestion import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.login_register, name='login_register'),
    path('home/', views.home, name='home'),
    path('gestion/logs/filtrar/', views.filtrar_logs, name='filtrar_logs'),
    
    # Añadir URLs para AJAX
    path('gestion/usuarios/obtener/<int:usuario_id>/', views.obtener_usuario, name='obtener_usuario'),
    path('gestion/usuarios/guardar/', views.guardar_usuario, name='guardar_usuario'),
    path('gestion/usuarios/eliminar/<int:usuario_id>/', views.eliminar_usuario, name='eliminar_usuario'),
    
    path('gestion/equipos/obtener/<int:equipo_id>/', views.obtener_equipo, name='obtener_equipo'),
    path('gestion/equipos/guardar/', views.guardar_equipo, name='guardar_equipo'),
    path('gestion/equipos/eliminar/<int:equipo_id>/', views.eliminar_equipo, name='eliminar_equipo'),
    
    path('gestion/aulas/obtener/<int:aula_id>/', views.obtener_aula, name='obtener_aula'),
    path('gestion/aulas/guardar/', views.guardar_aula, name='guardar_aula'),
    path('gestion/aulas/eliminar/<int:aula_id>/', views.eliminar_aula, name='eliminar_aula'),
    
    path('gestion/prestamos/obtener/<int:prestamo_id>/', views.obtener_prestamo, name='obtener_prestamo'),
    path('gestion/prestamos/guardar/', views.guardar_prestamo, name='guardar_prestamo'),
    path('gestion/prestamos/eliminar/<int:prestamo_id>/', views.eliminar_prestamo, name='eliminar_prestamo'),
]