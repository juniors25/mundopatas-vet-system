-- ============================================
-- SCRIPT PARA BORRAR TODOS LOS DATOS
-- EJECUTAR EN RENDER DATABASE CONSOLE
-- ============================================

-- IMPORTANTE: Este script borra TODOS los datos de TODAS las tablas
-- NO SE PUEDE DESHACER

BEGIN;

-- Borrar en orden para respetar foreign keys
DELETE FROM notificaciones;
DELETE FROM notificaciones_enviadas;
DELETE FROM alertas_alimento;
DELETE FROM telemedicina_mensajes;
DELETE FROM telemedicina_sesiones;
DELETE FROM movimientos_inventario;
DELETE FROM inventario_productos;
DELETE FROM pagos;
DELETE FROM factura_items;
DELETE FROM facturas;
DELETE FROM citas;
DELETE FROM servicios_veterinaria;
DELETE FROM valoraciones;
DELETE FROM ubicaciones;
DELETE FROM faq;
DELETE FROM protocolos_trabajo;
DELETE FROM analisis;
DELETE FROM vacunas;
DELETE FROM consultas;
DELETE FROM mascotas;
DELETE FROM clientes;
DELETE FROM licencias;
DELETE FROM historial_pagos_clientes;
DELETE FROM mis_clientes_ventas;
DELETE FROM configuraciones;
DELETE FROM notificaciones_config;
DELETE FROM veterinarios;

-- Reiniciar secuencias (IDs empiezan desde 1)
ALTER SEQUENCE veterinarios_id_seq RESTART WITH 1;
ALTER SEQUENCE clientes_id_seq RESTART WITH 1;
ALTER SEQUENCE mascotas_id_seq RESTART WITH 1;
ALTER SEQUENCE consultas_id_seq RESTART WITH 1;
ALTER SEQUENCE licencias_id_seq RESTART WITH 1;
ALTER SEQUENCE facturas_id_seq RESTART WITH 1;
ALTER SEQUENCE citas_id_seq RESTART WITH 1;

COMMIT;

-- Verificar que todo se borró
SELECT 'veterinarios' as tabla, COUNT(*) as registros FROM veterinarios
UNION ALL
SELECT 'clientes', COUNT(*) FROM clientes
UNION ALL
SELECT 'mascotas', COUNT(*) FROM mascotas
UNION ALL
SELECT 'licencias', COUNT(*) FROM licencias;

-- Resultado esperado: todos en 0
