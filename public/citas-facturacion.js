// ==================== SISTEMA DE CITAS Y FACTURACIÓN ====================
// Archivo: citas-facturacion.js
// Descripción: Manejo completo de citas médicas y facturación

const API_URL = window.location.origin;
let currentClientes = [];
let currentMascotas = [];
let configPagos = null;

// ==================== FUNCIONES DE CITAS ====================

// Verificar configuración de pagos
async function verificarConfigPagos() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/veterinario/config-pagos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            configPagos = await response.json();
            
            // Verificar si tiene al menos un método configurado
            const tieneMetodo = configPagos.acepta_transferencia || 
                               configPagos.acepta_mercadopago || 
                               configPagos.acepta_efectivo;
            
            const alert = document.getElementById('config-pagos-alert');
            if (alert && !tieneMetodo) {
                alert.style.display = 'block';
            }
            
            return tieneMetodo;
        }
        return false;
    } catch (error) {
        console.error('Error verificando configuración:', error);
        return false;
    }
}

// Cargar todas las citas
async function loadCitas() {
    try {
        // Verificar configuración de pagos
        await verificarConfigPagos();
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/citas`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Error al cargar citas');

        const citas = await response.json();
        renderCitas(citas);
        updateCitasStats(citas);
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al cargar citas', 'error');
    }
}

// Renderizar lista de citas
function renderCitas(citas) {
    const tbody = document.getElementById('citas-list');
    
    if (citas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    <i class="fas fa-calendar-plus fa-2x mb-2"></i><br>
                    No hay citas registradas. Crea tu primera cita.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = citas.map(cita => {
        const fecha = new Date(cita.fecha_cita);
        const estadoBadge = getEstadoBadge(cita.estado);
        const pagoBadge = cita.pago_confirmado 
            ? '<span class="badge bg-success">Pagado</span>' 
            : '<span class="badge bg-warning">Pendiente</span>';

        return `
            <tr>
                <td>${fecha.toLocaleDateString('es-AR')}</td>
                <td>${fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${cita.cliente_nombre} ${cita.cliente_apellido}</td>
                <td>${cita.mascota_nombre}</td>
                <td>${cita.motivo}</td>
                <td>${estadoBadge} ${pagoBadge}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewCita(${cita.id})" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="editCita(${cita.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCita(${cita.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Obtener badge de estado
function getEstadoBadge(estado) {
    const badges = {
        'programada': '<span class="badge bg-primary">Programada</span>',
        'confirmada': '<span class="badge bg-info">Confirmada</span>',
        'completada': '<span class="badge bg-success">Completada</span>',
        'cancelada': '<span class="badge bg-danger">Cancelada</span>',
        'no_asistio': '<span class="badge bg-secondary">No asistió</span>'
    };
    return badges[estado] || '<span class="badge bg-secondary">Desconocido</span>';
}

// Actualizar estadísticas de citas
function updateCitasStats(citas) {
    const pendientes = citas.filter(c => c.estado === 'programada' || c.estado === 'confirmada').length;
    const citasPendientesEl = document.getElementById('citas-pendientes');
    if (citasPendientesEl) {
        citasPendientesEl.textContent = pendientes;
    }
}

// Mostrar modal de nueva cita
async function showCitaModal(citaId = null) {
    // Cargar clientes y mascotas
    await loadClientesYMascotas();

    const isEdit = citaId !== null;
    const title = isEdit ? 'Editar Cita' : 'Nueva Cita';
    
    let citaData = {
        cliente_id: '',
        mascota_id: '',
        fecha_cita: '',
        motivo: '',
        observaciones: '',
        monto: 0,
        metodo_pago: 'efectivo',
        estado: 'programada'
    };

    if (isEdit) {
        // Cargar datos de la cita
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/citas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const citas = await response.json();
            citaData = citas.find(c => c.id === citaId) || citaData;
        } catch (error) {
            console.error('Error cargando cita:', error);
        }
    }

    const modalHTML = `
        <div class="modal fade" id="citaModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="citaForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Cliente *</label>
                                    <select class="form-select" id="cita-cliente" required onchange="loadMascotasCliente(this.value)">
                                        <option value="">Seleccionar cliente...</option>
                                        ${currentClientes.map(c => `
                                            <option value="${c.id}" ${c.id == citaData.cliente_id ? 'selected' : ''}>
                                                ${c.nombre} ${c.apellido}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Mascota *</label>
                                    <select class="form-select" id="cita-mascota" required>
                                        <option value="">Seleccionar mascota...</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Fecha *</label>
                                    <input type="date" class="form-control" id="cita-fecha" required 
                                           value="${citaData.fecha_cita ? citaData.fecha_cita.split('T')[0] : ''}">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Hora *</label>
                                    <input type="time" class="form-control" id="cita-hora" required
                                           value="${citaData.fecha_cita ? new Date(citaData.fecha_cita).toTimeString().slice(0,5) : ''}">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Motivo de la consulta *</label>
                                <input type="text" class="form-control" id="cita-motivo" required 
                                       value="${citaData.motivo}" placeholder="Ej: Control anual, vacunación...">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Observaciones</label>
                                <textarea class="form-control" id="cita-observaciones" rows="3">${citaData.observaciones || ''}</textarea>
                            </div>
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Monto ($)</label>
                                    <input type="number" class="form-control" id="cita-monto" min="0" step="0.01" 
                                           value="${citaData.monto || 0}">
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Método de pago</label>
                                    <select class="form-select" id="cita-metodo-pago">
                                        <option value="efectivo" ${citaData.metodo_pago === 'efectivo' ? 'selected' : ''}>Efectivo</option>
                                        <option value="tarjeta" ${citaData.metodo_pago === 'tarjeta' ? 'selected' : ''}>Tarjeta</option>
                                        <option value="transferencia" ${citaData.metodo_pago === 'transferencia' ? 'selected' : ''}>Transferencia</option>
                                        <option value="mercadopago" ${citaData.metodo_pago === 'mercadopago' ? 'selected' : ''}>Mercado Pago</option>
                                    </select>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Estado</label>
                                    <select class="form-select" id="cita-estado">
                                        <option value="programada" ${citaData.estado === 'programada' ? 'selected' : ''}>Programada</option>
                                        <option value="confirmada" ${citaData.estado === 'confirmada' ? 'selected' : ''}>Confirmada</option>
                                        <option value="completada" ${citaData.estado === 'completada' ? 'selected' : ''}>Completada</option>
                                        <option value="cancelada" ${citaData.estado === 'cancelada' ? 'selected' : ''}>Cancelada</option>
                                        <option value="no_asistio" ${citaData.estado === 'no_asistio' ? 'selected' : ''}>No asistió</option>
                                    </select>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="saveCita(${citaId})">
                            <i class="fas fa-save me-1"></i>Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remover modal anterior si existe
    const oldModal = document.getElementById('citaModal');
    if (oldModal) oldModal.remove();

    // Agregar nuevo modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('citaModal'));
    modal.show();

    // Cargar mascotas si hay cliente seleccionado
    if (citaData.cliente_id) {
        await loadMascotasCliente(citaData.cliente_id);
        document.getElementById('cita-mascota').value = citaData.mascota_id;
    }
}

// Cargar clientes y mascotas
async function loadClientesYMascotas() {
    try {
        const token = localStorage.getItem('token');
        const [clientesRes, mascotasRes] = await Promise.all([
            fetch(`${API_URL}/api/clientes`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/api/mascotas`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        currentClientes = await clientesRes.json();
        currentMascotas = await mascotasRes.json();
    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

// Cargar mascotas de un cliente
async function loadMascotasCliente(clienteId) {
    const mascotaSelect = document.getElementById('cita-mascota');
    const mascotas = currentMascotas.filter(m => m.cliente_id == clienteId);
    
    mascotaSelect.innerHTML = '<option value="">Seleccionar mascota...</option>' +
        mascotas.map(m => `<option value="${m.id}">${m.nombre} (${m.especie})</option>`).join('');
}

// Guardar cita
async function saveCita(citaId = null) {
    const form = document.getElementById('citaForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const fecha = document.getElementById('cita-fecha').value;
    const hora = document.getElementById('cita-hora').value;
    const fecha_cita = `${fecha}T${hora}:00`;

    const data = {
        cliente_id: parseInt(document.getElementById('cita-cliente').value),
        mascota_id: parseInt(document.getElementById('cita-mascota').value),
        fecha_cita: fecha_cita,
        motivo: document.getElementById('cita-motivo').value,
        observaciones: document.getElementById('cita-observaciones').value,
        monto: parseFloat(document.getElementById('cita-monto').value) || 0,
        metodo_pago: document.getElementById('cita-metodo-pago').value,
        estado: document.getElementById('cita-estado').value
    };

    try {
        const token = localStorage.getItem('token');
        const url = citaId ? `${API_URL}/api/citas/${citaId}` : `${API_URL}/api/citas`;
        const method = citaId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Error al guardar cita');

        showNotification(citaId ? 'Cita actualizada exitosamente' : 'Cita creada exitosamente', 'success');
        bootstrap.Modal.getInstance(document.getElementById('citaModal')).hide();
        loadCitas();
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al guardar cita', 'error');
    }
}

// Eliminar cita
async function deleteCita(citaId) {
    if (!confirm('¿Estás seguro de eliminar esta cita?')) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/citas/${citaId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error al eliminar cita');

        showNotification('Cita eliminada exitosamente', 'success');
        loadCitas();
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al eliminar cita', 'error');
    }
}

// ==================== FUNCIONES DE FACTURACIÓN ====================

// Cargar todas las facturas
async function loadFacturas() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/facturas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error al cargar facturas');

        const facturas = await response.json();
        renderFacturas(facturas);
        loadFacturasStats();
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al cargar facturas', 'error');
    }
}

// Renderizar lista de facturas
function renderFacturas(facturas) {
    const tbody = document.getElementById('facturas-list');
    
    if (facturas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    <i class="fas fa-file-invoice fa-2x mb-2"></i><br>
                    No hay facturas registradas. Crea tu primera factura.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = facturas.map(factura => {
        const fecha = new Date(factura.fecha_factura).toLocaleDateString('es-AR');
        const estadoBadge = getEstadoFacturaBadge(factura.estado);

        return `
            <tr>
                <td><strong>${factura.numero_factura}</strong></td>
                <td>${fecha}</td>
                <td>${factura.cliente_nombre} ${factura.cliente_apellido}</td>
                <td>$${parseFloat(factura.total).toFixed(2)}</td>
                <td>${estadoBadge}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewFactura(${factura.id})" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="printFactura(${factura.id})" title="Imprimir">
                        <i class="fas fa-print"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="changeEstadoFactura(${factura.id})" title="Cambiar estado">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteFactura(${factura.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Obtener badge de estado de factura
function getEstadoFacturaBadge(estado) {
    const badges = {
        'pendiente': '<span class="badge bg-warning">Pendiente</span>',
        'pagada': '<span class="badge bg-success">Pagada</span>',
        'cancelada': '<span class="badge bg-danger">Cancelada</span>',
        'vencida': '<span class="badge bg-secondary">Vencida</span>'
    };
    return badges[estado] || '<span class="badge bg-secondary">Desconocido</span>';
}

// Cargar estadísticas de facturación
async function loadFacturasStats() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/facturas/stats/resumen`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error al cargar estadísticas');

        const stats = await response.json();
        
        // Actualizar tarjetas de estadísticas
        const totalIngresadoEl = document.getElementById('total-ingresado');
        const totalPendienteEl = document.getElementById('total-pendiente');
        const facturasPendientesEl = document.getElementById('facturas-pendientes');

        if (totalIngresadoEl) totalIngresadoEl.textContent = `$${parseFloat(stats.total_ingresado || 0).toFixed(2)}`;
        if (totalPendienteEl) totalPendienteEl.textContent = `$${parseFloat(stats.total_pendiente || 0).toFixed(2)}`;
        if (facturasPendientesEl) facturasPendientesEl.textContent = stats.pendientes || 0;
    } catch (error) {
        console.error('Error:', error);
    }
}

// Mostrar modal de nueva factura
async function showFacturaModal() {
    await loadClientesYMascotas();

    const modalHTML = `
        <div class="modal fade" id="facturaModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Nueva Factura</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="facturaForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Cliente *</label>
                                    <select class="form-select" id="factura-cliente" required>
                                        <option value="">Seleccionar cliente...</option>
                                        ${currentClientes.map(c => `
                                            <option value="${c.id}">${c.nombre} ${c.apellido}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Fecha</label>
                                    <input type="date" class="form-control" id="factura-fecha" 
                                           value="${new Date().toISOString().split('T')[0]}" required>
                                </div>
                            </div>
                            
                            <h6 class="mt-3">Items de la factura</h6>
                            <div id="factura-items">
                                <div class="row factura-item mb-2">
                                    <div class="col-md-5">
                                        <input type="text" class="form-control" placeholder="Descripción" required>
                                    </div>
                                    <div class="col-md-2">
                                        <input type="number" class="form-control item-cantidad" placeholder="Cant." min="1" value="1" required>
                                    </div>
                                    <div class="col-md-2">
                                        <input type="number" class="form-control item-precio" placeholder="Precio" min="0" step="0.01" required>
                                    </div>
                                    <div class="col-md-2">
                                        <input type="text" class="form-control item-subtotal" placeholder="Subtotal" readonly>
                                    </div>
                                    <div class="col-md-1">
                                        <button type="button" class="btn btn-sm btn-danger" onclick="removeFacturaItem(this)">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <button type="button" class="btn btn-sm btn-secondary mb-3" onclick="addFacturaItem()">
                                <i class="fas fa-plus me-1"></i>Agregar item
                            </button>
                            
                            <div class="row">
                                <div class="col-md-8"></div>
                                <div class="col-md-4">
                                    <div class="mb-2">
                                        <strong>Subtotal:</strong> 
                                        <span id="factura-subtotal-display" class="float-end">$0.00</span>
                                    </div>
                                    <div class="mb-2">
                                        <label>Impuestos (%):</label>
                                        <input type="number" class="form-control form-control-sm" id="factura-impuestos" 
                                               min="0" max="100" step="0.01" value="0" onchange="calcularTotalFactura()">
                                    </div>
                                    <div class="mb-2">
                                        <strong>Impuestos:</strong> 
                                        <span id="factura-impuestos-display" class="float-end">$0.00</span>
                                    </div>
                                    <hr>
                                    <div>
                                        <h5>Total: <span id="factura-total-display" class="float-end">$0.00</span></h5>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="saveFactura()">
                            <i class="fas fa-save me-1"></i>Guardar Factura
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const oldModal = document.getElementById('facturaModal');
    if (oldModal) oldModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('facturaModal'));
    modal.show();

    // Agregar event listeners para cálculo automático
    document.querySelectorAll('.item-cantidad, .item-precio').forEach(input => {
        input.addEventListener('input', calcularTotalFactura);
    });
}

// Agregar item a la factura
function addFacturaItem() {
    const itemsContainer = document.getElementById('factura-items');
    const newItem = `
        <div class="row factura-item mb-2">
            <div class="col-md-5">
                <input type="text" class="form-control" placeholder="Descripción" required>
            </div>
            <div class="col-md-2">
                <input type="number" class="form-control item-cantidad" placeholder="Cant." min="1" value="1" required>
            </div>
            <div class="col-md-2">
                <input type="number" class="form-control item-precio" placeholder="Precio" min="0" step="0.01" required>
            </div>
            <div class="col-md-2">
                <input type="text" class="form-control item-subtotal" placeholder="Subtotal" readonly>
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-sm btn-danger" onclick="removeFacturaItem(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    itemsContainer.insertAdjacentHTML('beforeend', newItem);
    
    // Agregar event listeners
    const lastItem = itemsContainer.lastElementChild;
    lastItem.querySelectorAll('.item-cantidad, .item-precio').forEach(input => {
        input.addEventListener('input', calcularTotalFactura);
    });
}

// Remover item de la factura
function removeFacturaItem(button) {
    const items = document.querySelectorAll('.factura-item');
    if (items.length > 1) {
        button.closest('.factura-item').remove();
        calcularTotalFactura();
    } else {
        showNotification('Debe haber al menos un item', 'warning');
    }
}

// Calcular total de la factura
function calcularTotalFactura() {
    let subtotal = 0;
    
    document.querySelectorAll('.factura-item').forEach(item => {
        const cantidad = parseFloat(item.querySelector('.item-cantidad').value) || 0;
        const precio = parseFloat(item.querySelector('.item-precio').value) || 0;
        const itemSubtotal = cantidad * precio;
        
        item.querySelector('.item-subtotal').value = itemSubtotal.toFixed(2);
        subtotal += itemSubtotal;
    });
    
    const impuestosPorcentaje = parseFloat(document.getElementById('factura-impuestos').value) || 0;
    const impuestos = subtotal * (impuestosPorcentaje / 100);
    const total = subtotal + impuestos;
    
    document.getElementById('factura-subtotal-display').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('factura-impuestos-display').textContent = `$${impuestos.toFixed(2)}`;
    document.getElementById('factura-total-display').textContent = `$${total.toFixed(2)}`;
}

// Guardar factura
async function saveFactura() {
    const form = document.getElementById('facturaForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const items = [];
    document.querySelectorAll('.factura-item').forEach(item => {
        const descripcion = item.querySelector('input[placeholder="Descripción"]').value;
        const cantidad = parseInt(item.querySelector('.item-cantidad').value);
        const precio_unitario = parseFloat(item.querySelector('.item-precio').value);
        const subtotal = cantidad * precio_unitario;
        
        items.push({ descripcion, cantidad, precio_unitario, subtotal });
    });

    if (items.length === 0) {
        showNotification('Debe agregar al menos un item', 'warning');
        return;
    }

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const impuestosPorcentaje = parseFloat(document.getElementById('factura-impuestos').value) || 0;
    const impuestos = subtotal * (impuestosPorcentaje / 100);
    const total = subtotal + impuestos;

    const data = {
        cliente_id: parseInt(document.getElementById('factura-cliente').value),
        fecha_factura: document.getElementById('factura-fecha').value,
        items: items,
        subtotal: subtotal,
        impuestos: impuestos,
        total: total
    };

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/facturas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Error al guardar factura');

        showNotification('Factura creada exitosamente', 'success');
        bootstrap.Modal.getInstance(document.getElementById('facturaModal')).hide();
        loadFacturas();
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al guardar factura', 'error');
    }
}

// Ver detalles de factura
async function viewFactura(facturaId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/facturas/${facturaId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error al cargar factura');

        const factura = await response.json();
        
        const modalHTML = `
            <div class="modal fade" id="viewFacturaModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Factura ${factura.numero_factura}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <strong>Cliente:</strong> ${factura.cliente_nombre} ${factura.cliente_apellido}<br>
                                    <strong>Email:</strong> ${factura.cliente_email || 'N/A'}<br>
                                    <strong>Teléfono:</strong> ${factura.cliente_telefono || 'N/A'}
                                </div>
                                <div class="col-md-6 text-end">
                                    <strong>Fecha:</strong> ${new Date(factura.fecha_factura).toLocaleDateString('es-AR')}<br>
                                    <strong>Estado:</strong> ${getEstadoFacturaBadge(factura.estado)}
                                </div>
                            </div>
                            
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Descripción</th>
                                        <th>Cantidad</th>
                                        <th>Precio Unit.</th>
                                        <th>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${factura.items.map(item => `
                                        <tr>
                                            <td>${item.descripcion}</td>
                                            <td>${item.cantidad}</td>
                                            <td>$${parseFloat(item.precio_unitario).toFixed(2)}</td>
                                            <td>$${parseFloat(item.subtotal).toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colspan="3" class="text-end"><strong>Subtotal:</strong></td>
                                        <td><strong>$${parseFloat(factura.subtotal).toFixed(2)}</strong></td>
                                    </tr>
                                    <tr>
                                        <td colspan="3" class="text-end"><strong>Impuestos:</strong></td>
                                        <td><strong>$${parseFloat(factura.impuestos).toFixed(2)}</strong></td>
                                    </tr>
                                    <tr>
                                        <td colspan="3" class="text-end"><strong>TOTAL:</strong></td>
                                        <td><strong>$${parseFloat(factura.total).toFixed(2)}</strong></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            <button type="button" class="btn btn-primary" onclick="printFactura(${facturaId})">
                                <i class="fas fa-print me-1"></i>Imprimir
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const oldModal = document.getElementById('viewFacturaModal');
        if (oldModal) oldModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('viewFacturaModal'));
        modal.show();
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al cargar factura', 'error');
    }
}

// Cambiar estado de factura
async function changeEstadoFactura(facturaId) {
    const estado = prompt('Nuevo estado (pendiente/pagada/cancelada/vencida):');
    if (!estado) return;

    const estadosValidos = ['pendiente', 'pagada', 'cancelada', 'vencida'];
    if (!estadosValidos.includes(estado.toLowerCase())) {
        showNotification('Estado inválido', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/facturas/${facturaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ estado: estado.toLowerCase() })
        });

        if (!response.ok) throw new Error('Error al actualizar factura');

        showNotification('Estado actualizado exitosamente', 'success');
        loadFacturas();
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al actualizar estado', 'error');
    }
}

// Eliminar factura
async function deleteFactura(facturaId) {
    if (!confirm('¿Estás seguro de eliminar esta factura?')) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/facturas/${facturaId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error al eliminar factura');

        showNotification('Factura eliminada exitosamente', 'success');
        loadFacturas();
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al eliminar factura', 'error');
    }
}

// Imprimir factura
function printFactura(facturaId) {
    window.open(`${API_URL}/api/facturas/${facturaId}/print`, '_blank');
}

// ==================== FUNCIONES AUXILIARES ====================

// Mostrar notificación
function showNotification(message, type = 'info') {
    const alertClass = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    }[type] || 'alert-info';

    const notification = document.createElement('div');
    notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    notification.style.zIndex = '9999';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Filtrar citas
function filtrarCitas() {
    const estado = document.getElementById('filtro-estado-cita')?.value;
    const fecha = document.getElementById('filtro-fecha-cita')?.value;
    
    // Implementar filtrado
    loadCitas();
}

// Exportar funciones globales
window.loadCitas = loadCitas;
window.loadFacturas = loadFacturas;
window.showCitaModal = showCitaModal;
window.showFacturaModal = showFacturaModal;
window.saveCita = saveCita;
window.deleteCita = deleteCita;
window.viewCita = viewFactura; // Reutilizar función
window.editCita = showCitaModal;
window.saveFactura = saveFactura;
window.deleteFactura = deleteFactura;
window.viewFactura = viewFactura;
window.changeEstadoFactura = changeEstadoFactura;
window.printFactura = printFactura;
window.addFacturaItem = addFacturaItem;
window.removeFacturaItem = removeFacturaItem;
window.calcularTotalFactura = calcularTotalFactura;
window.loadMascotasCliente = loadMascotasCliente;
window.filtrarCitas = filtrarCitas;
