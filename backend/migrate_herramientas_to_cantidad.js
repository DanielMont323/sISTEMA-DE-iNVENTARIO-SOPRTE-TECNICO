const mongoose = require('mongoose');
require('dotenv').config();

const Herramienta = require('./src/models/Herramienta');
const Movimiento = require('./src/models/Movimiento');
const ResguardoHerramienta = require('./src/models/ResguardoHerramienta');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Falta MONGODB_URI en variables de entorno');
  process.exit(1);
}

const groupKey = (doc) => {
  const nombre = (doc.nombre || '').trim().toLowerCase();
  const categoria = (doc.categoria || '').trim().toLowerCase();
  const ubicacion = (doc.ubicacion || '').trim().toLowerCase();
  return `${nombre}__${categoria}__${ubicacion}`;
};

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Conectado a MongoDB');

  // La colección "herramientas" puede conservar índices viejos (ej: codigo_1 unique)
  // que bloquean la inserción del nuevo modelo (sin campo codigo).
  try {
    const indexes = await mongoose.connection.collection('herramientas').indexes();
    const hasCodigoIndex = indexes.some((idx) => idx?.name === 'codigo_1');
    if (hasCodigoIndex) {
      await mongoose.connection.collection('herramientas').dropIndex('codigo_1');
      console.log('✅ Índice viejo eliminado: codigo_1');
    }
  } catch (e) {
    console.log('ℹ️ No se pudo validar/eliminar indice codigo_1 (puede no existir).');
  }

  const rawHerramientas = await mongoose.connection.collection('herramientas').find({}).toArray();
  console.log(`ℹ️ Herramientas existentes (raw): ${rawHerramientas.length}`);

  const grouped = new Map();
  for (const h of rawHerramientas) {
    const k = groupKey(h);
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k).push(h);
  }

  console.log(`ℹ️ Grupos a consolidar: ${grouped.size}`);

  const oldToNew = new Map();

  // Crear nuevas herramientas (por tipo)
  for (const [k, items] of grouped.entries()) {
    const sample = items[0];

    const total = items.length;
    const mantenimiento = items.filter(i => (i.estado || '').toLowerCase() === 'mantenimiento').length;
    const asignadas = items.filter(i => (i.estado || '').toLowerCase() === 'asignada').length;
    const disponible = Math.max(0, total - mantenimiento - asignadas);

    const nueva = await Herramienta.create({
      nombre: sample.nombre || 'SIN NOMBRE',
      descripcion: sample.descripcion || '',
      categoria: sample.categoria || 'SIN CATEGORIA',
      ubicacion: sample.ubicacion || 'SIN UBICACION',
      cantidad_total: total,
      cantidad_disponible: disponible,
      cantidad_mantenimiento: mantenimiento,
      activo: sample.activo !== undefined ? !!sample.activo : true,
    });

    for (const old of items) {
      oldToNew.set(String(old._id), nueva._id);
    }
  }

  console.log(`✅ Nuevas herramientas creadas: ${grouped.size}`);

  // Crear resguardos en base a las herramientas antiguas asignadas
  const resguardosAgg = new Map();
  for (const h of rawHerramientas) {
    const estado = (h.estado || '').toLowerCase();
    if (estado !== 'asignada') continue;

    const tecnicoId = h.asignada_a ? String(h.asignada_a) : null;
    if (!tecnicoId) continue;

    const newId = oldToNew.get(String(h._id));
    if (!newId) continue;

    const key = `${String(newId)}__${tecnicoId}`;
    const prev = resguardosAgg.get(key) || { herramienta_id: newId, tecnico_id: h.asignada_a, cantidad: 0, fecha_asignacion: null };

    prev.cantidad += 1;

    const fa = h.fecha_asignacion ? new Date(h.fecha_asignacion) : null;
    if (!prev.fecha_asignacion || (fa && fa < prev.fecha_asignacion)) {
      prev.fecha_asignacion = fa || prev.fecha_asignacion || new Date();
    }

    resguardosAgg.set(key, prev);
  }

  if (resguardosAgg.size) {
    await ResguardoHerramienta.insertMany(Array.from(resguardosAgg.values()), { ordered: false });
  }
  console.log(`✅ Resguardos creados: ${resguardosAgg.size}`);

  // Migrar movimientos: item_id de herramientas antiguas -> herramienta nueva
  const bulk = [];
  for (const [oldId, newId] of oldToNew.entries()) {
    bulk.push({
      updateMany: {
        filter: { item_tipo: 'Herramienta', item_id: new mongoose.Types.ObjectId(oldId) },
        update: { $set: { item_id: newId } }
      }
    });
  }

  if (bulk.length) {
    const res = await Movimiento.bulkWrite(bulk, { ordered: false });
    console.log('✅ Movimientos migrados:', {
      matched: res.matchedCount,
      modified: res.modifiedCount
    });
  }

  // Borrar herramientas antiguas (ya consolidado)
  const oldIds = rawHerramientas.map(h => h._id);
  if (oldIds.length) {
    await mongoose.connection.collection('herramientas').deleteMany({ _id: { $in: oldIds } });
  }
  console.log(`✅ Herramientas antiguas eliminadas: ${oldIds.length}`);

  console.log('🎉 Migración completada');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Error en migración:', e);
    process.exit(1);
  });
