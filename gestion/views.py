from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.db.models import Q
from django.contrib.auth import authenticate, login
from datetime import datetime
import uuid
from io import BytesIO
from django.core.files.base import ContentFile
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.utils import timezone
from .models import Usuario, LogActividad, Equipo, Aula, Prestamo, CodigoQR

def login_register(request):
    if request.method == "POST":
        if "registro" in request.POST:
            username = request.POST.get("username", "").strip()
            first_name = request.POST.get("first_name", "").strip()
            last_name = request.POST.get("last_name", "").strip()
            documento = request.POST.get("documento", "").strip()
            email = request.POST.get("email", "").strip().lower()
            password = request.POST.get("password", "")
            tipo_usuario = request.POST.get("tipo_usuario", "")
            telefono = request.POST.get("telefono", "").strip()
            carrera = request.POST.get("carrera", "").strip() if tipo_usuario == "APRENDIZ" else ""

            if not all([username, first_name, last_name, documento, email, password, tipo_usuario, telefono]):
                request.session["modal_message"] = {"type": "error", "text": "Todos los campos son obligatorios"}
                return redirect("login_register")
                
            if tipo_usuario == "APRENDIZ" and not carrera:
                request.session["modal_message"] = {"type": "error", "text": "El campo carrera es obligatorio para aprendices"}
                return redirect("login_register")

            if Usuario.objects.filter(email=email).exists():
                request.session["modal_message"] = {"type": "error", "text": "El correo ya está en uso!"}
                return redirect("login_register")

            try:
                Usuario.objects.create_user(
                    username=username,
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    password=password,
                    tipo_usuario=tipo_usuario,
                    telefono=telefono,
                    documento=documento
                )
                
                # Registrar la acción en el log
                LogActividad.objects.create(
                    usuario=None,
                    accion=f"Nuevo usuario registrado: {username} ({tipo_usuario})"
                )
                
                request.session["modal_message"] = {"type": "success", "text": "Registro exitoso. Ahora puedes iniciar sesión."}
                return redirect("login_register")
            except Exception as e:
                request.session["modal_message"] = {"type": "error", "text": f"Error al crear el usuario: {str(e)}"}
                return redirect("login_register")

        elif "inicio_sesion" in request.POST:
            email = request.POST.get("email", "").strip().lower()
            password = request.POST.get("password", "")
            tipo_usuario = request.POST.get("tipo_usuario", "")
            
            # Buscar el usuario por correo electrónico
            try:
                user = Usuario.objects.get(email=email)
                # Autenticar con el nombre de usuario
                usuario = authenticate(request, username=user.username, password=password)
                if usuario is not None:
                    login(request, usuario)
                    request.session["modal_message"] = {"type": "success", "text": f"¡Bienvenido {usuario.username}!"}
                    return redirect("home")
                else:
                    request.session["modal_message"] = {"type": "error", "text": "Contraseña incorrecta"}
                    return redirect("login_register")
            except Usuario.DoesNotExist:
                request.session["modal_message"] = {"type": "error", "text": "No existe un usuario con este correo electrónico"}
                return redirect("login_register")

    modal_message = request.session.get("modal_message")
    if modal_message:
        del request.session["modal_message"]

    return render(request, "gestion/login_register.html", {"modal_message": modal_message})


def home(request):
    # Importar los modelos necesarios
    from .models import Equipo, Aula, Prestamo, Usuario
    from django.db.models import Count, Q
    
    # Obtener estadísticas para el dashboard
    try:
        total_equipos = Equipo.objects.count()
        equipos_disponibles = Equipo.objects.filter(disponible=True).count()
        
        total_aulas = Aula.objects.count()
        aulas_disponibles = Aula.objects.filter(disponible=True).count()
        
        total_prestamos = Prestamo.objects.count()
        prestamos_activos = Prestamo.objects.filter(devuelto=False).count()
        
        # Obtener la lista completa de equipos para la sección de equipos
        equipos = Equipo.objects.all()
    except Exception:
        # En caso de error, establecer valores predeterminados
        total_equipos = equipos_disponibles = total_aulas = aulas_disponibles = total_prestamos = prestamos_activos = 0
        equipos = []
    
    total_usuarios = Usuario.objects.count()
    
    # Obtener préstamos recientes para mostrar en el dashboard
    try:
        prestamos_recientes = Prestamo.objects.order_by('-fecha_prestamo')[:5]
    except Exception:
        prestamos_recientes = []
    
    # Calcular usuarios nuevos hoy
    hoy = datetime.now().date()
    try:
        usuarios_nuevos = Usuario.objects.filter(date_joined__date=hoy).count()
    except Exception:
        usuarios_nuevos = 0
    
    # Obtener todos los usuarios para la sección de usuarios con información de préstamos activos
    try:
        todos_usuarios = Usuario.objects.all()
        
        # Para cada usuario, verificar si tiene préstamos activos
        for usuario in todos_usuarios:
            # Préstamos de equipos activos
            usuario.prestamos_activos_equipo = Prestamo.objects.filter(
                usuario=usuario, 
                equipo__isnull=False, 
                devuelto=False
            ).exists()
            
            # Préstamos de aulas activos (solo relevante para docentes)
            usuario.prestamos_activos_aula = Prestamo.objects.filter(
                usuario=usuario, 
                aula__isnull=False, 
                devuelto=False
            ).exists()
    except Exception:
        todos_usuarios = []
    
    context = {
        'usuario': request.user,
        'total_equipos': total_equipos,
        'equipos_disponibles': equipos_disponibles,
        'total_aulas': total_aulas,
        'aulas_disponibles': aulas_disponibles,
        'total_prestamos': total_prestamos,
        'prestamos_activos': prestamos_activos,
        'total_usuarios': total_usuarios,
        'equipos': equipos,
        "prestamos_recientes": prestamos_recientes,
        "usuarios_nuevos": usuarios_nuevos,
        "todos_usuarios": todos_usuarios  # Agregamos todos los usuarios al contexto
    }
    
    return render(request, "gestion/home.html", context)


def filtrar_logs(request):
    """Vista para filtrar logs mediante AJAX"""
    if request.method == 'GET':
        # Obtener parámetros de filtrado
        usuario_id = request.GET.get('usuario', '')
        fecha_desde = request.GET.get('fecha_desde', '')
        fecha_hasta = request.GET.get('fecha_hasta', '')
        accion = request.GET.get('accion', '')
        
        # Iniciar con todos los logs
        logs = LogActividad.objects.all().order_by('-fecha')
        
        # Aplicar filtros si se proporcionan
        if usuario_id:
            logs = logs.filter(usuario_id=usuario_id)
        
        if fecha_desde:
            fecha_desde = datetime.strptime(fecha_desde, '%Y-%m-%d')
            logs = logs.filter(fecha__gte=fecha_desde)
        
        if fecha_hasta:
            fecha_hasta = datetime.strptime(fecha_hasta, '%Y-%m-%d')
            # Ajustar para incluir todo el día
            fecha_hasta = fecha_hasta.replace(hour=23, minute=59, second=59)
            logs = logs.filter(fecha__lte=fecha_hasta)
        
        if accion:
            logs = logs.filter(accion__icontains=accion)
        
        # Preparar datos para JSON
        logs_data = []
        for log in logs:
            logs_data.append({
                'usuario': f"{log.usuario.first_name} {log.usuario.last_name}" if log.usuario else "Sistema",
                'accion': log.accion,
                'fecha': log.fecha.strftime('%Y-%m-%d %H:%M:%S')
            })
        
        return JsonResponse({'logs': logs_data})
    
    return JsonResponse({'error': 'Método no permitido'}, status=405)


def obtener_usuario(request, usuario_id):
    """Vista para obtener datos de un usuario mediante AJAX"""
    try:
        usuario = Usuario.objects.get(id=usuario_id)
        data = {
            'success': True,
            'usuario': {
                'id': usuario.id,
                'username': usuario.username,
                'email': usuario.email,
                'first_name': usuario.first_name,
                'last_name': usuario.last_name,
                'tipo_usuario': usuario.tipo_usuario,
                'telefono': usuario.telefono or '',
                'documento': usuario.documento or '',
            }
        }
    except Usuario.DoesNotExist:
        data = {'success': False, 'message': 'Usuario no encontrado'}
    
    return JsonResponse(data)

def guardar_usuario(request):
    """Vista para guardar (crear/actualizar) un usuario mediante AJAX"""
    if request.method == 'POST':
        usuario_id = request.POST.get('id', '')
        
        # Datos del formulario
        username = request.POST.get('username', '').strip()
        email = request.POST.get('email', '').strip().lower()
        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()
        documento = request.POST.get('documento', '').strip()
        tipo_usuario = request.POST.get('tipo_usuario', '')
        telefono = request.POST.get('telefono', '')
        password = request.POST.get('password', '')
        
        # Validar datos básicos
        if not all([username, email, tipo_usuario, documento]):
            return JsonResponse({'success': False, 'message': 'Faltan campos obligatorios'})
        
        try:
            # Actualizar usuario existente
            if usuario_id:
                usuario = Usuario.objects.get(id=usuario_id)
                usuario.username = username
                usuario.email = email
                usuario.first_name = first_name
                usuario.last_name = last_name
                usuario.documento = documento
                usuario.tipo_usuario = tipo_usuario
                usuario.telefono = telefono
                
                # Actualizar contraseña solo si se proporciona
                if password:
                    usuario.set_password(password)
                
                usuario.save()
                mensaje = 'Usuario actualizado correctamente'
            # Crear nuevo usuario
            else:
                # Verificar si ya existe un usuario con ese email
                if Usuario.objects.filter(email=email).exists():
                    return JsonResponse({'success': False, 'message': 'Ya existe un usuario con ese correo'})
                
                # Verificar si ya existe un usuario con ese username
                if Usuario.objects.filter(username=username).exists():
                    return JsonResponse({'success': False, 'message': 'Ya existe un usuario con ese nombre de usuario'})
                
                # Crear el usuario
                usuario = Usuario.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    documento=documento,
                    tipo_usuario=tipo_usuario,
                    telefono=telefono
                )
                mensaje = 'Usuario creado correctamente'
            
            # Registrar la acción en el log
            LogActividad.objects.create(
                usuario=request.user,
                accion=f"{'Actualizó' if usuario_id else 'Creó'} el usuario {usuario.username}"
            )
            
            return JsonResponse({'success': True, 'message': mensaje})
            
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'Error: {str(e)}'})
    
    return JsonResponse({'success': False, 'message': 'Método no permitido'})

def eliminar_usuario(request, usuario_id):
    """Vista para eliminar un usuario mediante AJAX"""
    if request.method == 'POST':
        try:
            usuario = Usuario.objects.get(id=usuario_id)
            
            # No permitir eliminar al usuario actual
            if usuario.id == request.user.id:
                return JsonResponse({'success': False, 'message': 'No puedes eliminar tu propio usuario'})
            
            # Verificar si el usuario tiene préstamos activos
            if Prestamo.objects.filter(usuario=usuario, devuelto=False).exists():
                return JsonResponse({
                    'success': False, 
                    'message': 'No se puede eliminar el usuario porque tiene préstamos activos'
                })
            
            username = usuario.username
            usuario.delete()
            
            # Registrar la acción en el log
            LogActividad.objects.create(
                usuario=request.user,
                accion=f"Eliminó el usuario {username}"
            )
            
            return JsonResponse({'success': True, 'message': 'Usuario eliminado correctamente'})
        except Usuario.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Usuario no encontrado'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'Error: {str(e)}'})
    
    return JsonResponse({'success': False, 'message': 'Método no permitido'})

# Vistas para Equipos
def obtener_equipo(request, equipo_id):
    try:
        equipo = Equipo.objects.get(id=equipo_id)
        data = {
            'id': equipo.id,
            'nombre': equipo.nombre,
            'descripcion': equipo.descripcion,
            'disponible': equipo.disponible
        }
        return JsonResponse({'success': True, 'equipo': data})
    except Equipo.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Equipo no encontrado'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

def guardar_equipo(request):
    if request.method == 'POST':
        equipo_id = request.POST.get('equipo_id', '')
        nombre = request.POST.get('nombre', '').strip()
        descripcion = request.POST.get('descripcion', '').strip()
        disponible = request.POST.get('disponible', '') == 'on'
        
        if not nombre:
            return JsonResponse({'success': False, 'error': 'El nombre del equipo es obligatorio'})
        
        try:
            if equipo_id:
                # Actualizar equipo existente
                equipo = Equipo.objects.get(id=equipo_id)
                equipo.nombre = nombre
                equipo.descripcion = descripcion
                equipo.disponible = disponible
                equipo.save()
                mensaje = 'Equipo actualizado correctamente'
            else:
                # Crear nuevo equipo
                equipo = Equipo.objects.create(
                    nombre=nombre,
                    descripcion=descripcion,
                    disponible=disponible
                )
                mensaje = 'Equipo creado correctamente'
            
            # Registrar la acción en el log
            LogActividad.objects.create(
                usuario=request.user,
                accion=f"{mensaje}: {equipo.nombre}"
            )
            
            return JsonResponse({'success': True, 'mensaje': mensaje})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'})

def eliminar_equipo(request, equipo_id):
    """Vista para eliminar un equipo mediante AJAX"""
    if request.method == 'POST':
        try:
            equipo = Equipo.objects.get(id=equipo_id)
            
            # Verificar si el equipo tiene préstamos activos
            if Prestamo.objects.filter(equipo=equipo, estado='ACTIVO').exists():
                return JsonResponse({
                    'success': False, 
                    'message': 'No se puede eliminar el equipo porque tiene préstamos activos'
                })
            
            nombre_equipo = equipo.nombre
            equipo.delete()
            
            # Registrar la acción en el log
            LogActividad.objects.create(
                usuario=request.user,
                accion=f"Eliminó el equipo {nombre_equipo}"
            )
            
            return JsonResponse({'success': True, 'message': 'Equipo eliminado correctamente'})
        except Equipo.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Equipo no encontrado'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'Error: {str(e)}'})
    
    return JsonResponse({'success': False, 'message': 'Método no permitido'})

def obtener_aula(request, aula_id):
    """Vista para obtener datos de un aula mediante AJAX"""
    try:
        aula = Aula.objects.get(id=aula_id)
        data = {
            'success': True,
            'aula': {
                'id': aula.id,
                'nombre': aula.nombre,
                'codigo': aula.codigo,
                'capacidad': aula.capacidad,
                'disponible': aula.disponible,
            }
        }
    except Aula.DoesNotExist:
        data = {'success': False, 'message': 'Aula no encontrada'}
    
    return JsonResponse(data)

def guardar_aula(request):
    """Vista para guardar (crear/actualizar) un aula mediante AJAX"""
    if request.method == 'POST':
        aula_id = request.POST.get('id', '')
        
        # Datos del formulario
        nombre = request.POST.get('nombre', '').strip()
        capacidad = request.POST.get('capacidad', '0')
        disponible = request.POST.get('disponible', '') == 'true'
        
        # Validar datos básicos
        if not nombre:
            return JsonResponse({'success': False, 'message': 'El nombre del aula es obligatorio'})
        
        try:
            capacidad = int(capacidad)
        except ValueError:
            return JsonResponse({'success': False, 'message': 'La capacidad debe ser un número'})
        
        try:
            # Actualizar aula existente
            if aula_id:
                aula = Aula.objects.get(id=aula_id)
                aula.nombre = nombre
                aula.capacidad = capacidad
                aula.disponible = disponible
                aula.save()
                mensaje = 'Aula actualizada correctamente'
            # Crear nueva aula
            else:
                # Generar código único
                codigo = str(uuid.uuid4())[:8].upper()
                
                # Crear el aula
                aula = Aula.objects.create(
                    nombre=nombre,
                    codigo=codigo,
                    capacidad=capacidad,
                    disponible=disponible
                )
                
                # Generar código QR para el aula
                generar_qr_aula(aula)
                
                mensaje = 'Aula creada correctamente'
            
            # Registrar la acción en el log
            LogActividad.objects.create(
                usuario=request.user,
                accion=f"{'Actualizó' if aula_id else 'Creó'} el aula {aula.nombre}"
            )
            
            return JsonResponse({'success': True, 'message': mensaje})
            
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'Error: {str(e)}'})
    
    return JsonResponse({'success': False, 'message': 'Método no permitido'})

def eliminar_aula(request, aula_id):
    """Vista para eliminar un aula mediante AJAX"""
    if request.method == 'POST':
        try:
            aula = Aula.objects.get(id=aula_id)
            
            # Verificar si el aula tiene préstamos activos
            if Prestamo.objects.filter(aula=aula, estado='ACTIVO').exists():
                return JsonResponse({
                    'success': False, 
                    'message': 'No se puede eliminar el aula porque tiene préstamos activos'
                })
            
            nombre_aula = aula.nombre
            aula.delete()
            
            # Registrar la acción en el log
            LogActividad.objects.create(
                usuario=request.user,
                accion=f"Eliminó el aula {nombre_aula}"
            )
            
            return JsonResponse({'success': True, 'message': 'Aula eliminada correctamente'})
        except Aula.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Aula no encontrada'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'Error: {str(e)}'})
    
    return JsonResponse({'success': False, 'message': 'Método no permitido'})

def obtener_prestamo(request, prestamo_id):
    """Vista para obtener datos de un préstamo mediante AJAX"""
    try:
        prestamo = Prestamo.objects.get(id=prestamo_id)
        data = {
            'success': True,
            'prestamo': {
                'id': prestamo.id,
                'usuario': {
                    'id': prestamo.usuario.id,
                    'nombre': f"{prestamo.usuario.first_name} {prestamo.usuario.last_name}",
                    'username': prestamo.usuario.username
                },
                'equipo': {
                    'id': prestamo.equipo.id,
                    'nombre': prestamo.equipo.nombre
                } if prestamo.equipo else None,
                'aula': {
                    'id': prestamo.aula.id,
                    'nombre': prestamo.aula.nombre
                } if prestamo.aula else None,
                'fecha_prestamo': prestamo.fecha_prestamo.strftime('%Y-%m-%d %H:%M'),
                'fecha_devolucion_esperada': prestamo.fecha_devolucion_esperada.strftime('%Y-%m-%d %H:%M') if prestamo.fecha_devolucion_esperada else '',
                'fecha_devolucion': prestamo.fecha_devolucion.strftime('%Y-%m-%d %H:%M') if prestamo.fecha_devolucion else '',
                'estado': prestamo.estado,
                'devuelto': prestamo.devuelto,
                'observaciones': prestamo.observaciones
            }
        }
    except Prestamo.DoesNotExist:
        data = {'success': False, 'message': 'Préstamo no encontrado'}
    
    return JsonResponse(data)

def guardar_prestamo(request):
    """Vista para guardar (crear/actualizar) un préstamo mediante AJAX"""
    if request.method == 'POST':
        prestamo_id = request.POST.get('id', '')
        
        # Datos del formulario
        usuario_id = request.POST.get('usuario_id', '')
        equipo_id = request.POST.get('equipo_id', '')
        aula_id = request.POST.get('aula_id', '')
        fecha_devolucion_esperada = request.POST.get('fecha_devolucion_esperada', '')
        observaciones = request.POST.get('observaciones', '')
        
        # Validar datos básicos
        if not usuario_id:
            return JsonResponse({'success': False, 'message': 'El usuario es obligatorio'})
        
        if not equipo_id and not aula_id:
            return JsonResponse({'success': False, 'message': 'Debe seleccionar un equipo o un aula'})
        
        try:
            usuario = Usuario.objects.get(id=usuario_id)
            
            equipo = None
            if equipo_id:
                equipo = Equipo.objects.get(id=equipo_id)
                # Verificar disponibilidad del equipo
                if not equipo.disponible and not prestamo_id:
                    return JsonResponse({'success': False, 'message': 'El equipo no está disponible'})
            
            aula = None
            if aula_id:
                aula = Aula.objects.get(id=aula_id)
                # Verificar disponibilidad del aula
                if not aula.disponible and not prestamo_id:
                    return JsonResponse({'success': False, 'message': 'El aula no está disponible'})
            
            # Actualizar préstamo existente
            if prestamo_id:
                prestamo = Prestamo.objects.get(id=prestamo_id)
                
                # Si se está cambiando el equipo o aula, verificar disponibilidad
                if equipo and prestamo.equipo != equipo and not equipo.disponible:
                    return JsonResponse({'success': False, 'message': 'El nuevo equipo no está disponible'})
                
                if aula and prestamo.aula != aula and not aula.disponible:
                    return JsonResponse({'success': False, 'message': 'La nueva aula no está disponible'})
                
                prestamo.usuario = usuario
                prestamo.equipo = equipo
                prestamo.aula = aula
                
                if fecha_devolucion_esperada:
                    prestamo.fecha_devolucion_esperada = datetime.strptime(fecha_devolucion_esperada, '%Y-%m-%dT%H:%M')
                
                prestamo.observaciones = observaciones
                prestamo.save()
                
                mensaje = 'Préstamo actualizado correctamente'
            
            # Crear nuevo préstamo
            else:
                # Generar código único para el QR
                codigo_qr = str(uuid.uuid4())
                
                # Crear el préstamo
                prestamo = Prestamo.objects.create(
                    usuario=usuario,
                    equipo=equipo,
                    aula=aula,
                    fecha_devolucion_esperada=datetime.strptime(fecha_devolucion_esperada, '%Y-%m-%dT%H:%M') if fecha_devolucion_esperada else None,
                    estado='ACTIVO',
                    devuelto=False,
                    codigo_qr=codigo_qr,
                    observaciones=observaciones
                )
                
                # Actualizar disponibilidad del equipo/aula
                if equipo:
                    equipo.disponible = False
                    equipo.estado = 'PRESTADO'
                    equipo.save()
                
                if aula:
                    aula.disponible = False
                    aula.save()
                
                # Generar código QR para el préstamo
                qr_code = generar_qr_prestamo(prestamo)
                
                # Enviar correo con el QR
                if qr_code:
                    enviar_correo_prestamo(prestamo, qr_code)
                
                mensaje = 'Préstamo creado correctamente'
            
            # Registrar la acción en el log
            LogActividad.objects.create(
                usuario=request.user,
                accion=f"{'Actualizó' if prestamo_id else 'Creó'} el préstamo #{prestamo.id}"
            )
            
            return JsonResponse({'success': True, 'message': mensaje})
            
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'Error: {str(e)}'})
    
    return JsonResponse({'success': False, 'message': 'Método no permitido'})

def eliminar_prestamo(request, prestamo_id):
    """Vista para eliminar un préstamo mediante AJAX"""
    if request.method == 'POST':
        try:
            prestamo = Prestamo.objects.get(id=prestamo_id)
            
            # Si el préstamo está activo, liberar el equipo/aula
            if prestamo.estado == 'ACTIVO':
                if prestamo.equipo:
                    prestamo.equipo.disponible = True
                    prestamo.equipo.estado = 'DISPONIBLE'
                    prestamo.equipo.save()
                
                if prestamo.aula:
                    prestamo.aula.disponible = True
                    prestamo.aula.save()
            
            prestamo_id_num = prestamo.id
            prestamo.delete()
            
            # Registrar la acción en el log
            LogActividad.objects.create(
                usuario=request.user,
                accion=f"Eliminó el préstamo #{prestamo_id_num}"
            )
            
            return JsonResponse({'success': True, 'message': 'Préstamo eliminado correctamente'})
        except Prestamo.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Préstamo no encontrado'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'Error: {str(e)}'})
    
    return JsonResponse({'success': False, 'message': 'Método no permitido'})

def registrar_devolucion(request, prestamo_id):
    """Vista para registrar la devolución de un préstamo"""
    if request.method == 'POST':
        try:
            prestamo = Prestamo.objects.get(id=prestamo_id)
            
            # Verificar que el préstamo esté activo
            if prestamo.estado != 'ACTIVO':
                return JsonResponse({'success': False, 'message': 'El préstamo ya ha sido devuelto o está vencido'})
            
            # Actualizar el préstamo
            prestamo.estado = 'DEVUELTO'
            prestamo.devuelto = True
            prestamo.fecha_devolucion = timezone.now()
            prestamo.save()
            
            # Liberar el equipo/aula
            if prestamo.equipo:
                prestamo.equipo.disponible = True
                prestamo.equipo.estado = 'DISPONIBLE'
                prestamo.equipo.save()
            
            if prestamo.aula:
                prestamo.aula.disponible = True
                prestamo.aula.save()
            
            # Registrar la acción en el log
            LogActividad.objects.create(
                usuario=request.user,
                accion=f"Registró la devolución del préstamo #{prestamo.id}"
            )
            
            # Enviar correo de confirmación
            enviar_correo_devolucion(prestamo)
            
            return JsonResponse({'success': True, 'message': 'Devolución registrada correctamente'})
        except Prestamo.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Préstamo no encontrado'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'Error: {str(e)}'})
    
    return JsonResponse({'success': False, 'message': 'Método no permitido'})

def consultar_prestamo_qr(request, codigo_qr):
    """Vista para consultar un préstamo mediante su código QR"""
    try:
        prestamo = Prestamo.objects.get(codigo_qr=codigo_qr)
        
        data = {
            'success': True,
            'prestamo': {
                'id': prestamo.id,
                'usuario': f"{prestamo.usuario.first_name} {prestamo.usuario.last_name}",
                'equipo': prestamo.equipo.nombre if prestamo.equipo else None,
                'aula': prestamo.aula.nombre if prestamo.aula else None,
                'fecha_prestamo': prestamo.fecha_prestamo.strftime('%Y-%m-%d %H:%M'),
                'fecha_devolucion_esperada': prestamo.fecha_devolucion_esperada.strftime('%Y-%m-%d %H:%M') if prestamo.fecha_devolucion_esperada else None,
                'estado': prestamo.estado,
                'devuelto': prestamo.devuelto
            }
        }
        
        return JsonResponse(data)
    except Prestamo.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Préstamo no encontrado'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': f'Error: {str(e)}'})

# Funciones auxiliares para generar códigos QR y enviar correos

def generar_qr_equipo(equipo):
    """Genera un código QR para un equipo"""
    try:
        # Datos para el QR
        datos_qr = {
            'tipo': 'EQUIPO',
            'id': equipo.id,
            'codigo': equipo.codigo,
            'nombre': equipo.nombre
        }
        
        # Generar imagen QR
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(str(datos_qr))
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Guardar imagen en memoria
        buffer = BytesIO()
        img.save(buffer)
        buffer.seek(0)
        
        # Crear objeto CodigoQR
        qr_code = CodigoQR(
            tipo='EQUIPO',
            equipo=equipo,
            codigo=equipo.codigo
        )
        
        # Guardar imagen en el modelo
        qr_code.imagen_qr.save(f'equipo_{equipo.codigo}.png', ContentFile(buffer.read()), save=True)
        
        return qr_code
    except Exception as e:
        print(f"Error al generar QR para equipo: {str(e)}")
        return None

def generar_qr_aula(aula):
    """Genera un código QR para un aula"""
    try:
        # Datos para el QR
        datos_qr = {
            'tipo': 'AULA',
            'id': aula.id,
            'codigo': aula.codigo,
            'nombre': aula.nombre
        }
        
        # Generar imagen QR
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(str(datos_qr))
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Guardar imagen en memoria
        buffer = BytesIO()
        img.save(buffer)
        buffer.seek(0)
        
        # Crear objeto CodigoQR
        qr_code = CodigoQR(
            tipo='AULA',
            aula=aula,
            codigo=aula.codigo
        )
        
        # Guardar imagen en el modelo
        qr_code.imagen_qr.save(f'aula_{aula.codigo}.png', ContentFile(buffer.read()), save=True)
        
        return qr_code
    except Exception as e:
        print(f"Error al generar QR para aula: {str(e)}")
        return None

def generar_qr_prestamo(prestamo):
    """Genera un código QR para un préstamo"""
    try:
        # Datos para el QR
        datos_qr = {
            'tipo': 'PRESTAMO',
            'id': prestamo.id,
            'codigo': prestamo.codigo_qr,
            'usuario': prestamo.usuario.username,
            'equipo': prestamo.equipo.nombre if prestamo.equipo else None,
            'aula': prestamo.aula.nombre if prestamo.aula else None,
            'fecha': prestamo.fecha_prestamo.strftime('%Y-%m-%d %H:%M')
        }
        
        # Generar imagen QR
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(str(datos_qr))
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Guardar imagen en memoria
        buffer = BytesIO()
        img.save(buffer)
        buffer.seek(0)
        
        # Crear objeto CodigoQR
        qr_code = CodigoQR(
            tipo='PRESTAMO',
            prestamo=prestamo,
            codigo=prestamo.codigo_qr
        )
        
        # Guardar imagen en el modelo
        qr_code.imagen_qr.save(f'prestamo_{prestamo.codigo_qr}.png', ContentFile(buffer.read()), save=True)
        
        return qr_code
    except Exception as e:
        print(f"Error al generar QR para préstamo: {str(e)}")
        return None

def enviar_correo_prestamo(prestamo, qr_code):
    """Envía un correo con el QR del préstamo"""
    try:
        # Obtener datos para el correo
        usuario = prestamo.usuario
        equipo = prestamo.equipo
        aula = prestamo.aula
        
        # Preparar el asunto y contenido del correo
        asunto = f'TecLoad - Confirmación de Préstamo #{prestamo.id}'
        
        # Renderizar el contenido HTML del correo
        contenido = render_to_string('gestion/emails/prestamo_confirmacion.html', {
            'usuario': usuario,
            'prestamo': prestamo,
            'equipo': equipo,
            'aula': aula
        })
        
        # Crear el correo
        email = EmailMessage(
            asunto,
            contenido,
            'tecload@example.com',  # Remitente
            [usuario.email]  # Destinatario
        )
        email.content_subtype = 'html'  # Especificar que el contenido es HTML
        
        # Adjuntar la imagen QR
        email.attach_file(qr_code.imagen_qr.path)
        
        # Enviar el correo
        email.send()
        
        # Marcar el QR como enviado
        qr_code.enviado = True
        qr_code.save()
        
        return True
    except Exception as e:
        print(f"Error al enviar correo de préstamo: {str(e)}")
        return False

def enviar_correo_devolucion(prestamo):
    """Envía un correo de confirmación de devolución"""
    try:
        # Obtener datos para el correo
        usuario = prestamo.usuario
        equipo = prestamo.equipo
        aula = prestamo.aula
        
        # Preparar el asunto y contenido del correo
        asunto = f'TecLoad - Confirmación de Devolución #{prestamo.id}'
        
        # Renderizar el contenido HTML del correo
        contenido = render_to_string('gestion/emails/devolucion_confirmacion.html', {
            'usuario': usuario,
            'prestamo': prestamo,
            'equipo': equipo,
            'aula': aula
        })
        
        # Crear el correo
        email = EmailMessage(
            asunto,
            contenido,
            'tecload@example.com',  # Remitente
            [usuario.email]  # Destinatario
        )
        email.content_subtype = 'html'  # Especificar que el contenido es HTML
        
        # Enviar el correo
        email.send()
        
        return True
    except Exception as e:
        print(f"Error al enviar correo de devolución: {str(e)}")
        return False

def eliminar_usuario(request, usuario_id):
    """Vista para eliminar un usuario mediante AJAX"""
    if request.method == 'POST':
        try:
            usuario = Usuario.objects.get(id=usuario_id)
            
            # Verificar si el usuario tiene préstamos activos
            if Prestamo.objects.filter(usuario=usuario, devuelto=False).exists():
                return JsonResponse({
                    'success': False, 
                    'message': 'No se puede eliminar el usuario porque tiene préstamos activos'
                })
            
            username = usuario.username
            usuario.delete()
            
            # Registrar la acción en el log
            LogActividad.objects.create(
                usuario=request.user,
                accion=f"Eliminó el usuario {username}"
            )
            
            return JsonResponse({'success': True, 'message': 'Usuario eliminado correctamente'})
        except Usuario.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Usuario no encontrado'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'Error: {str(e)}'})
    
    return JsonResponse({'success': False, 'message': 'Método no permitido'})