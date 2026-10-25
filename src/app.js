const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env")
});

const express = require("express");
const pool = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "10kb" }));

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.status(200).json({
      estado: "ok",
      base_de_datos: "conectada"
    });
  } catch (error) {
    console.error("Error de conexión MySQL:", error.code);

    res.status(503).json({
      estado: "error",
      mensaje: "No se pudo conectar con la base de datos"
    });
  }
});
app.get("/api/libros", async (req, res) => {
  try {
    const [libros] = await pool.query(`
      SELECT
        l.id,
        l.codigo,
        l.titulo,
        l.autor,
        l.isbn,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM prestamos p
            WHERE p.libro_id = l.id
              AND p.fecha_devolucion IS NULL
          )
          THEN 'Prestado'
          ELSE 'Disponible'
        END AS disponibilidad
      FROM libros l
      ORDER BY l.id
    `);

    res.status(200).json(libros);
  } catch (error) {
    console.error("Error al consultar libros:", error.code);

    res.status(500).json({
      mensaje: "No se pudieron consultar los libros"
    });
  }
});

app.get("/api/libros/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      mensaje: "El ID debe ser un número entero positivo"
    });
  }

  try {
    const [libros] = await pool.execute(`
      SELECT
        l.id,
        l.codigo,
        l.titulo,
        l.autor,
        l.isbn,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM prestamos p
            WHERE p.libro_id = l.id
              AND p.fecha_devolucion IS NULL
          )
          THEN 'Prestado'
          ELSE 'Disponible'
        END AS disponibilidad
      FROM libros l
      WHERE l.id = ?
    `, [id]);

    if (libros.length === 0) {
      return res.status(404).json({
        mensaje: "Libro no encontrado"
      });
    }

    res.status(200).json(libros[0]);
  } catch (error) {
    console.error("Error al consultar libro:", error.code);

    res.status(500).json({
      mensaje: "No se pudo consultar el libro"
    });
  }
});
app.post("/api/libros", async (req, res) => {
  const datos = req.body;

  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    return res.status(400).json({
      mensaje: "Debes enviar un objeto JSON con los datos del libro"
    });
  }

  const { codigo, titulo, autor, isbn } = datos;

  const campos = [
    ["codigo", codigo, 30],
    ["titulo", titulo, 200],
    ["autor", autor, 150]
  ];

  for (const [nombre, valor, limite] of campos) {
    if (typeof valor !== "string" || !valor.trim()) {
      return res.status(400).json({
        mensaje: `El campo ${nombre} es obligatorio y debe ser texto`
      });
    }

    if (valor.trim().length > limite) {
      return res.status(400).json({
        mensaje: `El campo ${nombre} admite hasta ${limite} caracteres`
      });
    }
  }

  if (
    isbn !== undefined &&
    isbn !== null &&
    (typeof isbn !== "string" || isbn.trim().length > 20)
  ) {
    return res.status(400).json({
      mensaje: "El ISBN debe ser texto de hasta 20 caracteres o null"
    });
  }

  const libro = {
    codigo: codigo.trim(),
    titulo: titulo.trim(),
    autor: autor.trim(),
    isbn: typeof isbn === "string" ? isbn.trim() || null : null
  };

  try {
    const [resultado] = await pool.execute(
      `INSERT INTO libros (codigo, titulo, autor, isbn)
       VALUES (?, ?, ?, ?)`,
      [libro.codigo, libro.titulo, libro.autor, libro.isbn]
    );

    res
      .status(201)
      .location(`/api/libros/${resultado.insertId}`)
      .json({
        mensaje: "Libro registrado correctamente",
        libro: {
          id: resultado.insertId,
          ...libro,
          disponibilidad: "Disponible"
        }
      });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        mensaje: "Ya existe un ejemplar con ese código"
      });
    }

    console.error("Error al registrar libro:", error.code);

    res.status(500).json({
      mensaje: "No se pudo registrar el libro"
    });
  }
});

app.put("/api/libros/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      mensaje: "El ID debe ser un número entero positivo"
    });
  }

  const datos = req.body;

  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    return res.status(400).json({
      mensaje: "Debes enviar un objeto JSON con los datos del libro"
    });
  }

  const { codigo, titulo, autor, isbn } = datos;

  const campos = [
    ["codigo", codigo, 30],
    ["titulo", titulo, 200],
    ["autor", autor, 150]
  ];

  for (const [nombre, valor, limite] of campos) {
    if (typeof valor !== "string" || !valor.trim()) {
      return res.status(400).json({
        mensaje: `El campo ${nombre} es obligatorio y debe ser texto`
      });
    }

    if (valor.trim().length > limite) {
      return res.status(400).json({
        mensaje: `El campo ${nombre} admite hasta ${limite} caracteres`
      });
    }
  }

  if (
    isbn !== undefined &&
    isbn !== null &&
    (typeof isbn !== "string" || isbn.trim().length > 20)
  ) {
    return res.status(400).json({
      mensaje: "El ISBN debe ser texto de hasta 20 caracteres o null"
    });
  }

  const libro = {
    codigo: codigo.trim(),
    titulo: titulo.trim(),
    autor: autor.trim(),
    isbn: typeof isbn === "string" ? isbn.trim() || null : null
  };

  try {
    const [resultado] = await pool.execute(
      `UPDATE libros
       SET codigo = ?, titulo = ?, autor = ?, isbn = ?
       WHERE id = ?`,
      [libro.codigo, libro.titulo, libro.autor, libro.isbn, id]
    );

    if (resultado.affectedRows === 0) {
      const [existentes] = await pool.execute(
        "SELECT id FROM libros WHERE id = ?",
        [id]
      );

      if (existentes.length === 0) {
        return res.status(404).json({
          mensaje: "Libro no encontrado"
        });
      }
    }

    res.status(200).json({
      mensaje: "Libro actualizado correctamente",
      libro: {
        id,
        ...libro
      }
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        mensaje: "Ya existe otro ejemplar con ese código"
      });
    }

    console.error("Error al actualizar libro:", error.code);

    res.status(500).json({
      mensaje: "No se pudo actualizar el libro"
    });
  }
});

app.delete("/api/libros/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      mensaje: "El ID debe ser un número entero positivo"
    });
  }

  try {
    const [resultado] = await pool.execute(
      "DELETE FROM libros WHERE id = ?",
      [id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: "Libro no encontrado"
      });
    }

    res.status(200).json({
      mensaje: "Libro eliminado correctamente",
      id
    });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        mensaje:
          "No se puede eliminar este ejemplar porque tiene historial de préstamos"
      });
    }

    console.error("Error al eliminar libro:", error.code);

    res.status(500).json({
      mensaje: "No se pudo eliminar el libro"
    });
  }
});

app.get("/api/usuarios", async (req, res) => {
  try {
    const [usuarios] = await pool.execute(`
      SELECT id, nombre, correo, telefono
      FROM usuarios
      ORDER BY id
    `);

    res.status(200).json(usuarios);
  } catch (error) {
    console.error("Error al consultar usuarios:", error.code);

    res.status(500).json({
      mensaje: "No se pudieron consultar los usuarios"
    });
  }
});

app.post("/api/usuarios", async (req, res) => {
  const datos = req.body;

  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    return res.status(400).json({
      mensaje: "Debes enviar un objeto JSON con los datos del usuario"
    });
  }

  const { nombre, correo, telefono } = datos;

  if (
    typeof nombre !== "string" ||
    !nombre.trim() ||
    nombre.trim().length > 150
  ) {
    return res.status(400).json({
      mensaje: "El nombre es obligatorio y admite hasta 150 caracteres"
    });
  }

  if (
    typeof correo !== "string" ||
    correo.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
  ) {
    return res.status(400).json({
      mensaje: "Debes ingresar un correo electrónico válido"
    });
  }

  if (
    telefono !== undefined &&
    telefono !== null &&
    (
      typeof telefono !== "string" ||
      (
        telefono.trim() !== "" &&
        !/^[+0-9()\s-]{7,25}$/.test(telefono.trim())
      )
    )
  ) {
    return res.status(400).json({
      mensaje: "El teléfono debe contener entre 7 y 25 caracteres válidos"
    });
  }

  const usuario = {
    nombre: nombre.trim(),
    correo: correo.trim().toLowerCase(),
    telefono:
      typeof telefono === "string" ? telefono.trim() || null : null
  };

  try {
    const [resultado] = await pool.execute(
      `INSERT INTO usuarios (nombre, correo, telefono)
       VALUES (?, ?, ?)`,
      [usuario.nombre, usuario.correo, usuario.telefono]
    );

    res.status(201).json({
      mensaje: "Usuario registrado correctamente",
      usuario: {
        id: resultado.insertId,
        ...usuario
      }
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        mensaje: "Ya existe un usuario con ese correo"
      });
    }

    console.error("Error al registrar usuario:", error.code);

    res.status(500).json({
      mensaje: "No se pudo registrar el usuario"
    });
  }
});

app.post("/api/prestamos", async (req, res) => {
  const datos = req.body;

  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    return res.status(400).json({
      mensaje: "Debes enviar un objeto JSON con los datos del préstamo"
    });
  }

  const { libro_id, usuario_id, fecha_limite } = datos;

  if (
    !Number.isSafeInteger(libro_id) ||
    libro_id <= 0 ||
    !Number.isSafeInteger(usuario_id) ||
    usuario_id <= 0
  ) {
    return res.status(400).json({
      mensaje: "libro_id y usuario_id deben ser números enteros positivos"
    });
  }

  if (
    typeof fecha_limite !== "string" ||
    !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(fecha_limite)
  ) {
    return res.status(400).json({
      mensaje: "La fecha límite debe tener el formato AAAA-MM-DD"
    });
  }

  const fecha = new Date(`${fecha_limite}T00:00:00.000Z`);

  if (
    Number.isNaN(fecha.getTime()) ||
    fecha.toISOString().slice(0, 10) !== fecha_limite
  ) {
    return res.status(400).json({
      mensaje: "La fecha límite no es una fecha válida"
    });
  }

  let conexion;

  try {
    conexion = await pool.getConnection();
    await conexion.beginTransaction();

    const rechazar = async (estado, mensaje) => {
      await conexion.rollback();
      return res.status(estado).json({ mensaje });
    };

    // Bloquea el ejemplar mientras se registra el préstamo.
    const [libros] = await conexion.execute(
      "SELECT id FROM libros WHERE id = ? FOR UPDATE",
      [libro_id]
    );

    if (libros.length === 0) {
      return await rechazar(404, "Libro no encontrado");
    }

    const [usuarios] = await conexion.execute(
      "SELECT id FROM usuarios WHERE id = ? FOR SHARE",
      [usuario_id]
    );

    if (usuarios.length === 0) {
      return await rechazar(404, "Usuario no encontrado");
    }

    const [validacionFecha] = await conexion.execute(
      "SELECT CAST(? AS DATE) >= CURDATE() AS valida",
      [fecha_limite]
    );

    if (!validacionFecha[0].valida) {
      return await rechazar(
        400,
        "La fecha límite no puede ser anterior a hoy"
      );
    }

    const [activos] = await conexion.execute(
      `SELECT id
       FROM prestamos
       WHERE libro_id = ?
         AND fecha_devolucion IS NULL
       FOR UPDATE`,
      [libro_id]
    );

    if (activos.length > 0) {
      return await rechazar(
        409,
        "El ejemplar ya está prestado y todavía no ha sido devuelto"
      );
    }

    const [resultado] = await conexion.execute(
      `INSERT INTO prestamos (
         libro_id, usuario_id, fecha_prestamo, fecha_limite
       )
       VALUES (?, ?, NOW(), ?)`,
      [libro_id, usuario_id, fecha_limite]
    );

    await conexion.commit();

    res.status(201).json({
      mensaje: "Préstamo registrado correctamente",
      prestamo: {
        id: resultado.insertId,
        libro_id,
        usuario_id,
        fecha_limite,
        estado: "Activo"
      }
    });
  } catch (error) {
    if (conexion) {
      try {
        await conexion.rollback();
      } catch (errorRollback) {
        console.error("Error al revertir:", errorRollback.code);
      }
    }

    console.error("Error al registrar préstamo:", error.code);

    res.status(500).json({
      mensaje: "No se pudo registrar el préstamo"
    });
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
});

app.get("/api/prestamos", async (req, res) => {
  try {
    const [prestamos] = await pool.execute(`
      SELECT
        p.id AS prestamo_id,
        l.id AS libro_id,
        l.codigo,
        l.titulo,
        u.id AS usuario_id,
        u.nombre AS usuario,
        p.fecha_prestamo,
        p.fecha_limite,
        p.fecha_devolucion,
        CASE
          WHEN p.fecha_devolucion IS NOT NULL THEN 'Devuelto'
          WHEN p.fecha_limite < CURDATE() THEN 'Vencido'
          ELSE 'Activo'
        END AS estado
      FROM prestamos p
      INNER JOIN libros l ON l.id = p.libro_id
      INNER JOIN usuarios u ON u.id = p.usuario_id
      ORDER BY p.fecha_prestamo DESC, p.id DESC
    `);

    res.status(200).json(prestamos);
  } catch (error) {
    console.error("Error al consultar préstamos:", error.code);

    res.status(500).json({
      mensaje: "No se pudo consultar el historial de préstamos"
    });
  }
});
app.put("/api/prestamos/:id/devolucion", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      mensaje: "El ID del préstamo debe ser un entero positivo"
    });
  }

  try {
    const [resultado] = await pool.execute(
      `UPDATE prestamos
       SET fecha_devolucion = NOW()
       WHERE id = ?
         AND fecha_devolucion IS NULL`,
      [id]
    );

    if (resultado.affectedRows === 0) {
      const [prestamos] = await pool.execute(
        "SELECT id FROM prestamos WHERE id = ?",
        [id]
      );

      if (prestamos.length === 0) {
        return res.status(404).json({
          mensaje: "Préstamo no encontrado"
        });
      }

      return res.status(409).json({
        mensaje: "Este préstamo ya fue devuelto"
      });
    }

    res.status(200).json({
      mensaje: "Devolución registrada correctamente",
      prestamo_id: id
    });
  } catch (error) {
    console.error("Error al registrar devolución:", error.code);

    res.status(500).json({
      mensaje: "No se pudo registrar la devolución"
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    mensaje: "Ruta no encontrada"
  });
});

app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      mensaje: "El cuerpo de la solicitud no contiene JSON válido"
    });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      mensaje: "La solicitud supera el tamaño permitido"
    });
  }

  console.error("Error del servidor:", error.code || error.name);

  res.status(500).json({
    mensaje: "Error interno del servidor"
  });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Servidor disponible en http://localhost:${PORT}`);
});