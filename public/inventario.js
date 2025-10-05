// ==================== SISTEMA DE INVENTARIO CON CÓDIGO DE BARRAS ====================

const API_URL = window.location.origin;
let productos = [];
let scanning = false;

// Verificar autenticación
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Debes iniciar sesión');
        window.location.href = '/';
        return;
    }
    
    loadProductos();
});

// ==================== CARGAR PRODUCTOS ====================

async function loadProductos() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/inventario/productos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error al cargar productos');

        productos = await response.json();
        renderProductos(productos);
        updateEstadisticas(productos);
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al cargar inventario', 'error');
    }
}

function renderProductos(items) {
    const tbody = document.getElementById('productos-list');
    
    if (items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">
                    <i class="fas fa-boxes fa-3x mb-3"></i><br>
                    No hay productos. Escanea un código de barras o agrega manualmente.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = items.map(p => {
        const stockBadge = getStockBadge(p);
        const vencimientoBadge = getVencimientoBadge(p.fecha_vencimiento);
        
        return `
            <tr>
                <td><small class="text-muted">${p.codigo_barras || 'N/A'}</small></td>
                <td>
                    <strong>${p.nombre}</strong><br>
                    <small class="text-muted">${p.marca || ''} ${p.presentacion || ''}</small>
                </td>
                <td><span class="badge bg-secondary">${p.tipo}</span></td>
                <td>${stockBadge}</td>
                <td>$${parseFloat(p.precio_venta || 0).toFixed(2)}</td>
                <td>${vencimientoBadge}</td>
                <td>${p.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="verDetalles(${p.id})" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="ajustarStock(${p.id})" title="Ajustar stock">
                        <i class="fas fa-exchange-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="editarProducto(${p.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function getStockBadge(producto) {
    const stock = producto.stock_actual;
    const minimo = producto.stock_minimo;
    
    if (stock === 0) {
        return `<span class="badge bg-danger stock-badge">${stock} (Sin stock)</span>`;
    } else if (stock <= minimo) {
        return `<span class="badge bg-warning stock-badge">${stock} (Bajo)</span>`;
    } else {
        return `<span class="badge bg-success stock-badge">${stock}</span>`;
    }
}

function getVencimientoBadge(fecha) {
    if (!fecha) return '<small class="text-muted">N/A</small>';
    
    const vencimiento = new Date(fecha);
    const hoy = new Date();
    const diasRestantes = Math.floor((vencimiento - hoy) / (1000 * 60 * 60 * 24));
    
    if (diasRestantes < 0) {
        return `<span class="badge bg-danger">Vencido</span>`;
    } else if (diasRestantes <= 30) {
        return `<span class="badge bg-warning">${diasRestantes} días</span>`;
    } else {
        return `<small class="text-muted">${vencimiento.toLocaleDateString('es-AR')}</small>`;
    }
}

function updateEstadisticas(items) {
    document.getElementById('total-productos').textContent = items.length;
    
    const stockBajo = items.filter(p => p.stock_actual <= p.stock_minimo).length;
    document.getElementById('stock-bajo').textContent = stockBajo;
    
    const porVencer = items.filter(p => {
        if (!p.fecha_vencimiento) return false;
        const dias = Math.floor((new Date(p.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24));
        return dias >= 0 && dias <= 30;
    }).length;
    document.getElementById('por-vencer').textContent = porVencer;
    
    const valorTotal = items.reduce((sum, p) => sum + (p.stock_actual * (p.precio_venta || 0)), 0);
    document.getElementById('valor-total').textContent = `$${valorTotal.toFixed(2)}`;
}

// ==================== ESCÁNER DE CÓDIGO DE BARRAS ====================

function showScannerModal() {
    const modalHTML = `
        <div class="modal fade" id="scannerModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-barcode me-2"></i>Escanear Código de Barras
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" onclick="stopScanner()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            Apunta la cámara al código de barras del producto. El sistema buscará automáticamente la información.
                        </div>
                        <div id="scanner-container">
                            <div id="scanner-viewport"></div>
                        </div>
                        <div id="scanner-result" class="mt-3" style="display: none;">
                            <div class="alert alert-success">
                                <strong>Código detectado:</strong> <span id="codigo-detectado"></span>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" onclick="stopScanner()">Cerrar</button>
                        <button type="button" class="btn btn-primary" onclick="ingresarManual()">Ingresar Código Manual</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const oldModal = document.getElementById('scannerModal');
    if (oldModal) oldModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('scannerModal'));
    modal.show();

    // Iniciar escáner después de que el modal se muestre
    document.getElementById('scannerModal').addEventListener('shown.bs.modal', function () {
        startScanner();
    });
}

function startScanner() {
    if (scanning) return;
    scanning = true;

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#scanner-viewport'),
            constraints: {
                width: 640,
                height: 480,
                facingMode: "environment"
            }
        },
        decoder: {
            readers: [
                "ean_reader",
                "ean_8_reader",
                "code_128_reader",
                "code_39_reader",
                "upc_reader",
                "upc_e_reader"
            ]
        }
    }, function(err) {
        if (err) {
            console.error('Error iniciando escáner:', err);
            showNotification('Error al acceder a la cámara. Verifica los permisos.', 'error');
            scanning = false;
            return;
        }
        Quagga.start();
    });

    Quagga.onDetected(function(result) {
        const code = result.codeResult.code;
        console.log('Código detectado:', code);
        
        document.getElementById('codigo-detectado').textContent = code;
        document.getElementById('scanner-result').style.display = 'block';
        
        // Detener escáner y buscar producto
        stopScanner();
        buscarProductoPorCodigo(code);
    });
}

function stopScanner() {
    if (scanning) {
        Quagga.stop();
        scanning = false;
    }
}

function ingresarManual() {
    const codigo = prompt('Ingresa el código de barras manualmente:');
    if (codigo) {
        stopScanner();
        bootstrap.Modal.getInstance(document.getElementById('scannerModal')).hide();
        buscarProductoPorCodigo(codigo);
    }
}

// ==================== BUSCAR PRODUCTO POR CÓDIGO ====================

async function buscarProductoPorCodigo(codigo) {
    try {
        // Primero buscar en el inventario local
        const productoLocal = productos.find(p => p.codigo_barras === codigo);
        
        if (productoLocal) {
            showNotification('Producto encontrado en tu inventario', 'info');
            ajustarStock(productoLocal.id);
            return;
        }

        // Si no está, buscar en API externa (OpenFoodFacts para alimentos)
        showNotification('Buscando producto en base de datos...', 'info');
        
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${codigo}.json`);
        const data = await response.json();

        if (data.status === 1 && data.product) {
            const product = data.product;
            showProductoEncontrado({
                codigo_barras: codigo,
                nombre: product.product_name || 'Producto sin nombre',
                marca: product.brands || '',
                descripcion: product.generic_name || '',
                imagen_url: product.image_url || '',
                categoria: product.categories || '',
                tipo: 'alimento'
            });
        } else {
            // No encontrado, permitir agregar manualmente
            showNotification('Producto no encontrado. Agrégalo manualmente.', 'warning');
            showProductoModal(codigo);
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al buscar producto. Agrégalo manualmente.', 'warning');
        showProductoModal(codigo);
    }
}

function showProductoEncontrado(data) {
    const modalHTML = `
        <div class="modal fade" id="productoEncontradoModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">Producto Encontrado</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-4">
                                ${data.imagen_url ? `<img src="${data.imagen_url}" class="img-fluid rounded" alt="${data.nombre}">` : '<div class="bg-light p-5 text-center"><i class="fas fa-image fa-3x text-muted"></i></div>'}
                            </div>
                            <div class="col-md-8">
                                <h4>${data.nombre}</h4>
                                <p><strong>Marca:</strong> ${data.marca}</p>
                                <p><strong>Código:</strong> ${data.codigo_barras}</p>
                                <p>${data.descripcion}</p>
                                
                                <form id="agregarProductoForm">
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Stock Inicial *</label>
                                            <input type="number" class="form-control" id="stock-inicial" min="0" required>
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Stock Mínimo *</label>
                                            <input type="number" class="form-control" id="stock-minimo" value="10" min="0" required>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Precio Compra</label>
                                            <input type="number" class="form-control" id="precio-compra" min="0" step="0.01">
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Precio Venta *</label>
                                            <input type="number" class="form-control" id="precio-venta" min="0" step="0.01" required>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Ubicación en la veterinaria</label>
                                        <input type="text" class="form-control" id="ubicacion" placeholder="Ej: Estante A, Góndola 2">
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-success" onclick="agregarProductoEncontrado('${data.codigo_barras}', '${data.nombre.replace(/'/g, "\\'")}', '${data.marca}', '${data.tipo}', '${data.imagen_url}')">
                            <i class="fas fa-plus me-1"></i>Agregar al Inventario
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const oldModal = document.getElementById('productoEncontradoModal');
    if (oldModal) oldModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    new bootstrap.Modal(document.getElementById('productoEncontradoModal')).show();
}

async function agregarProductoEncontrado(codigo, nombre, marca, tipo, imagen) {
    const form = document.getElementById('agregarProductoForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const data = {
        codigo_barras: codigo,
        nombre: nombre,
        marca: marca,
        tipo: tipo,
        imagen_url: imagen,
        stock_actual: parseInt(document.getElementById('stock-inicial').value),
        stock_minimo: parseInt(document.getElementById('stock-minimo').value),
        precio_compra: parseFloat(document.getElementById('precio-compra').value) || 0,
        precio_venta: parseFloat(document.getElementById('precio-venta').value),
        ubicacion: document.getElementById('ubicacion').value,
        categoria: tipo
    };

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/inventario/productos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Error al agregar producto');

        showNotification('Producto agregado exitosamente', 'success');
        bootstrap.Modal.getInstance(document.getElementById('productoEncontradoModal')).hide();
        loadProductos();
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al agregar producto', 'error');
    }
}

// ==================== FUNCIONES AUXILIARES ====================

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

function filtrarProductos() {
    // Implementar filtros
    loadProductos();
}

function limpiarFiltros() {
    document.getElementById('filtro-tipo').value = '';
    document.getElementById('filtro-stock').value = '';
    document.getElementById('buscar-producto').value = '';
    filtrarProductos();
}

function showProductoModal(codigoBarras = '') {
    // Implementar modal de agregar producto manual
    showNotification('Función en desarrollo', 'info');
}

function verDetalles(id) {
    showNotification('Función en desarrollo', 'info');
}

function ajustarStock(id) {
    showNotification('Función en desarrollo', 'info');
}

function editarProducto(id) {
    showNotification('Función en desarrollo', 'info');
}

function showMovimientosModal() {
    showNotification('Función en desarrollo', 'info');
}

function showAlertasModal() {
    showNotification('Función en desarrollo', 'info');
}
