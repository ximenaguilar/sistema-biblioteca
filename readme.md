# Sistema de Gestión de Biblioteca

Proyecto final del curso Desarrollo Web de la Universidad Mariano Gálvez de Guatemala.

## Integrantes

1. Flor de Maria Ponce Mijangos
2. Joselin Andrea Vasquez Merida
3. Ximena Zecibel Aguilar Galindo
4. Jose Carlos Mata Aragon

Sección A

## Descripción y problema

El sistema permite administrar los ejemplares de una biblioteca,
registrar lectores y controlar préstamos y devoluciones.

Busca reducir errores en el seguimiento de los libros, como desconocer
quién tiene un ejemplar o prestar uno que todavía no ha sido devuelto.

## Funcionalidades

- Registrar, consultar, actualizar y eliminar libros.
- Buscar ejemplares por código, título o autor.
- Registrar y consultar usuarios.
- Registrar préstamos.
- Consultar el historial de préstamos.
- Registrar devoluciones.
- Mostrar la disponibilidad de cada ejemplar.
- Validar datos y presentar mensajes de error.

## Tecnologías

- HTML5 y CSS3.
- JavaScript, DOM, eventos, fetch y async/await.
- Node.js y Express.
- MySQL con el controlador mysql2.
- dotenv para variables de entorno.
- Git y GitHub.
- Postman para pruebas de API.

Versiones del entorno utilizado:

- Node.js: v24.21.0
- npm: 11.19.0
- MySQL Server: 26.10.0
- Sistema operativo: windows

Las versiones de las dependencias se registran en package-lock.json.

## Arquitectura

Navegador → HTML/CSS/JavaScript → fetch/HTTP →
API REST con Express → MySQL.

Express sirve los archivos de public y atiende las rutas /api.
El frontend y la API utilizan el mismo origen.

Los datos se almacenan permanentemente en MySQL.

## Organización de archivos

- src/app.js: servidor, rutas, validaciones y manejo de errores.
- src/db.js: pool de conexiones MySQL.
- public/index.html: estructura de la interfaz.
- public/styles.css: estilos de la interfaz.
- public/app.js: eventos y consumo de la API.
- docs/: evidencias y documentación.
- database.sql: estructura y datos iniciales.
- .env.example: ejemplo de configuración.
- .gitignore: exclusión de credenciales y dependencias.

## Requisitos

- Node.js y npm.
- MySQL Server instalado y en ejecución.
- Un cliente SQL, como MySQL Workbench.
- Git si se obtiene el proyecto mediante clonación.

## Instalación

### 1 Obtener el proyecto

Descargar y descomprimir el repositorio, o ejecutar:

```bash
git clone (https://github.com/ximenaguilar/sistema-biblioteca)
```

Abrir una terminal dentro de la carpeta que contiene package.json.

### 2 Instalar dependencias

```bash
npm install
```

En PowerShell, si npm presenta restricciones de ejecución, utilizar:

```powershell
npm.cmd install
```

### 3 Crear la base de datos

Abrir MySQL Workbench con una cuenta que pueda crear bases y tablas.

Abrir database.sql y ejecutarlo sobre una instalación donde todavía
no existan las tablas del proyecto.

El script crea la base biblioteca, sus tres tablas y los datos iniciales.

No volver a ejecutar el script completo sobre una base ya instalada:
las tablas existentes y los valores únicos pueden producir errores.

### 4 Crear el usuario de la aplicación

Ejecutar con una cuenta administradora:

```sql
CREATE USER 'biblioteca_app'@'localhost'
IDENTIFIED BY 'REEMPLAZAR_CON_CLAVE_LOCAL';

GRANT SELECT, INSERT, UPDATE, DELETE
ON biblioteca.*
TO 'biblioteca_app'@'localhost';
```

Reemplazar la contraseña de ejemplo antes de ejecutar.
Si el usuario ya existe, utilizar su configuración existente.

La aplicación no necesita permisos para crear o eliminar tablas.

### 5 Configurar variables de entorno

Copiar .env.example como .env en la raíz del proyecto.

En PowerShell:

```powershell
Copy-Item .env.example .env
```

Completar .env:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=biblioteca_app
DB_PASSWORD="REEMPLAZAR_CON_CLAVE_LOCAL"
DB_NAME=biblioteca
```

Utilizar la contraseña configurada para biblioteca_app.
No publicar .env ni contraseñas en el repositorio.

### 6 Iniciar el servidor

```bash
npm start
```

En PowerShell también se puede utilizar:

```powershell
npm.cmd start
```

### 7 Abrir la aplicación

Ingresar desde el navegador a:

http://localhost:3000

Comprobar la conexión con:

http://localhost:3000/api/health

Respuesta esperada:

```json
{
  "estado": "ok",
  "base_de_datos": "conectada"
}
```

Mantener la terminal del servidor abierta.
Para detenerlo, presionar Ctrl + C.

No es necesario utilizar Live Server.

## Base de datos

### libros

Cada fila representa un ejemplar físico.

Campos: id, codigo, titulo, autor e isbn.

El código identifica de manera única cada ejemplar.
Dos copias del mismo título pueden tener el mismo ISBN,
pero deben tener códigos diferentes.

### usuarios

Registra a los lectores de la biblioteca.

Campos: id, nombre, correo y telefono.

El correo es único. Estos registros no son cuentas de inicio de sesión.

### prestamos

Relaciona un ejemplar con un usuario.

Campos: id, libro_id, usuario_id, fecha_prestamo,
fecha_limite y fecha_devolucion.

Relaciones:

- Un libro puede tener varios préstamos a lo largo del tiempo.
- Un usuario puede tener varios préstamos.
- Cada préstamo pertenece a un libro y un usuario.

## Reglas de negocio

- Un ejemplar no puede tener más de un préstamo activo.
- Un préstamo está pendiente de devolución cuando
  fecha_devolucion es NULL.
- Un préstamo vencido mantiene ocupado el ejemplar.
- Registrar una devolución no elimina el historial.
- Un préstamo ya devuelto no puede devolverse nuevamente.
- La fecha límite no puede ser anterior al día del préstamo.
- Los libros con historial de préstamos no pueden eliminarse.
- Los libros sin historial sí pueden eliminarse físicamente.

La disponibilidad se calcula consultando los préstamos pendientes.

El registro de préstamos utiliza una transacción y bloquea
el ejemplar con SELECT FOR UPDATE antes de comprobar su disponibilidad.
Las operaciones se realizan en una misma conexión.

## Endpoints

| Método | Ruta | Función |
|---|---|---|
| GET | /api/health | Comprobar conexión MySQL |
| GET | /api/libros | Consultar libros y disponibilidad |
| GET | /api/libros/:id | Consultar un libro |
| POST | /api/libros | Registrar libro |
| PUT | /api/libros/:id | Actualizar libro |
| DELETE | /api/libros/:id | Eliminar libro sin historial |
| GET | /api/usuarios | Consultar usuarios |
| POST | /api/usuarios | Registrar usuario |
| GET | /api/prestamos | Consultar historial |
| POST | /api/prestamos | Registrar préstamo |
| PUT | /api/prestamos/:id/devolucion | Registrar devolución |

### Ejemplo de registro de libro

POST /api/libros

```json
{
  "codigo": "DEMO-001",
  "titulo": "Libro de demostración",
  "autor": "Autor de ejemplo",
  "isbn": null
}
```

### Ejemplo de registro de usuario

POST /api/usuarios

```json
{
  "nombre": "Lector de demostración",
  "correo": "demo@example.com",
  "telefono": "55550010"
}
```

### Ejemplo de préstamo

POST /api/prestamos

```json
{
  "libro_id": 3,
  "usuario_id": 1,
  "fecha_limite": "2026-11-07"
}
```

Utilizar IDs existentes, un ejemplar disponible y una fecha
que no sea anterior al día de ejecución.

Para registrar la devolución se utiliza el ID del préstamo,
que puede ser diferente del ID del libro.

## Códigos HTTP

| Código | Significado |
|---|---|
| 200 | Consulta u operación completada |
| 201 | Registro creado |
| 400 | Datos inválidos o incompletos |
| 404 | Recurso o ruta inexistente |
| 409 | Duplicado o conflicto con una regla de negocio |
| 413 | Cuerpo de solicitud demasiado grande |
| 500 | Error interno |
| 503 | Base de datos no disponible en /api/health |

## Validación y seguridad

- Validación de campos en frontend y backend.
- Consultas SQL parametrizadas.
- Credenciales mediante variables de entorno.
- Usuario MySQL con permisos limitados.
- Exclusión de .env y node_modules mediante .gitignore.
- Presentación de datos del usuario mediante textContent.
- Mensajes de error sin exponer consultas ni credenciales.
- Límite de 10 KB para cuerpos JSON.

## Pruebas

Las evidencias se encuentran en docs/.

Procedimiento general:

1. Probar el CRUD de libros.
2. Registrar y consultar usuarios.
3. Registrar un préstamo de un ejemplar disponible.
4. Repetir el préstamo y comprobar HTTP 409.
5. Consultar el historial.
6. Registrar una devolución.
7. Repetir la devolución y comprobar HTTP 409.
8. Verificar la disponibilidad después de devolver.
9. Intentar eliminar un ejemplar con historial.
10. Reiniciar Node.js y comprobar que los datos se conservan.

Para probar la API con Postman:

- Utilizar http://localhost:3000 como dirección base.
- Seleccionar el método HTTP correspondiente.
- Para POST y PUT con datos, elegir Body → raw → JSON.
- Revisar código HTTP y cuerpo de respuesta.
 Colección Postman: docs/Biblioteca.postman_collection.json

## Solución de problemas

### No se puede conectar con MySQL

Verificar que el servicio esté iniciado, que biblioteca exista
y que las variables de .env sean correctas.

### Access denied

Revisar usuario, contraseña y permisos de biblioteca_app.

### Puerto ocupado

Detener la otra instancia del servidor o cambiar PORT en .env.
Si cambia el puerto, actualizar las direcciones utilizadas.

### No aparecen los estilos

Verificar que public/styles.css exista y que index.html use
la ruta /styles.css. Recargar con Ctrl + F5.

### Ruta no encontrada

Verificar método y URL. Comprobar que las rutas de la API estén
antes del middleware que responde 404.

## Alcance y limitaciones

El sistema se ejecuta localmente para la demostración académica.
No incluye autenticación, roles, reservas ni multas.

El servidor escucha en 127.0.0.1.
Para un despliegue con acceso de terceros se debe definir
autenticación, autorización y configuración de producción.

## Repositorio

https://github.com/ximenaguilar/sistema-biblioteca
