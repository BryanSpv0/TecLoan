function reproducirSonido() {
    document.getElementById("soundEffect").play();
}
function iniciarJuego() {
    const cantidadJugadores = document.getElementById("cantidadJugadores").value;
    if (!cantidadJugadores) {
        alert("Por favor, selecciona la cantidad de jugadores");
        return;
    }

    let nombresJugadores = [];
    for (let i = 1; i <= cantidadJugadores; i++) {
        const apodo = document.getElementById(`apodoJugador${i}`).value.trim();
        if (!apodo) {
            alert(`Por favor, ingresa el apodo para el Jugador ${i}`);
            return;
        }
        nombresJugadores.push(apodo);
    }

    // CAMBIO AQUÍ: Usamos sessionStorage en vez de localStorage
    sessionStorage.setItem('cantidadJugadores', cantidadJugadores);
    sessionStorage.setItem('nombresJugadores', JSON.stringify(nombresJugadores));

    // Redirigir al tablero
    window.location.href = "/tablero/";
}

function mostrarCamposApodos() {
    const cantidadJugadores = document.getElementById("cantidadJugadores").value;
    const contenedorApodos = document.getElementById("contenedorApodos");
    contenedorApodos.innerHTML = '';
    if (!cantidadJugadores) return;
    for (let i = 1; i <= cantidadJugadores; i++) {
        const div = document.createElement('div');
        div.className = 'mb-3';
        div.innerHTML = `
            <label for="apodoJugador${i}" class="form-label">Apodo del Jugador ${i}</label>
            <input type="text" class="form-control" id="apodoJugador${i}" required>
        `;
        contenedorApodos.appendChild(div);
    }
}
// Mostrar/ocultar el menú de usuario personalizado
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('show');
}

// Cerrar el menú si se hace clic fuera de él
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('userDropdown');
    const avatarBtn = document.querySelector('.avatar-button');
    if (dropdown && !dropdown.contains(event.target) && !avatarBtn.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});


