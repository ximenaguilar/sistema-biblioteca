const $ = (id) => document.getElementById(id);

let libros = [];

function mensaje(texto, error = false) {
  $("mensaje").textContent = texto;
  $("mensaje").className = error ? "error" : "";
}

async function api(ruta, metodo = "GET", datos) {
  const opciones = { method: metodo };

  if (datos !== undefined) {
    opciones.headers = { "Content-Type": "application/json" };
    opciones.body = JSON.stringify(datos);
  }

  const respuesta = await fetch(`/api${ruta}`, opciones);
  const contenido = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(contenido.mensaje || "No se pudo completar la operación");
  }

  return contenido;
}

function celda(fila, texto) {
  const td = document.createElement("td");
  td.textContent = texto ?? "—";
  fila.append(td);
  return td;
}

function estado(fila, texto) {
  const td = document.createElement("td");
  const etiqueta = document.createElement("span");
  etiqueta.className = `estado ${texto.toLowerCase()}`;
  etiqueta.textContent = texto;
  td.append(etiqueta);
  fila.append(td);
}

function boton(contenedor, texto, accion, clase = "") {
  const elemento = document.createElement("button");
  elemento.type = "button";
  elemento.textContent = texto;
  elemento.className = clase;
  elemento.addEventListener("click", () => accion(elemento));
  contenedor.append(elemento);
}

function vacio(tbody, columnas, texto) {
  const fila = document.createElement("tr");
  const td = celda(fila, texto);
  td.colSpan = columnas;
  tbody.append(fila);
}

function llenarSelector(id, registros, textoInicial, etiqueta) {
  const select = $(id);
  select.replaceChildren(new Option(textoInicial, ""));

  registros.forEach((registro) => {
    select.add(new Option(etiqueta(registro), registro.id));
  });
}

function limpiarLibro() {
  $("form-libro").reset();
  $("libro-id").value = "";
  $("titulo-form-libro").textContent = "Registrar libro";
}

function editarLibro(libro) {
  $("libro-id").value = libro.id;
  $("libro-codigo").value = libro.codigo;
  $("libro-titulo").value = libro.titulo;
  $("libro-autor").value = libro.autor;
  $("libro-isbn").value = libro.isbn || "";
  $("titulo-form-libro").textContent = "Editar libro";
  $("libro-codigo").focus();
}

async function operar(botonActual, accion) {
  botonActual.disabled = true;

  try {
    const resultado = await accion();
    mensaje("Operación guardada. Actualizando información…");

    try {
      await cargarTodo();
      mensaje(resultado.mensaje || "Operación completada");
    } catch {
      mensaje(
        "El cambio se guardó, pero no se pudo actualizar la vista. Recarga la página.",
        true
      );
    }
  } catch (error) {
    mensaje(error.message, true);
  } finally {
    botonActual.disabled = false;
  }
}

async function eliminarLibro(libro, botonActual) {
  if (!confirm(`¿Eliminar el ejemplar ${libro.codigo}?`)) return;

  await operar(botonActual, async () => {
    const resultado = await api(`/libros/${libro.id}`, "DELETE");

    if ($("libro-id").value === String(libro.id)) {
      limpiarLibro();
    }

    return resultado;
  });
}

function mostrarLibros() {
  const tbody = $("lista-libros");
  tbody.replaceChildren();

  const busqueda = $("buscar-libro").value.trim().toLocaleLowerCase("es");

  const filtrados = libros.filter((libro) =>
    `${libro.codigo} ${libro.titulo} ${libro.autor}`
      .toLocaleLowerCase("es")
      .includes(busqueda)
  );

  filtrados.forEach((libro) => {
    const fila = document.createElement("tr");
    celda(fila, libro.codigo);
    celda(fila, libro.titulo);
    celda(fila, libro.autor);
    estado(fila, libro.disponibilidad);

    const acciones = celda(fila, "");
    boton(acciones, "Editar", () => editarLibro(libro), "secundario");
    boton(
      acciones,
      "Eliminar",
      (elemento) => eliminarLibro(libro, elemento),
      "peligro"
    );

    tbody.append(fila);
  });

  if (!filtrados.length) {
    vacio(tbody, 5, "No se encontraron libros.");
  }
}

function mostrarUsuarios(usuarios) {
  const tbody = $("lista-usuarios");
  tbody.replaceChildren();

  usuarios.forEach((usuario) => {
    const fila = document.createElement("tr");
    celda(fila, usuario.id);
    celda(fila, usuario.nombre);
    celda(fila, usuario.correo);
    celda(fila, usuario.telefono);
    tbody.append(fila);
  });

  if (!usuarios.length) {
    vacio(tbody, 4, "Todavía no hay usuarios registrados.");
  }
}

function fechaVisible(valor) {
  if (!valor) return "—";

  // Muestra la parte de fecha sin convertirla a otra zona horaria.
  const fecha = String(valor).slice(0, 10);
  const partes = fecha.split("-");
  return partes.length === 3 ? partes.reverse().join("/") : fecha;
}

function mostrarPrestamos(prestamos) {
  const tbody = $("lista-prestamos");
  tbody.replaceChildren();

  prestamos.forEach((prestamo) => {
    const fila = document.createElement("tr");
    celda(fila, prestamo.prestamo_id);
    celda(fila, `${prestamo.codigo} · ${prestamo.titulo}`);
    celda(fila, prestamo.usuario);
    celda(fila, fechaVisible(prestamo.fecha_prestamo));
    celda(fila, fechaVisible(prestamo.fecha_limite));
    celda(fila, fechaVisible(prestamo.fecha_devolucion));
    estado(fila, prestamo.estado);

    const acciones = celda(fila, "");

    if (!prestamo.fecha_devolucion) {
      boton(acciones, "Devolver", async (elemento) => {
        if (!confirm(`¿Registrar devolución de ${prestamo.codigo}?`)) return;

        await operar(elemento, () =>
          api(`/prestamos/${prestamo.prestamo_id}/devolucion`, "PUT")
        );
      });
    } else {
      acciones.textContent = "Finalizado";
    }

    tbody.append(fila);
  });

  if (!prestamos.length) {
    vacio(tbody, 8, "Todavía no hay préstamos registrados.");
  }
}

async function cargarTodo() {
  const [listaLibros, usuarios, prestamos] = await Promise.all([
    api("/libros"),
    api("/usuarios"),
    api("/prestamos")
  ]);

  libros = listaLibros;
  mostrarLibros();
  mostrarUsuarios(usuarios);
  mostrarPrestamos(prestamos);

  llenarSelector(
    "prestamo-libro",
    libros.filter((libro) => libro.disponibilidad === "Disponible"),
    "Selecciona un ejemplar",
    (libro) => `${libro.codigo} · ${libro.titulo}`
  );

  llenarSelector(
    "prestamo-usuario",
    usuarios,
    "Selecciona un usuario",
    (usuario) => `${usuario.id} · ${usuario.nombre}`
  );
}

document.querySelectorAll("[data-vista]").forEach((botonNav) => {
  botonNav.addEventListener("click", () => {
    const vista = botonNav.dataset.vista;

    document.querySelectorAll("main section").forEach((seccion) => {
      seccion.hidden = seccion.id !== `vista-${vista}`;
    });

    document.querySelectorAll("[data-vista]").forEach((elemento) => {
      elemento.setAttribute(
        "aria-pressed",
        String(elemento === botonNav)
      );
    });
  });
});

$("buscar-libro").addEventListener("input", mostrarLibros);
$("cancelar-libro").addEventListener("click", limpiarLibro);

$("form-libro").addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const id = $("libro-id").value;
  const datos = {
    codigo: $("libro-codigo").value.trim(),
    titulo: $("libro-titulo").value.trim(),
    autor: $("libro-autor").value.trim(),
    isbn: $("libro-isbn").value.trim() || null
  };

  if (!datos.codigo || !datos.titulo || !datos.autor) {
    mensaje("Completa código, título y autor.", true);
    return;
  }

  await operar(evento.currentTarget.querySelector("[type=submit]"), async () => {
    const resultado = await api(
      id ? `/libros/${id}` : "/libros",
      id ? "PUT" : "POST",
      datos
    );

    limpiarLibro();
    return resultado;
  });
});

$("form-usuario").addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const datos = {
    nombre: $("usuario-nombre").value.trim(),
    correo: $("usuario-correo").value.trim(),
    telefono: $("usuario-telefono").value.trim() || null
  };

  if (!datos.nombre) {
    mensaje("Ingresa el nombre del usuario.", true);
    return;
  }

  if (
    datos.telefono &&
    !/^[+0-9()\s-]{7,25}$/.test(datos.telefono)
  ) {
    mensaje("Revisa el formato del teléfono.", true);
    return;
  }

  await operar(evento.currentTarget.querySelector("[type=submit]"), async () => {
    const resultado = await api("/usuarios", "POST", datos);
    $("form-usuario").reset();
    return resultado;
  });
});

$("form-prestamo").addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const datos = {
    libro_id: Number($("prestamo-libro").value),
    usuario_id: Number($("prestamo-usuario").value),
    fecha_limite: $("prestamo-fecha").value
  };

  await operar(evento.currentTarget.querySelector("[type=submit]"), async () => {
    const resultado = await api("/prestamos", "POST", datos);
    $("form-prestamo").reset();
    return resultado;
  });
});

const hoy = new Date();
const mes = String(hoy.getMonth() + 1).padStart(2, "0");
const dia = String(hoy.getDate()).padStart(2, "0");
$("prestamo-fecha").min = `${hoy.getFullYear()}-${mes}-${dia}`;

cargarTodo()
  .then(() => mensaje("Información actualizada"))
  .catch((error) => mensaje(error.message, true));