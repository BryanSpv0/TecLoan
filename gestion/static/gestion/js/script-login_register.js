document.addEventListener('DOMContentLoaded', function() {
    const signInBtn = document.querySelector("#sign-in-btn");
    const signUpBtn = document.querySelector("#sign-up-btn");
    const container = document.querySelector(".container");
    const closeButton = document.querySelector(".close-button");
    const modal = document.querySelector(".modal");
    const tipoUsuarioSelect = document.querySelector("#tipo_usuario_registro");
    const carreraField = document.querySelector(".carrera-field");

    // Mostrar/ocultar campo de carrera según el rol seleccionado
    if (tipoUsuarioSelect) {
        tipoUsuarioSelect.addEventListener("change", function() {
            if (this.value === "APRENDIZ") {
                carreraField.style.display = "grid";
                carreraField.querySelector("input").required = true;
            } else {
                carreraField.style.display = "none";
                carreraField.querySelector("input").required = false;
            }
        });
    }

    // Cambiar entre formularios
    if (signUpBtn) {
        signUpBtn.addEventListener("click", () => {
            container.classList.add("sign-up-mode");
        });
    }

    if (signInBtn) {
        signInBtn.addEventListener("click", () => {
            container.classList.remove("sign-up-mode");
        });
    }

    // Cerrar modal
    if (closeButton && modal) {
        closeButton.addEventListener("click", () => {
            modal.style.display = "none";
        });

        // También cerrar al hacer clic fuera del modal
        window.addEventListener("click", (e) => {
            if (e.target == modal) {
                modal.style.display = "none";
            }
        });

        // Cerrar automáticamente después de 5 segundos
        setTimeout(() => {
            if (modal) {
                modal.style.display = "none";
            }
        }, 5000);
    }

    // Validación de formularios
    const forms = document.querySelectorAll('form');
    // Añadir al final, antes del cierre de la función principal
    forms.forEach(form => {
        form.addEventListener('submit', function() {
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                const originalText = submitButton.textContent;
                submitButton.textContent = '';
                submitButton.classList.add('loading');
                
                // Restaurar después de 2 segundos si el formulario no se envió
                setTimeout(() => {
                    if (document.body.contains(submitButton)) {
                        submitButton.textContent = originalText;
                        submitButton.classList.remove('loading');
                    }
                }, 2000);
            }
        });
    });
    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            const emailInput = form.querySelector('input[name="email"]');
            const passwordInput = form.querySelector('input[name="password"]');
            const telefonoInput = form.querySelector('input[name="telefono"]');
            const documentoInput = form.querySelector('input[name="documento"]');
            
            // Validar email
            if (emailInput && !isValidEmail(emailInput.value)) {
                event.preventDefault();
                showError(emailInput, 'Por favor, introduce un correo electrónico válido');
            }
            
            // Validar contraseña
            if (passwordInput && passwordInput.value.length < 6) {
                event.preventDefault();
                showError(passwordInput, 'La contraseña debe tener al menos 6 caracteres');
            }
            
            // Validar teléfono (si existe)
            if (telefonoInput && telefonoInput.value) {
                const phonePattern = /^[0-9]{10}$/;
                if (!phonePattern.test(telefonoInput.value)) {
                    event.preventDefault();
                    showError(telefonoInput, 'Ingresa un número de teléfono válido de 10 dígitos');
                }
            }
            
            // Validar documento (si existe)
            if (documentoInput && documentoInput.value) {
                const docPattern = /^[0-9]{8,12}$/;
                if (!docPattern.test(documentoInput.value)) {
                    event.preventDefault();
                    showError(documentoInput, 'Ingresa un número de documento válido (entre 8 y 12 dígitos)');
                }
            }
        });
    });

    // Función para validar email
    function isValidEmail(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    // Función para mostrar errores
    function showError(input, message) {
        const formControl = input.parentElement;
        formControl.classList.add('error');
        
        // Crear elemento para el mensaje de error si no existe
        let errorElement = formControl.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('small');
            errorElement.className = 'error-message';
            errorElement.style.color = '#ff3860';
            errorElement.style.position = 'absolute';
            errorElement.style.bottom = '-20px';
            errorElement.style.left = '15px';
            formControl.appendChild(errorElement);
        }
        
        errorElement.innerText = message;
        
        // Quitar el mensaje después de 3 segundos
        setTimeout(() => {
            errorElement.innerText = '';
            formControl.classList.remove('error');
        }, 3000);
    }
});