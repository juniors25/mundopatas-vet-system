// Sistema Veterinario - JavaScript Frontend

// Variables globales
let clientes = [];
let mascotas = [];

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        window.location.href = '/';
        return;
    }
    
    showSection('dashboard');
    loadDashboardData();
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    // Formulario de clientes
    document.getElementById('cliente-form').addEventListener('submit', handleClienteSubmit);
    
    // Formulario de mascotas
    document.getElementById('mascota-form').addEventListener('submit', handleMascotaSubmit);
    
    // Formulario de consultas
    document.getElementById('consulta-form').addEventListener('submit', handleConsultaSubmit);
    
    // Formulario de análisis
    document.getElementById('analisis-form').addEventListener('submit', handleAnalisisSubmit);
    
    // Formulario de vacunas
    document.getElementById('vacuna-form').addEventListener('submit', handleVacunaSubmit);
    
    // Cambio de mascota en consultas
    document.querySelector('#consultas-section select[name="mascota_id"]').addEventListener('change', function() {
        if (this.value) {
            loadConsultasHistorial(this.value);
        }
    });
    
    // Cambio de mascota en análisis
    document.querySelector('#analisis-section select[name="mascota_id"]').addEventListener('change', function() {
        if (this.value) {
            loadAnalisisHistorial(this.value);
        }
    });
    
    // Cambio de mascota en vacunas
    document.querySelector('#vacunas-section select[name="mascota_id"]').addEventListener('change', function() {
        if (this.value) {
            loadVacunasHistorial(this.value);
        }
    });
    
    // Filtro de mascota en vacunas
    document.getElementById('filtro-mascota-vacunas').addEventListener('change', function() {
        if (this.value) {
            loadVacunasHistorial(this.value);
        } else {
            document.getElementById('vacunas-historial').innerHTML = '<p class="text-muted">Selecciona una mascota para ver su historial de vacunación.</p>';
        }
    });
    
    // Cambio en select de vacuna para mostrar campo "otra"
    document.querySelector('select[name="nombre_vacuna"]').addEventListener('change', function() {
        const otraDiv = document.getElementById('otra-vacuna-div');
        if (this.value === 'Otra') {
            otraDiv.style.display = 'block';
            document.querySelector('input[name="otra_vacuna"]').required = true;
        } else {
            otraDiv.style.display = 'none';
            document.querySelector('input[name="otra_vacuna"]').required = false;
        }
    });
}

// Mostrar sección
function showSection(sectionName) {
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Mostrar sección seleccionada
    document.getElementById(sectionName + '-section').style.display = 'block';
    
    // Cargar datos según la sección
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'clientes':
            loadClientes();
            break;
        case 'mascotas':
            loadMascotas();
            loadClientesSelect();
            break;
        case 'consultas':
            loadMascotasSelect('#consultas-section');
            break;
        case 'analisis':
            loadMascotasSelect('#analisis-section');
            break;
        case 'vacunas':
            loadMascotasSelect('#vacunas-section');
            loadMascotasSelectForFilter();
            break;
        case 'informes':
            loadMascotasSelect('#informes-section');
            break;
    }
}

// Cargar datos del dashboard
async function loadDashboardData() {
    try {
        const token = localStorage.getItem('token');
        const [clientesRes, mascotasRes] = await Promise.all([
            fetch('/api/clientes', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/mascotas', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);
        
        const clientesData = await clientesRes.json();
        const mascotasData = await mascotasRes.json();
        
        document.getElementById('total-clientes').textContent = clientesData.length;
        document.getElementById('total-mascotas').textContent = mascotasData.length;
        
        // Aquí podrías agregar más estadísticas
        document.getElementById('total-consultas').textContent = '0';
        document.getElementById('total-analisis').textContent = '0';
        
    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
}

// Manejar envío de formulario de cliente
async function handleClienteSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    const clienteId = data.cliente_id;
    const isEditing = clienteId && clienteId !== '';
    
    // Remover cliente_id del objeto data ya que no es parte del body
    delete data.cliente_id;
    
    try {
        const token = localStorage.getItem('token');
        const url = isEditing ? `/api/clientes/${clienteId}` : '/api/clientes';
        const method = isEditing ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage(isEditing ? 'Cliente actualizado exitosamente' : 'Cliente registrado exitosamente', 'success');
            e.target.reset();
            cancelarEdicionCliente();
            loadClientes();
            loadDashboardData();
        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showMessage('Error de conexión', 'error');
    }
}

// Función para editar cliente
function editarCliente(clienteId) {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) {
        showMessage('Cliente no encontrado', 'error');
        return;
    }
    
    // Llenar el formulario con los datos del cliente
    document.getElementById('cliente_id').value = cliente.id;
    document.querySelector('#cliente-form input[name="nombre"]').value = cliente.nombre;
    document.querySelector('#cliente-form input[name="apellido"]').value = cliente.apellido;
    document.querySelector('#cliente-form input[name="email"]').value = cliente.email || '';
    document.querySelector('#cliente-form input[name="telefono"]').value = cliente.telefono || '';
    document.querySelector('#cliente-form input[name="direccion"]').value = cliente.direccion || '';
    document.querySelector('#cliente-form input[name="password_portal"]').value = cliente.password_portal || '';
    
    // Cambiar el título y botón del formulario
    document.getElementById('cliente-form-title').innerHTML = '<i class="fas fa-user-edit me-2"></i>Editar Cliente';
    document.getElementById('cliente-submit-btn').innerHTML = '<i class="fas fa-save me-1"></i>Actualizar Cliente';
    document.getElementById('cliente-cancel-btn').style.display = 'inline-block';
    
    // Scroll al formulario
    document.querySelector('#clientes-section .card').scrollIntoView({ behavior: 'smooth' });
}

// Función para cancelar edición de cliente
function cancelarEdicionCliente() {
    document.getElementById('cliente-form').reset();
    document.getElementById('cliente_id').value = '';
    document.getElementById('cliente-form-title').innerHTML = '<i class="fas fa-user-plus me-2"></i>Registrar Cliente';
    document.getElementById('cliente-submit-btn').innerHTML = '<i class="fas fa-save me-1"></i>Registrar Cliente';
    document.getElementById('cliente-cancel-btn').style.display = 'none';
}

// Manejar envío de formulario de mascota
async function handleMascotaSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/mascotas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('Mascota registrada exitosamente', 'success');
            e.target.reset();
            loadMascotas();
        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showMessage('Error de conexión', 'error');
    }
}

// Manejar envío de formulario de consulta
async function handleConsultaSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/consultas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('Consulta registrada exitosamente', 'success');
            e.target.reset();
            if (data.mascota_id) {
                loadConsultasHistorial(data.mascota_id);
            }
        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showMessage('Error de conexión', 'error');
    }
}

// Manejar envío de formulario de análisis
async function handleAnalisisSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const token = localStorage.getItem('token');
        formData.append('Authorization', `Bearer ${token}`);
        
        const response = await fetch('/api/analisis', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('Análisis registrado exitosamente', 'success');
            e.target.reset();
            const mascotaId = formData.get('mascota_id');
            if (mascotaId) {
                loadAnalisisHistorial(mascotaId);
            }
        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showMessage('Error de conexión', 'error');
    }
}

// Cargar clientes con sus mascotas
async function loadClientes() {
    try {
        const token = localStorage.getItem('token');
        console.log('🔑 Token disponible:', !!token);
        
        if (!token) {
            showMessage('No hay token de autenticación. Por favor inicia sesión nuevamente.', 'error');
            window.location.href = '/';
            return;
        }
        
        console.log('📡 Cargando clientes con mascotas...');
        const response = await fetch('/api/clientes-con-mascotas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📊 Respuesta del servidor:', response.status);
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                showMessage('Sesión expirada. Por favor inicia sesión nuevamente.', 'error');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
                return;
            }
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const clientesConMascotas = await response.json();
        console.log('👥 Clientes cargados:', clientesConMascotas.length);
        
        // Actualizar variable global de clientes
        clientes = clientesConMascotas;
        
        const tbody = document.getElementById('clientes-table');
        tbody.innerHTML = '';
        
        if (clientesConMascotas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        <i class="fas fa-users fa-3x mb-3"></i>
                        <br>No hay clientes registrados aún.
                        <br><small>Registra tu primer cliente para comenzar.</small>
                    </td>
                </tr>
            `;
            return;
        }
        
        clientesConMascotas.forEach(cliente => {
            const row = document.createElement('tr');
            const numMascotas = cliente.mascotas ? cliente.mascotas.length : 0;
            const passwordPortal = cliente.password_portal || '-';
            row.innerHTML = `
                <td>
                    <strong>${cliente.nombre} ${cliente.apellido}</strong>
                    <br><small class="text-muted">${numMascotas} mascota${numMascotas !== 1 ? 's' : ''}</small>
                </td>
                <td>${cliente.telefono || '-'}</td>
                <td>${cliente.email || '-'}</td>
                <td>
                    <span class="badge bg-info">${passwordPortal}</span>
                </td>
                <td>
                    ${new Date(cliente.fecha_registro).toLocaleDateString()}
                </td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary" onclick="editarCliente(${cliente.id})" title="Editar cliente">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-info" onclick="verMascotasCliente(${cliente.id})" title="Ver mascotas">
                            <i class="fas fa-paw"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        console.log('✅ Clientes mostrados correctamente');
        
    } catch (error) {
        console.error('❌ Error cargando clientes:', error);
        showMessage('Error cargando clientes: ' + error.message, 'error');
    }
}

// Cargar mascotas
async function loadMascotas() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/mascotas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        mascotas = await response.json();
        
        const tbody = document.getElementById('mascotas-table');
        tbody.innerHTML = '';
        
        mascotas.forEach(mascota => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${mascota.nombre}</td>
                <td>${mascota.especie}</td>
                <td>${mascota.raza || '-'}</td>
                <td>${mascota.cliente_nombre} ${mascota.cliente_apellido}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="verDetallesMascota(${mascota.id})">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error cargando mascotas:', error);
    }
}

// Cargar clientes en select
async function loadClientesSelect() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/clientes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const clientesData = await response.json();
        
        const selects = document.querySelectorAll('select[name="cliente_id"]');
        
        selects.forEach(select => {
            select.innerHTML = '<option value="">Seleccionar cliente...</option>';
            
            clientesData.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.id;
                option.textContent = `${cliente.nombre} ${cliente.apellido}`;
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error cargando clientes:', error);
        showMessage('Error cargando clientes para selección', 'error');
    }
}

// Cargar mascotas en select
async function loadMascotasSelect(section) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/mascotas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const mascotas = await response.json();
        
        const selects = document.querySelectorAll(`${section} select[name="mascota_id"], ${section} #informe-mascota`);
        
        selects.forEach(select => {
            select.innerHTML = '<option value="">Seleccionar mascota...</option>';
            
            mascotas.forEach(mascota => {
                const option = document.createElement('option');
                option.value = mascota.id;
                option.textContent = `${mascota.nombre} (${mascota.cliente_nombre} ${mascota.cliente_apellido})`;
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error cargando mascotas:', error);
    }
}

// Cargar historial de consultas
async function loadConsultasHistorial(mascotaId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/consultas/${mascotaId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const consultas = await response.json();
        
        const container = document.getElementById('consultas-historial');
        
        if (consultas.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay consultas registradas para esta mascota.</p>';
            return;
        }
        
        let html = '';
        consultas.forEach(consulta => {
            html += `
                <div class="card mb-3">
                    <div class="card-body">
                        <h6 class="card-title">
                            <i class="fas fa-calendar me-2"></i>
                            ${new Date(consulta.fecha_consulta).toLocaleString()}
                        </h6>
                        <p><strong>Motivo:</strong> ${consulta.motivo}</p>
                        ${consulta.diagnostico ? `<p><strong>Diagnóstico:</strong> ${consulta.diagnostico}</p>` : ''}
                        ${consulta.tratamiento ? `<p><strong>Tratamiento:</strong> ${consulta.tratamiento}</p>` : ''}
                        ${consulta.peso_actual ? `<p><strong>Peso:</strong> ${consulta.peso_actual} kg</p>` : ''}
                        ${consulta.temperatura ? `<p><strong>Temperatura:</strong> ${consulta.temperatura} °C</p>` : ''}
                        ${consulta.observaciones ? `<p><strong>Observaciones:</strong> ${consulta.observaciones}</p>` : ''}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error cargando consultas:', error);
    }
}

// Cargar historial de análisis
async function loadAnalisisHistorial(mascotaId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/analisis/${mascotaId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const analisis = await response.json();
        
        const container = document.getElementById('analisis-historial');
        
        if (analisis.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay análisis registrados para esta mascota.</p>';
            return;
        }
        
        let html = '';
        analisis.forEach(item => {
            html += `
                <div class="card mb-3">
                    <div class="card-body">
                        <h6 class="card-title">
                            <i class="fas fa-flask me-2"></i>
                            ${item.tipo_analisis} - ${new Date(item.fecha_analisis).toLocaleString()}
                        </h6>
                        ${item.resultados ? `<p><strong>Resultados:</strong> ${item.resultados}</p>` : ''}
                        ${item.archivo_adjunto ? `<p><strong>Archivo:</strong> <a href="/uploads/${item.archivo_adjunto}" target="_blank">${item.archivo_adjunto}</a></p>` : ''}
                        ${item.observaciones ? `<p><strong>Observaciones:</strong> ${item.observaciones}</p>` : ''}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error cargando análisis:', error);
    }
}

// Generar informe completo
async function generarInforme() {
    const mascotaId = document.getElementById('informe-mascota').value;
    
    if (!mascotaId) {
        showMessage('Selecciona una mascota', 'warning');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/informe/${mascotaId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (!response.ok) {
            showMessage('Error generando informe', 'error');
            return;
        }
        
        const container = document.getElementById('informe-contenido');
        const mascota = data.mascota;
        
        let html = `
            <div class="informe-header">
                <h4><i class="fas fa-file-medical me-2"></i>Informe Médico Veterinario</h4>
                <p class="text-muted">Generado el ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="informe-section">
                <h6><i class="fas fa-paw me-2"></i>Información de la Mascota</h6>
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Nombre:</strong> ${mascota.nombre}</p>
                        <p><strong>Especie:</strong> ${mascota.especie}</p>
                        <p><strong>Raza:</strong> ${mascota.raza || 'No especificada'}</p>
                        <p><strong>Edad:</strong> ${mascota.edad || 'No especificada'} años</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Peso:</strong> ${mascota.peso || 'No especificado'} kg</p>
                        <p><strong>Color:</strong> ${mascota.color || 'No especificado'}</p>
                        <p><strong>Sexo:</strong> ${mascota.sexo || 'No especificado'}</p>
                        <p><strong>Fecha de registro:</strong> ${new Date(mascota.fecha_registro).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
            
            <div class="informe-section">
                <h6><i class="fas fa-user me-2"></i>Información del Propietario</h6>
                <p><strong>Nombre:</strong> ${mascota.cliente_nombre} ${mascota.cliente_apellido}</p>
                <p><strong>Teléfono:</strong> ${mascota.telefono || 'No especificado'}</p>
                <p><strong>Email:</strong> ${mascota.email || 'No especificado'}</p>
            </div>
        `;
        
        // Historial de consultas
        if (data.consultas && data.consultas.length > 0) {
            html += `
                <div class="informe-section">
                    <h6><i class="fas fa-stethoscope me-2"></i>Historial de Consultas</h6>
            `;
            
            data.consultas.forEach(consulta => {
                html += `
                    <div class="mb-3 p-3 border-start border-3 border-info">
                        <h6>${new Date(consulta.fecha_consulta).toLocaleString()}</h6>
                        <p><strong>Motivo:</strong> ${consulta.motivo}</p>
                        ${consulta.diagnostico ? `<p><strong>Diagnóstico:</strong> ${consulta.diagnostico}</p>` : ''}
                        ${consulta.tratamiento ? `<p><strong>Tratamiento:</strong> ${consulta.tratamiento}</p>` : ''}
                        ${consulta.peso_actual ? `<p><strong>Peso:</strong> ${consulta.peso_actual} kg</p>` : ''}
                        ${consulta.temperatura ? `<p><strong>Temperatura:</strong> ${consulta.temperatura} °C</p>` : ''}
                        ${consulta.observaciones ? `<p><strong>Observaciones:</strong> ${consulta.observaciones}</p>` : ''}
                    </div>
                `;
            });
            
            html += '</div>';
        }
        
        // Análisis y estudios
        if (data.analisis && data.analisis.length > 0) {
            html += `
                <div class="informe-section">
                    <h6><i class="fas fa-flask me-2"></i>Análisis y Estudios</h6>
            `;
            
            data.analisis.forEach(item => {
                html += `
                    <div class="mb-3 p-3 border-start border-3 border-warning">
                        <h6>${item.tipo_analisis} - ${new Date(item.fecha_analisis).toLocaleString()}</h6>
                        ${item.resultados ? `<p><strong>Resultados:</strong> ${item.resultados}</p>` : ''}
                        ${item.archivo_adjunto ? `<p><strong>Archivo adjunto:</strong> ${item.archivo_adjunto}</p>` : ''}
                        ${item.observaciones ? `<p><strong>Observaciones:</strong> ${item.observaciones}</p>` : ''}
                    </div>
                `;
            });
            
            html += '</div>';
        }
        
        // Vacunas
        if (data.vacunas && data.vacunas.length > 0) {
            html += `
                <div class="informe-section">
                    <h6><i class="fas fa-syringe me-2"></i>Historial de Vacunación</h6>
            `;
            
            data.vacunas.forEach(vacuna => {
                html += `
                    <div class="mb-3 p-3 border-start border-3 border-success">
                        <h6>${vacuna.nombre_vacuna}</h6>
                        <p><strong>Fecha de aplicación:</strong> ${new Date(vacuna.fecha_aplicacion).toLocaleDateString()}</p>
                        ${vacuna.fecha_proxima ? `<p><strong>Próxima dosis:</strong> ${new Date(vacuna.fecha_proxima).toLocaleDateString()}</p>` : ''}
                        ${vacuna.lote ? `<p><strong>Lote:</strong> ${vacuna.lote}</p>` : ''}
                        ${vacuna.veterinario ? `<p><strong>Veterinario:</strong> ${vacuna.veterinario}</p>` : ''}
                    </div>
                `;
            });
            
            html += '</div>';
        }
        
        container.innerHTML = html;
        document.getElementById('btn-imprimir').style.display = 'block';
        
    } catch (error) {
        console.error('Error generando informe:', error);
        showMessage('Error generando informe', 'error');
    }
}

// Imprimir informe
function imprimirInforme() {
    window.print();
}

// Ver mascotas de un cliente específico
function verMascotasCliente(clienteId) {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) {
        showMessage('Cliente no encontrado', 'error');
        return;
    }
    
    if (!cliente.mascotas || cliente.mascotas.length === 0) {
        showMessage(`${cliente.nombre} ${cliente.apellido} no tiene mascotas registradas`, 'info');
        return;
    }
    
    // Crear modal para mostrar mascotas
    const modalHtml = `
        <div class="modal fade" id="mascotasModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-paw me-2"></i>
                            Mascotas de ${cliente.nombre} ${cliente.apellido}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            ${cliente.mascotas.map(mascota => `
                                <div class="col-md-6 mb-3">
                                    <div class="card">
                                        <div class="card-body">
                                            <h6 class="card-title">
                                                <i class="fas fa-dog me-2"></i>${mascota.nombre}
                                            </h6>
                                            <p class="card-text">
                                                <strong>Especie:</strong> ${mascota.especie}<br>
                                                <strong>Raza:</strong> ${mascota.raza || 'No especificada'}<br>
                                                <strong>Edad:</strong> ${mascota.edad || 'No especificada'} años<br>
                                                <strong>Peso:</strong> ${mascota.peso || 'No especificado'} kg<br>
                                                <strong>Sexo:</strong> ${mascota.sexo || 'No especificado'}
                                            </p>
                                            <button class="btn btn-sm btn-primary" onclick="verDetallesMascota(${mascota.id})">
                                                <i class="fas fa-eye me-1"></i>Ver Detalles
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remover modal anterior si existe
    const existingModal = document.getElementById('mascotasModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Agregar modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('mascotasModal'));
    modal.show();
}

// Ver detalles de mascota (función mejorada)
function verDetallesMascota(mascotaId) {
    // Cambiar a la sección de informes y generar informe automáticamente
    showSection('informes');
    
    // Esperar a que se cargue la sección y luego seleccionar la mascota
    setTimeout(() => {
        const select = document.getElementById('informe-mascota');
        if (select) {
            select.value = mascotaId;
            generarInforme();
        }
    }, 500);
    
    // Cerrar modal si está abierto
    const modal = document.getElementById('mascotasModal');
    if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) {
            bsModal.hide();
        }
    }
}

// Manejar envío de formulario de vacuna
async function handleVacunaSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Si se seleccionó "Otra" vacuna, usar el valor del campo personalizado
    if (data.nombre_vacuna === 'Otra' && data.otra_vacuna) {
        data.nombre_vacuna = data.otra_vacuna;
    }
    
    // Remover el campo otra_vacuna del objeto data
    delete data.otra_vacuna;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/vacunas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('Vacuna registrada exitosamente', 'success');
            e.target.reset();
            // Ocultar campo "otra vacuna"
            document.getElementById('otra-vacuna-div').style.display = 'none';
            if (data.mascota_id) {
                loadVacunasHistorial(data.mascota_id);
            }
        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showMessage('Error de conexión', 'error');
    }
}

// Cargar mascotas para el filtro de vacunas
async function loadMascotasSelectForFilter() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/mascotas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const mascotas = await response.json();
        
        const select = document.getElementById('filtro-mascota-vacunas');
        select.innerHTML = '<option value="">Todas las mascotas</option>';
        
        mascotas.forEach(mascota => {
            const option = document.createElement('option');
            option.value = mascota.id;
            option.textContent = `${mascota.nombre} (${mascota.cliente_nombre} ${mascota.cliente_apellido})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando mascotas para filtro:', error);
    }
}

// Cargar historial de vacunas
async function loadVacunasHistorial(mascotaId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/vacunas/${mascotaId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const vacunas = await response.json();
        
        const container = document.getElementById('vacunas-historial');
        
        if (vacunas.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay vacunas registradas para esta mascota.</p>';
            return;
        }
        
        let html = '';
        vacunas.forEach(vacuna => {
            const fechaAplicacion = new Date(vacuna.fecha_aplicacion).toLocaleDateString();
            const fechaProxima = vacuna.fecha_proxima ? new Date(vacuna.fecha_proxima).toLocaleDateString() : 'No programada';
            
            // Determinar si la vacuna está vencida o próxima a vencer
            const hoy = new Date();
            const proxima = vacuna.fecha_proxima ? new Date(vacuna.fecha_proxima) : null;
            let alertClass = '';
            let alertIcon = '';
            
            if (proxima) {
                const diasRestantes = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));
                if (diasRestantes < 0) {
                    alertClass = 'border-danger';
                    alertIcon = '<i class="fas fa-exclamation-triangle text-danger me-2"></i>';
                } else if (diasRestantes <= 30) {
                    alertClass = 'border-warning';
                    alertIcon = '<i class="fas fa-clock text-warning me-2"></i>';
                } else {
                    alertClass = 'border-success';
                    alertIcon = '<i class="fas fa-check-circle text-success me-2"></i>';
                }
            }
            
            html += `
                <div class="card mb-3 ${alertClass}">
                    <div class="card-body">
                        <h6 class="card-title">
                            ${alertIcon}
                            <i class="fas fa-syringe me-2"></i>
                            ${vacuna.nombre_vacuna}
                        </h6>
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>Fecha de aplicación:</strong> ${fechaAplicacion}</p>
                                <p><strong>Próxima dosis:</strong> ${fechaProxima}</p>
                            </div>
                            <div class="col-md-6">
                                ${vacuna.lote ? `<p><strong>Lote:</strong> ${vacuna.lote}</p>` : ''}
                                ${vacuna.veterinario ? `<p><strong>Veterinario:</strong> ${vacuna.veterinario}</p>` : ''}
                            </div>
                        </div>
                        ${vacuna.observaciones ? `<p><strong>Observaciones:</strong> ${vacuna.observaciones}</p>` : ''}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error cargando vacunas:', error);
        showMessage('Error cargando historial de vacunas', 'error');
    }
}

// Mostrar mensaje
function showMessage(message, type) {
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'error' ? 'alert-danger' : 
                      type === 'warning' ? 'alert-warning' : 'alert-info';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert ${alertClass} message`;
    messageDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentElement) {
            messageDiv.remove();
        }
    }, 5000);
}

// ==================== FUNCIONES PARA MASCOTAS ====================

// Actualizar razas según especie seleccionada
function actualizarRazas() {
    const especieSelect = document.getElementById('especie-select');
    const razaSelect = document.getElementById('raza-select');
    const especie = especieSelect.value;
    
    // Limpiar opciones actuales
    razaSelect.innerHTML = '<option value="">Seleccionar...</option>';
    
    if (especie === 'Canino' && typeof RAZAS_CANINAS !== 'undefined') {
        RAZAS_CANINAS.forEach(raza => {
            const option = document.createElement('option');
            option.value = raza;
            option.textContent = raza;
            razaSelect.appendChild(option);
        });
    } else if (especie === 'Felino' && typeof RAZAS_FELINAS !== 'undefined') {
        RAZAS_FELINAS.forEach(raza => {
            const option = document.createElement('option');
            option.value = raza;
            option.textContent = raza;
            razaSelect.appendChild(option);
        });
    } else {
        // Para otras especies, permitir entrada manual
        razaSelect.innerHTML = '<option value="">Otra (especificar en observaciones)</option>';
    }
}

// Toggle mostrar/ocultar número de chip
function toggleChipNumber() {
    const tieneChip = document.getElementById('tiene-chip-select').value;
    const numeroChipDiv = document.getElementById('numero-chip-div');
    
    if (tieneChip === 'true') {
        numeroChipDiv.style.display = 'block';
    } else {
        numeroChipDiv.style.display = 'none';
        document.querySelector('input[name="numero_chip"]').value = '';
    }
}

// Calcular alimento diario recomendado
function calcularAlimento() {
    const peso = parseFloat(document.getElementById('peso-input').value);
    const edad = parseFloat(document.getElementById('edad-input').value);
    const especie = document.getElementById('especie-select').value;
    const pesoBolsa = parseFloat(document.getElementById('peso-bolsa-input').value);
    const fechaBolsa = document.getElementById('fecha-bolsa-input').value;
    
    if (!peso || peso <= 0 || !edad || !especie) {
        document.getElementById('gramos-diarios-input').value = '';
        document.getElementById('dias-restantes-info').textContent = '';
        return;
    }
    
    // Calcular gramos diarios usando la función del archivo razas-data.js
    let gramosDiarios = 0;
    if (typeof calcularAlimentoDiario !== 'undefined') {
        gramosDiarios = calcularAlimentoDiario(peso, edad, especie);
    } else {
        // Cálculo básico si no está disponible la función
        let porcentaje = 2.5;
        if (edad <= 1) porcentaje = 3.5;
        else if (edad > 7) porcentaje = 2;
        gramosDiarios = Math.round((peso * 1000 * porcentaje) / 100);
    }
    
    document.getElementById('gramos-diarios-input').value = gramosDiarios;
    
    // Calcular días restantes si hay datos de bolsa
    if (pesoBolsa && pesoBolsa > 0 && gramosDiarios > 0) {
        const infoElement = document.getElementById('dias-restantes-info');
        
        if (typeof calcularDiasRestantes !== 'undefined') {
            const resultado = calcularDiasRestantes(pesoBolsa, gramosDiarios, fechaBolsa);
            
            if (resultado) {
                if (fechaBolsa) {
                    let colorClass = 'text-success';
                    let icon = '✓';
                    
                    if (resultado.diasRestantes <= 3) {
                        colorClass = 'text-danger';
                        icon = '⚠️';
                    } else if (resultado.diasRestantes <= 7) {
                        colorClass = 'text-warning';
                        icon = '⚠';
                    }
                    
                    infoElement.innerHTML = `
                        <span class="${colorClass}">
                            ${icon} Quedan aproximadamente <strong>${resultado.diasRestantes} días</strong> de alimento 
                            (${resultado.porcentajeRestante}% de la bolsa)
                        </span>
                    `;
                } else {
                    infoElement.innerHTML = `
                        <span class="text-info">
                            ℹ️ Esta bolsa durará aproximadamente <strong>${resultado.diasTotales} días</strong>
                        </span>
                    `;
                }
            }
        } else {
            const diasTotales = Math.floor((pesoBolsa * 1000) / gramosDiarios);
            infoElement.innerHTML = `
                <span class="text-info">
                    ℹ️ Esta bolsa durará aproximadamente <strong>${diasTotales} días</strong>
                </span>
            `;
        }
    } else {
        document.getElementById('dias-restantes-info').textContent = '';
    }
}

// Alternar entre formulario de consulta e historial
function toggleConsultaForm() {
    const formContainer = document.getElementById('consulta-form-container');
    const historialCard = document.getElementById('consultas-historial-card');
    
    if (formContainer.parentElement.style.display === 'none') {
        formContainer.parentElement.style.display = 'block';
        historialCard.style.display = 'none';
    } else {
        formContainer.parentElement.style.display = 'none';
        historialCard.style.display = 'block';
    }
}
