const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Directorio de migraciones
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

// Crear directorio de migraciones si no existe
if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
}

// Generar nombre de migración con timestamp
const now = new Date();
const timestamp = now.toISOString().replace(/[^0-9]/g, '').slice(0, 14);
const migrationName = process.argv[2] || 'new_migration';
const safeName = migrationName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
const fileName = `${timestamp}_${safeName}.sql`;
const filePath = path.join(MIGRATIONS_DIR, fileName);

// Contenido por defecto de la migración
const content = `-- Migración: ${migrationName}
-- ID: ${uuidv4()}
-- Fecha: ${now.toISOString()}

-- Aquí van tus sentencias SQL para esta migración
-- Ejemplo:
-- CREATE TABLE nueva_tabla (
--     id SERIAL PRIMARY KEY,
--     nombre VARCHAR(100) NOT NULL,
--     creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- ALTER TABLE tabla_existente ADD COLUMN nueva_columna VARCHAR(255);
`;

// Escribir el archivo de migración
fs.writeFileSync(filePath, content, 'utf8');

console.log(`✅ Nueva migración creada: ${filePath}`);
console.log('Edita el archivo para agregar las sentencias SQL necesarias.');
