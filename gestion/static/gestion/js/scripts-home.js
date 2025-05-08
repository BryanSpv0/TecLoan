document.addEventListener('DOMContentLoaded', function() {
    // Navegación entre secciones
    const menuItems = document.querySelectorAll('.menu li');
    const sections = document.querySelectorAll('.section-content');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remover clase active de todos los elementos del menú
            menuItems.forEach(menuItem => {
                menuItem.classList.remove('active');
            });
            
            // Añadir clase active al elemento seleccionado
            this.classList.add('active');
            
            // Obtener la sección correspondiente
            const sectionId = this.getAttribute('data-section');
                
            // Ocultar todas las secciones
            sections.forEach(section => {
                section.classList.remove('active');
            });
            
            // Mostrar la sección seleccionada
            document.getElementById(sectionId).classList.add('active');
        });
    });
    
    // Cambio de tema (modo oscuro/claro)
    const themeToggle = document.querySelector('.theme-toggle');
    const body = document.body;
    
    themeToggle.addEventListener('click', function() {
        body.classList.toggle('dark-theme');
        
        // Cambiar el icono según el tema
        const icon = this.querySelector('i');
        if (body.classList.contains('dark-theme')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
        
        // Guardar preferencia en localStorage
        const isDarkTheme = body.classList.contains('dark-theme');
        localStorage.setItem('darkTheme', isDarkTheme);
    });
    
    // Cargar preferencia de tema al iniciar
    if (localStorage.getItem('darkTheme') === 'true') {
        body.classList.add('dark-theme');
        const icon = themeToggle.querySelector('i');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }
    
    // Funcionalidad de búsqueda 
    const searchInput = document.querySelector('.search-bar input'); 
    
    searchInput.addEventListener('input', function() { 
        const searchTerm = this.value.toLowerCase(); 
        const activeSection = document.querySelector('.section-content.active'); 
        
        if (activeSection) { 
            const sectionId = activeSection.id; 
            
            switch(sectionId) { 
                case 'equipment': 
                    filterTable('#equipment-table-body tr', searchTerm); 
                    break; 
                case 'classrooms': 
                    filterTable('#classroom-table-body tr', searchTerm); 
                    break; 
                case 'loans': 
                    filterTable('#loan-table-body tr', searchTerm); 
                    break; 
                case 'users': 
                    filterTable('#user-table-body tr', searchTerm); 
                    break; 
                case 'qr': 
                    filterCards('.qr-card', searchTerm); 
                    break; 
                case 'logs': 
                    filterTable('#logs-table-body tr', searchTerm); 
                    break; 
            } 
        } 
    }); 
    
    // Función para filtrar tablas 
    function filterTable(selector, term) { 
        const rows = document.querySelectorAll(selector); 
        
        rows.forEach(row => { 
            const text = row.textContent.toLowerCase(); 
            if (text.includes(term)) { 
                row.style.display = ''; 
            } else { 
                row.style.display = 'none'; 
            } 
        }); 
    }
    
    // Función para filtrar tarjetas
    function filterCards(selector, term) {
        const cards = document.querySelectorAll(selector);
        
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            if (text.includes(term)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    // ===== GESTIÓN DE EQUIPOS =====
    
    // Mostrar modal para agregar/editar equipo
    // Abrir modal para crear nuevo equipo
    const btnNuevoEquipo = document.getElementById('btn-nuevo-equipo');
    if (btnNuevoEquipo) {
        btnNuevoEquipo.addEventListener('click', function() {
            // Limpiar el formulario
            document.getElementById('form-equipo').reset();
            document.getElementById('equipo-id').value = '';
            document.getElementById('modal-equipo-title').textContent = 'Nuevo Equipo';
            
            // Mostrar el modal
            const equipoModal = new bootstrap.Modal(document.getElementById('modal-equipo'));
            equipoModal.show();
        });
    }
    
    // Cargar datos de un equipo para editar
    function cargarEquipo(equipoId) {
        fetch(`/gestion/equipos/obtener/${equipoId}/`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const equipo = data.equipo;
                    document.getElementById('equipo-id').value = equipo.id;
                    document.getElementById('nombre').value = equipo.nombre;
                    document.getElementById('descripcion').value = equipo.descripcion;
                    document.getElementById('disponible').checked = equipo.disponible;
                    
                    document.getElementById('modal-equipo-title').textContent = 'Editar Equipo';
                    
                    // Mostrar el modal
                    const equipoModal = new bootstrap.Modal(document.getElementById('modal-equipo'));
                    equipoModal.show();
                } else {
                    alert('Error al cargar el equipo: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error al cargar el equipo');
            });
    }
    
    // Asignar evento a los botones de editar
    document.querySelectorAll('.btn-editar-equipo').forEach(btn => {
        btn.addEventListener('click', function() {
            const equipoId = this.getAttribute('data-id');
            cargarEquipo(equipoId);
        });
    });
    
    // Guardar equipo (crear o actualizar)
    const formEquipo = document.getElementById('form-equipo');
    if (formEquipo) {
        formEquipo.addEventListener('submit', function(e) {
            e.preventDefault(); // Evitar que el formulario se envíe normalmente
            
            // Obtener el token CSRF
            const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
            
            // Crear FormData con los datos del formulario
            const formData = new FormData(this);
            
            // Enviar la solicitud
            fetch('/gestion/equipos/guardar/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': csrftoken
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(data.mensaje);
                    // Cerrar el modal
                    const equipoModal = bootstrap.Modal.getInstance(document.getElementById('modal-equipo'));
                    equipoModal.hide();
                    
                    // Recargar la página para ver los cambios
                    window.location.reload();
                } else {
                    alert('Error: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error al guardar el equipo');
            });
        });
    }
    
    // Eliminar equipo
    document.querySelectorAll('.btn-eliminar-equipo').forEach(btn => {
        btn.addEventListener('click', function() {
            if (confirm('¿Estás seguro de que deseas eliminar este equipo?')) {
                const equipoId = this.getAttribute('data-id');
                const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
                
                fetch(`/gestion/equipos/eliminar/${equipoId}/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrftoken
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert(data.mensaje);
                        // Recargar la página para ver los cambios
                        window.location.reload();
                    } else {
                        alert('Error: ' + data.error);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error al eliminar el equipo');
                });
            }
        });
    });
    
    // ===== GESTIÓN DE AULAS =====
    
    // Mostrar modal para agregar/editar aula
    const addClassroomBtn = document.querySelector('#add-classroom-btn');
    if (addClassroomBtn) {
        addClassroomBtn.addEventListener('click', function() {
            // Limpiar el formulario
            document.querySelector('#classroom-form').reset();
            document.querySelector('#classroom-id').value = '';
            document.querySelector('#classroom-modal-title').textContent = 'Registrar Nueva Aula';
            
            // Mostrar el modal
            document.querySelector('#classroom-modal').classList.add('show');
        });
    }
    
    // Guardar aula (crear/actualizar)
    const classroomForm = document.querySelector('#classroom-form');
    if (classroomForm) {
        classroomForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const classroomId = document.querySelector('#classroom-id').value;
            const formData = new FormData(this);
            
            // Enviar datos al servidor
            fetch(`/gestion/aulas/guardar/`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Cerrar modal
                    document.querySelector('#classroom-modal').classList.remove('show');
                    
                    // Mostrar mensaje de éxito
                    showNotification(data.message, 'success');
                    
                    // Recargar la página para ver los cambios
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                } else {
                    showNotification(data.message, 'error');
                }
            })
            .catch(error => {
                showNotification('Error al procesar la solicitud', 'error');
            });
        });
    }

    // Editar aula
    document.querySelectorAll('.edit-classroom-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const classroomId = this.getAttribute('data-id');
            
            // Obtener datos del aula
            fetch(`/gestion/aulas/obtener/${classroomId}/`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Llenar el formulario con los datos
                    document.querySelector('#classroom-id').value = data.aula.id;
                    document.querySelector('#classroom-name').value = data.aula.nombre;
                    document.querySelector('#classroom-capacity').value = data.aula.capacidad;
                    document.querySelector('#classroom-available').value = data.aula.disponible.toString();
                    
                    // Cambiar el título del modal
                    document.querySelector('#classroom-modal-title').textContent = 'Editar Aula';
                    
                    // Mostrar el modal
                    document.querySelector('#classroom-modal').classList.add('show');
                } else {
                    showNotification(data.message, 'error');
                }
            })
            .catch(error => {
                showNotification('Error al obtener los datos del aula', 'error');
            });
        });
    });
    
    // ===== GESTIÓN DE PRÉSTAMOS =====
    
    // Mostrar modal para agregar/editar préstamo
    const addLoanBtn = document.querySelector('#add-loan-btn');
    if (addLoanBtn) {
        addLoanBtn.addEventListener('click', function() {
            // Limpiar el formulario
            document.querySelector('#loan-form').reset();
            document.querySelector('#loan-id').value = '';
            document.querySelector('#loan-modal-title').textContent = 'Registrar Nuevo Préstamo';
            
            // Mostrar el modal
            document.querySelector('#loan-modal').classList.add('show');
        });
    }
    
    // Validar disponibilidad de equipo/aula antes de préstamo
    const equipoSelect = document.querySelector('#loan-equipment');
    const aulaSelect = document.querySelector('#loan-classroom');
    
    if (equipoSelect) {
        equipoSelect.addEventListener('change', function() {
            const equipoId = this.value;
            if (equipoId) {
                fetch(`/gestion/equipos/obtener/${equipoId}/`, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        if (!data.equipo.disponible) {
                            showNotification('Este equipo no está disponible actualmente', 'warning');
                            this.value = '';
                        }
                    }
                });
            }
        });
    }
    
    if (aulaSelect) {
        aulaSelect.addEventListener('change', function() {
            const aulaId = this.value;
            if (aulaId) {
                fetch(`/gestion/aulas/obtener/${aulaId}/`, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        if (!data.aula.disponible) {
                            showNotification('Esta aula no está disponible actualmente', 'warning');
                            this.value = '';
                        }
                    }
                });
            }
        });
    }
    
    // Confirmar devolución de préstamo
    document.querySelectorAll('.return-loan-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (confirm('¿Confirmar la devolución de este préstamo?')) {
                const loanId = this.getAttribute('data-id');
                const formData = new FormData();
                formData.append('id', loanId);
                formData.append('devuelto', true);
                
                fetch(`/gestion/prestamos/guardar/`, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRFToken': getCookie('csrftoken')
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showNotification(data.message, 'success');
                        // Actualizar estado en la tabla
                        const row = this.closest('tr');
                        row.querySelector('.loan-status').textContent = 'Devuelto';
                        row.querySelector('.loan-status').className = 'loan-status status-returned';
                        this.style.display = 'none';
                    } else {
                        showNotification(data.message, 'error');
                    }
                })
                .catch(error => {
                    showNotification('Error al procesar la devolución', 'error');
                });
            }
        });
    });
    
    // ===== GESTIÓN DE USUARIOS =====
    
    // Mostrar modal para agregar usuario
    const addUserBtn = document.querySelector('#add-user-btn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function() {
            // Limpiar el formulario
            document.querySelector('#user-form').reset();
            document.querySelector('#user-id').value = '';
            document.querySelector('#user-modal-title').textContent = 'Registrar Nuevo Usuario';
            
            // Mostrar el modal
            document.querySelector('#user-modal').classList.add('show');
        });
    }
    
    // Manejar clic en botones de editar usuario
    const editUserBtns = document.querySelectorAll('.edit-user-btn');
    editUserBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            
            // Obtener datos del usuario mediante AJAX
            fetch(`/gestion/usuarios/obtener/${userId}/`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Llenar el formulario con los datos del usuario
                    const user = data.usuario;
                    document.querySelector('#user-id').value = user.id;
                    document.querySelector('#username').value = user.username;
                    document.querySelector('#first_name').value = user.first_name;
                    document.querySelector('#last_name').value = user.last_name;
                    document.querySelector('#email').value = user.email;
                    document.querySelector('#documento').value = user.documento;
                    document.querySelector('#telefono').value = user.telefono;
                    document.querySelector('#tipo_usuario').value = user.tipo_usuario;
                    
                    // Limpiar el campo de contraseña
                    document.querySelector('#password').value = '';
                    
                    // Cambiar el título del modal
                    document.querySelector('#user-modal-title').textContent = 'Editar Usuario';
                    
                    // Mostrar el modal
                    document.querySelector('#user-modal').classList.add('show');
                } else {
                    showNotification(data.message || 'Error al obtener datos del usuario', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error de conexión al obtener datos del usuario', 'error');
            });
        });
    });
    
    // Manejar clic en botones de eliminar usuario
    const deleteUserBtns = document.querySelectorAll('.delete-user-btn');
    deleteUserBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            const userName = this.closest('tr').querySelector('td:first-child').textContent;
            
            if (confirm(`¿Estás seguro de que deseas eliminar al usuario "${userName}"? Esta acción no se puede deshacer.`)) {
                // Realizar petición AJAX para eliminar el usuario
                fetch(`/gestion/usuarios/eliminar/${userId}/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken'),
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showNotification(data.message || 'Usuario eliminado correctamente', 'success');
                        // Recargar la página para actualizar la lista de usuarios
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    } else {
                        showNotification(data.message || 'Error al eliminar el usuario', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showNotification('Error de conexión al eliminar el usuario', 'error');
                });
            }
        });
    });

    // Manejar envío del formulario de usuario
    const userForm = document.querySelector('#user-form');
    if (userForm) {
        userForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Obtener datos del formulario
            const formData = new FormData(this);
            const userId = document.querySelector('#user-id').value;
            
            // Realizar petición AJAX para guardar el usuario
            fetch('/gestion/usuarios/guardar/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification(data.message || 'Usuario guardado correctamente', 'success');
                    // Cerrar el modal
                    document.querySelector('#user-modal').classList.remove('show');
                    // Recargar la página para actualizar la lista de usuarios
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showNotification(data.message || 'Error al guardar el usuario', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error de conexión al guardar el usuario', 'error');
            });
        });
    }

    // Función para obtener el valor de una cookie (para CSRF)
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }


    
    // ===== CÓDIGOS QR =====
    
    // Descargar código QR
    document.querySelectorAll('.download-qr-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const qrImage = this.closest('.qr-card').querySelector('img').src;
            const link = document.createElement('a');
            link.href = qrImage;
            link.download = 'codigo_qr.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    });
    
    // ===== FUNCIONES UTILITARIAS =====
    
    // Función para mostrar notificaciones
    window.showNotification = function(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
                <p>${message}</p>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Mostrar la notificación
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Ocultar la notificación después de 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
        
        // Cerrar notificación al hacer clic en el botón de cerrar
        notification.querySelector('.notification-close').addEventListener('click', function() {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        });
    }
    
    // Función para obtener el valor de una cookie
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    
    // Inicializar datepickers para campos de fecha
    const datepickers = document.querySelectorAll('.datepicker');
    if (datepickers.length > 0) {
        datepickers.forEach(picker => {
            picker.addEventListener('focus', function() {
                this.type = 'date';
            });
            picker.addEventListener('blur', function() {
                if (!this.value) {
                    this.type = 'text';
                }
            });
        });
    }
    
    // Exportar a Excel/PDF
    const exportButtons = document.querySelectorAll('.export-btn');
    if (exportButtons.length > 0) {
        exportButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const format = this.getAttribute('data-format');
                const section = this.getAttribute('data-section');
                
                // Implementar lógica de exportación según el formato y la sección
                alert(`Exportando ${section} en formato ${format}. Esta función está en desarrollo.`);
            });
        });
    }
    
    // Escanear código QR (simulado)
    const scanQrBtn = document.querySelector('#scan-qr-btn');
    if (scanQrBtn) {
        scanQrBtn.addEventListener('click', function() {
            // Aquí se implementaría la integración con la cámara para escanear QR
            // Por ahora, simulamos con un prompt
            const qrCode = prompt('Ingresa el código QR (simulado):');
            if (qrCode) {
                // Buscar préstamo por código QR
                fetch(`/gestion/prestamos/buscar-qr/${qrCode}/`, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showNotification(`Préstamo encontrado: ${data.prestamo.id}`, 'success');
                    } else {
                        showNotification('Código QR no válido o no encontrado', 'error');
                    }
                })
                .catch(error => {
                    showNotification('Error al procesar el código QR', 'error');
                });
            }
        });
    }
});


// Cargar datos de préstamos 
function loadLoanData() { 
    const tableBody = document.querySelector('#loan-table-body'); 
    if (!tableBody) return; 
    
    fetch('/api/prestamos/') 
        .then(response => response.json()) 
        .then(data => { 
            tableBody.innerHTML = ''; 
            
            if (data.length === 0) { 
                const emptyRow = document.createElement('tr'); 
                emptyRow.innerHTML = '<td colspan="7" class="text-center">No hay préstamos registrados</td>'; 
                tableBody.appendChild(emptyRow); 
                return; 
            } 
            
            data.forEach(prestamo => { 
                const row = document.createElement('tr'); 
                
                // Determinar el estado del préstamo 
                let statusClass = 'active'; 
                let statusText = 'Activo'; 
                
                if (prestamo.devuelto) { 
                    statusClass = 'returned'; 
                    statusText = 'Devuelto'; 
                } else if (new Date(prestamo.fecha_devolucion_esperada) < new Date()) { 
                    statusClass = 'overdue'; 
                    statusText = 'Vencido'; 
                } 
                
                row.innerHTML = ` 
                    <td>${prestamo.id}</td> 
                    <td>${prestamo.usuario_nombre}</td> 
                    <td>${prestamo.equipo_nombre || prestamo.aula_nombre || 'N/A'}</td> 
                    <td>${formatDate(prestamo.fecha_prestamo)}</td> 
                    <td>${formatDate(prestamo.fecha_devolucion_esperada)}</td> 
                    <td><span class="status ${statusClass}">${statusText}</span></td> 
                    <td> 
                        <div class="actions"> 
                            <button class="btn-edit" data-id="${prestamo.id}"><i class="fas fa-edit"></i></button> 
                            <button class="btn-delete" data-id="${prestamo.id}"><i class="fas fa-trash"></i></button> 
                            ${!prestamo.devuelto ? `<button class="btn-return" data-id="${prestamo.id}"><i class="fas fa-undo"></i></button>` : ''} 
                        </div> 
                    </td> 
                `; 
                tableBody.appendChild(row); 
            }); 
            
            // Configurar eventos para botones de acción 
            setupLoanActionButtons(); 
        }) 
        .catch(error => { 
            console.error('Error al cargar préstamos:', error); 
            showNotification('Error al cargar los préstamos', 'error'); 
        }); 
} 

// Configurar botones de acción para préstamos 
function setupLoanActionButtons() {
    // Botones de edición
    document.querySelectorAll('#loan-table-body .btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const loanId = this.getAttribute('data-id');
            editLoan(loanId);
        });
    });
    
    // Botones de eliminación
    document.querySelectorAll('#loan-table-body .btn-delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const loanId = this.getAttribute('data-id');
            deleteLoan(loanId);
        });
    });
    
    // Botones de devolución
    document.querySelectorAll('#loan-table-body .btn-return').forEach(btn => {
        btn.addEventListener('click', function() {
            const loanId = this.getAttribute('data-id');
            returnLoan(loanId);
        });
    });
}

// Función para editar un préstamo
function editLoan(loanId) {
    fetch(`/api/prestamos/${loanId}/`)
        .then(response => response.json())
        .then(data => {
            // Llenar el formulario con los datos del préstamo
            const form = document.querySelector('#loan-form');
            if (!form) {
                showNotification('Error: Formulario de préstamos no encontrado', 'error');
                return;
            }
            
            // Establecer el ID del préstamo
            document.querySelector('#loan-id').value = data.id;
            
            // Seleccionar el usuario
            const userSelect = document.querySelector('#loan-user');
            if (userSelect) {
                Array.from(userSelect.options).forEach(option => {
                    if (option.value == data.usuario) {
                        option.selected = true;
                    }
                });
            }
            
            // Establecer el tipo de préstamo (equipo o aula)
            const tipoPrestamoRadios = document.querySelectorAll('input[name="tipo_prestamo"]');
            if (data.equipo) {
                tipoPrestamoRadios[0].checked = true;
                // Mostrar selector de equipos y ocultar selector de aulas
                document.querySelector('#equipment-select-container').style.display = 'block';
                document.querySelector('#classroom-select-container').style.display = 'none';
                
                // Seleccionar el equipo
                const equipmentSelect = document.querySelector('#loan-equipment');
                if (equipmentSelect) {
                    Array.from(equipmentSelect.options).forEach(option => {
                        if (option.value == data.equipo) {
                            option.selected = true;
                        }
                    });
                }
            } else if (data.aula) {
                tipoPrestamoRadios[1].checked = true;
                // Mostrar selector de aulas y ocultar selector de equipos
                document.querySelector('#equipment-select-container').style.display = 'none';
                document.querySelector('#classroom-select-container').style.display = 'block';
                
                // Seleccionar el aula
                const classroomSelect = document.querySelector('#loan-classroom');
                if (classroomSelect) {
                    Array.from(classroomSelect.options).forEach(option => {
                        if (option.value == data.aula) {
                            option.selected = true;
                        }
                    });
                }
            }
            
            // Establecer fechas
            document.querySelector('#loan-date').value = formatDateForInput(data.fecha_prestamo);
            document.querySelector('#return-date').value = formatDateForInput(data.fecha_devolucion_esperada);
            
            // Cambiar el título del modal
            document.querySelector('#loan-modal-title').textContent = 'Editar Préstamo';
            
            // Mostrar el modal
            document.querySelector('#loan-modal').classList.add('show');
        })
        .catch(error => {
            console.error('Error al cargar datos del préstamo:', error);
            showNotification('Error al cargar los datos del préstamo', 'error');
        });
}

// Función para eliminar un préstamo
function deleteLoan(loanId) {
    if (confirm('¿Está seguro de que desea eliminar este préstamo? Esta acción no se puede deshacer.')) {
        const csrfToken = getCookie('csrftoken');
        
        fetch(`/api/prestamos/${loanId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': csrfToken
            }
        })
        .then(response => {
            if (response.ok) {
                showNotification('Préstamo eliminado correctamente', 'success');
                loadLoanData(); // Recargar la tabla
            } else {
                throw new Error('Error al eliminar el préstamo');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error al eliminar el préstamo', 'error');
        });
    }
}

// Función para registrar la devolución de un préstamo
function returnLoan(loanId) {
    const csrfToken = getCookie('csrftoken');
    
    fetch(`/api/prestamos/${loanId}/devolver/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
            fecha_devolucion: new Date().toISOString()
        })
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('Error al registrar la devolución');
        }
    })
    .then(data => {
        showNotification('Devolución registrada correctamente', 'success');
        loadLoanData(); // Recargar la tabla
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error al registrar la devolución', 'error');
    });
}

// Función para formatear fechas para mostrar en la tabla
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Función para formatear fechas para inputs de tipo datetime-local
function formatDateForInput(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Cargar datos al iniciar
loadLoanData();

// Configurar el formulario de préstamos
const loanForm = document.querySelector('#loan-form');
if (loanForm) {
    // Cambiar entre equipo y aula según el tipo de préstamo seleccionado
    const tipoPrestamoRadios = document.querySelectorAll('input[name="tipo_prestamo"]');
    const equipmentContainer = document.querySelector('#equipment-select-container');
    const classroomContainer = document.querySelector('#classroom-select-container');
    
    tipoPrestamoRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'equipo') {
                equipmentContainer.style.display = 'block';
                classroomContainer.style.display = 'none';
            } else if (this.value === 'aula') {
                equipmentContainer.style.display = 'none';
                classroomContainer.style.display = 'block';
            }
        });
    });
    
    // Manejar el envío del formulario
    loanForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const loanId = document.querySelector('#loan-id').value;
        const isNewLoan = !loanId;
        
        const formData = new FormData(this);
        const loanData = {
            usuario: formData.get('usuario'),
            fecha_prestamo: formData.get('fecha_prestamo'),
            fecha_devolucion_esperada: formData.get('fecha_devolucion_esperada')
        };
        
        // Agregar equipo o aula según el tipo de préstamo
        const tipoPrestamo = formData.get('tipo_prestamo');
        if (tipoPrestamo === 'equipo') {
            loanData.equipo = formData.get('equipo');
            loanData.aula = null;
        } else if (tipoPrestamo === 'aula') {
            loanData.aula = formData.get('aula');
            loanData.equipo = null;
        }
        
        const csrfToken = getCookie('csrftoken');
        const url = isNewLoan ? '/api/prestamos/' : `/api/prestamos/${loanId}/`;
        const method = isNewLoan ? 'POST' : 'PUT';
        
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify(loanData)
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Error al guardar el préstamo');
            }
        })
        .then(data => {
            showNotification(isNewLoan ? 'Préstamo registrado correctamente' : 'Préstamo actualizado correctamente', 'success');
            document.querySelector('#loan-modal').classList.remove('show');
            loadLoanData(); // Recargar la tabla
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error al guardar el préstamo', 'error');
        });
    });
}

// Función para formatear fechas para inputs de tipo datetime-local
function formatDateForInput(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}
