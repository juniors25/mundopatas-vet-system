// Verificar autenticación
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        alert('Debes iniciar sesión para acceder al sistema.');
        window.location.href = '/';
        return;
    }
    
    // Cargar primera sección por defecto
    showSection('faq');
});

// Mostrar sección
function showSection(sectionName) {
    // Ocultar todas las secciones
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Mostrar la sección seleccionada
    const section = document.getElementById(sectionName + '-section');
    if (section) {
        section.style.display = 'block';
    }
    
    // Cargar datos según la sección
    switch(sectionName) {
        case 'faq':
            loadFAQ();
            break;
        case 'ubicacion':
            loadUbicacion();
            loadValoraciones();
            break;
        case 'protocolos':
            loadProtocolos();
            break;
    }
}

// ==================== FAQ ====================

async function loadFAQ() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.location.origin}/api/faq`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al cargar FAQ');
        
        const faqs = await response.json();
        const container = document.getElementById('faq-list');
        
        if (faqs.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center text-muted py-5">
                    <i class="fas fa-question-circle fa-3x mb-3"></i>
                    <p>No hay preguntas frecuentes. Crea tu primera FAQ.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = faqs.map(faq => `
            <div class="col-md-6 mb-3">
                <div class="card faq-item">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">
                                <i class="fas fa-question-circle text-primary me-2"></i>
                                ${faq.pregunta}
                            </h6>
                            <span class="badge ${faq.activo ? 'bg-success' : 'bg-secondary'}">
                                ${faq.activo ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        <p class="card-text text-muted">${faq.respuesta}</p>
                        <small class="text-muted">Orden: ${faq.orden}</small>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-primary" onclick="editFAQ(${faq.id})">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteFAQ(${faq.id})">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar preguntas frecuentes');
    }
}

function showFAQModal(faqId = null) {
    const modal = new bootstrap.Modal(document.getElementById('faqModal'));
    const form = document.getElementById('faq-form');
    form.reset();
    
    if (faqId) {
        document.getElementById('faqModalTitle').textContent = 'Editar Pregunta Frecuente';
        // Cargar datos de la FAQ
        loadFAQData(faqId);
    } else {
        document.getElementById('faqModalTitle').textContent = 'Nueva Pregunta Frecuente';
        document.getElementById('faq_id').value = '';
    }
    
    modal.show();
}

async function loadFAQData(faqId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.location.origin}/api/faq`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const faqs = await response.json();
        const faq = faqs.find(f => f.id === faqId);
        
        if (faq) {
            document.getElementById('faq_id').value = faq.id;
            document.querySelector('[name="pregunta"]').value = faq.pregunta;
            document.querySelector('[name="respuesta"]').value = faq.respuesta;
            document.querySelector('[name="orden"]').value = faq.orden;
            document.getElementById('faq_activo').checked = faq.activo;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

document.getElementById('faq-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        pregunta: formData.get('pregunta'),
        respuesta: formData.get('respuesta'),
        orden: parseInt(formData.get('orden')) || 0,
        activo: formData.get('activo') === 'on'
    };
    
    const faqId = document.getElementById('faq_id').value;
    const token = localStorage.getItem('token');
    
    try {
        const url = faqId 
            ? `${window.location.origin}/api/faq/${faqId}`
            : `${window.location.origin}/api/faq`;
        
        const response = await fetch(url, {
            method: faqId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('Error al guardar FAQ');
        
        alert('FAQ guardada exitosamente');
        bootstrap.Modal.getInstance(document.getElementById('faqModal')).hide();
        loadFAQ();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar FAQ');
    }
});

function editFAQ(faqId) {
    showFAQModal(faqId);
}

async function deleteFAQ(faqId) {
    if (!confirm('¿Estás seguro de eliminar esta pregunta frecuente?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.location.origin}/api/faq/${faqId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al eliminar FAQ');
        
        alert('FAQ eliminada exitosamente');
        loadFAQ();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar FAQ');
    }
}

// ==================== UBICACIÓN ====================

async function loadUbicacion() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.location.origin}/api/ubicaciones/mi-ubicacion`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al cargar ubicación');
        
        const ubicacion = await response.json();
        
        if (ubicacion) {
            document.querySelector('[name="direccion_completa"]').value = ubicacion.direccion_completa || '';
            document.querySelector('[name="ciudad"]').value = ubicacion.ciudad || '';
            document.querySelector('[name="provincia"]').value = ubicacion.provincia || '';
            document.querySelector('[name="codigo_postal"]').value = ubicacion.codigo_postal || '';
            document.querySelector('[name="zona"]').value = ubicacion.zona || '';
            document.querySelector('[name="latitud"]').value = ubicacion.latitud || '';
            document.querySelector('[name="longitud"]').value = ubicacion.longitud || '';
            document.getElementById('visible_en_mapa').checked = ubicacion.visible_en_mapa;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

document.getElementById('ubicacion-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        direccion_completa: formData.get('direccion_completa'),
        ciudad: formData.get('ciudad'),
        provincia: formData.get('provincia'),
        codigo_postal: formData.get('codigo_postal'),
        zona: formData.get('zona'),
        latitud: parseFloat(formData.get('latitud')) || null,
        longitud: parseFloat(formData.get('longitud')) || null,
        visible_en_mapa: formData.get('visible_en_mapa') === 'on'
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.location.origin}/api/ubicaciones`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('Error al guardar ubicación');
        
        alert('Ubicación guardada exitosamente');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar ubicación');
    }
});

async function loadValoraciones() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`${window.location.origin}/api/valoraciones/${user.id}`);
        
        if (!response.ok) throw new Error('Error al cargar valoraciones');
        
        const valoraciones = await response.json();
        
        // Calcular promedio
        const promedio = valoraciones.length > 0
            ? (valoraciones.reduce((sum, v) => sum + v.puntuacion, 0) / valoraciones.length).toFixed(1)
            : 0;
        
        document.getElementById('promedio-valoracion').textContent = promedio;
        document.getElementById('total-valoraciones').textContent = `${valoraciones.length} valoraciones`;
        
        // Mostrar estrellas
        const estrellasHtml = Array(5).fill(0).map((_, i) => {
            return i < Math.round(promedio) 
                ? '<i class="fas fa-star"></i>'
                : '<i class="far fa-star"></i>';
        }).join('');
        document.getElementById('estrellas-valoracion').innerHTML = estrellasHtml;
        
        // Mostrar lista de valoraciones
        const container = document.getElementById('valoraciones-list');
        if (valoraciones.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No hay valoraciones aún</p>';
            return;
        }
        
        container.innerHTML = valoraciones.map(val => `
            <div class="border-bottom pb-2 mb-2">
                <div class="d-flex justify-content-between">
                    <strong>${val.nombre || 'Cliente'} ${val.apellido || ''}</strong>
                    <span class="text-warning">
                        ${'★'.repeat(val.puntuacion)}${'☆'.repeat(5 - val.puntuacion)}
                    </span>
                </div>
                ${val.comentario ? `<p class="mb-1 small">${val.comentario}</p>` : ''}
                <small class="text-muted">${new Date(val.created_at).toLocaleDateString()}</small>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
    }
}

// ==================== PROTOCOLOS ====================

async function loadProtocolos() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.location.origin}/api/protocolos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al cargar protocolos');
        
        const protocolos = await response.json();
        const container = document.getElementById('protocolos-list');
        
        if (protocolos.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center text-muted py-5">
                    <i class="fas fa-clipboard-list fa-3x mb-3"></i>
                    <p>No hay protocolos registrados. Crea tu primer protocolo.</p>
                </div>
            `;
            return;
        }
        
        const categoriaIcons = {
            'consulta': 'fa-stethoscope',
            'cirugia': 'fa-scalpel',
            'emergencia': 'fa-ambulance',
            'vacunacion': 'fa-syringe',
            'otro': 'fa-clipboard'
        };
        
        container.innerHTML = protocolos.map(protocolo => `
            <div class="col-md-6 mb-3">
                <div class="card protocolo-item">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">
                                <i class="fas ${categoriaIcons[protocolo.categoria] || 'fa-clipboard'} text-primary me-2"></i>
                                ${protocolo.titulo}
                            </h6>
                            <span class="badge ${protocolo.activo ? 'bg-success' : 'bg-secondary'}">
                                ${protocolo.activo ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        <p class="card-text text-muted small">${protocolo.descripcion}</p>
                        <div class="mb-2">
                            <span class="badge bg-info">${protocolo.categoria}</span>
                            <small class="text-muted ms-2">Orden: ${protocolo.orden}</small>
                        </div>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-primary" onclick="viewProtocolo(${protocolo.id})">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            <button class="btn btn-sm btn-outline-primary" onclick="editProtocolo(${protocolo.id})">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteProtocolo(${protocolo.id})">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar protocolos');
    }
}

function showProtocoloModal(protocoloId = null) {
    const modal = new bootstrap.Modal(document.getElementById('protocoloModal'));
    const form = document.getElementById('protocolo-form');
    form.reset();
    
    if (protocoloId) {
        document.getElementById('protocoloModalTitle').textContent = 'Editar Protocolo';
        loadProtocoloData(protocoloId);
    } else {
        document.getElementById('protocoloModalTitle').textContent = 'Nuevo Protocolo';
        document.getElementById('protocolo_id').value = '';
    }
    
    modal.show();
}

async function loadProtocoloData(protocoloId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.location.origin}/api/protocolos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const protocolos = await response.json();
        const protocolo = protocolos.find(p => p.id === protocoloId);
        
        if (protocolo) {
            document.getElementById('protocolo_id').value = protocolo.id;
            document.querySelector('#protocolo-form [name="titulo"]').value = protocolo.titulo;
            document.querySelector('#protocolo-form [name="categoria"]').value = protocolo.categoria;
            document.querySelector('#protocolo-form [name="descripcion"]').value = protocolo.descripcion;
            document.querySelector('#protocolo-form [name="contenido"]').value = protocolo.contenido;
            document.querySelector('#protocolo-form [name="orden"]').value = protocolo.orden;
            document.getElementById('protocolo_activo').checked = protocolo.activo;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

document.getElementById('protocolo-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        titulo: formData.get('titulo'),
        categoria: formData.get('categoria'),
        descripcion: formData.get('descripcion'),
        contenido: formData.get('contenido'),
        orden: parseInt(formData.get('orden')) || 0,
        activo: formData.get('activo') === 'on'
    };
    
    const protocoloId = document.getElementById('protocolo_id').value;
    const token = localStorage.getItem('token');
    
    try {
        const url = protocoloId 
            ? `${window.location.origin}/api/protocolos/${protocoloId}`
            : `${window.location.origin}/api/protocolos`;
        
        const response = await fetch(url, {
            method: protocoloId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('Error al guardar protocolo');
        
        alert('Protocolo guardado exitosamente');
        bootstrap.Modal.getInstance(document.getElementById('protocoloModal')).hide();
        loadProtocolos();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar protocolo');
    }
});

function editProtocolo(protocoloId) {
    showProtocoloModal(protocoloId);
}

async function viewProtocolo(protocoloId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.location.origin}/api/protocolos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const protocolos = await response.json();
        const protocolo = protocolos.find(p => p.id === protocoloId);
        
        if (protocolo) {
            alert(`${protocolo.titulo}\n\n${protocolo.contenido}`);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteProtocolo(protocoloId) {
    if (!confirm('¿Estás seguro de eliminar este protocolo?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.location.origin}/api/protocolos/${protocoloId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al eliminar protocolo');
        
        alert('Protocolo eliminado exitosamente');
        loadProtocolos();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar protocolo');
    }
}
