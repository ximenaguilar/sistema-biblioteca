const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env")
});

const express = require("express");
const pool = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "10kb" }));

app.get("/", (req, res) => {
  res.json({
    mensaje: "API del Sistema de Gestión de Biblioteca"
  });
});

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