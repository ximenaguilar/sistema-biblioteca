CREATE DATABASE IF NOT EXISTS biblioteca
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE biblioteca;

CREATE TABLE libros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    titulo VARCHAR(200) NOT NULL,
    autor VARCHAR(150) NOT NULL,
    isbn VARCHAR(20) NULL
) ENGINE = InnoDB;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(254) NOT NULL UNIQUE,
    telefono VARCHAR(25) NULL
) ENGINE = InnoDB;

CREATE TABLE prestamos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    libro_id INT NOT NULL,
    usuario_id INT NOT NULL,
    fecha_prestamo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_limite DATE NOT NULL,
    fecha_devolucion DATETIME NULL,

    CONSTRAINT fk_prestamos_libro
        FOREIGN KEY (libro_id)
        REFERENCES libros(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_prestamos_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    INDEX idx_prestamo_activo (libro_id, fecha_devolucion)
) ENGINE = InnoDB;

SHOW TABLES;


USE biblioteca;

INSERT INTO libros (codigo, titulo, autor, isbn) VALUES
('LIB-001', 'El principito', 'Antoine de Saint-Exupéry', NULL),
('LIB-002', 'Don Quijote de la Mancha', 'Miguel de Cervantes', NULL),
('LIB-003', 'Cien años de soledad', 'Gabriel García Márquez', NULL),
('LIB-004', 'Crimen y castigo', 'Fiódor Dostoyevski', NULL),
('LIB-005', 'El señor presidente', 'Miguel Ángel Asturias', NULL),
('LIB-006', 'El principito', 'Antoine de Saint-Exupéry', NULL);

INSERT INTO usuarios (nombre, correo, telefono) VALUES
('Ana López', 'ana@example.com', '55550001'),
('Carlos Pérez', 'carlos@example.com', '55550002'),
('María García', 'maria@example.com', '55550003');

-- Préstamo activo de LIB-001 a Ana.
INSERT INTO prestamos (
    libro_id, usuario_id, fecha_prestamo,
    fecha_limite, fecha_devolucion
)
SELECT l.id, u.id, NOW(),
       DATE_ADD(CURDATE(), INTERVAL 7 DAY), NULL
FROM libros l
CROSS JOIN usuarios u
WHERE l.codigo = 'LIB-001'
  AND u.correo = 'ana@example.com';

-- Préstamo ya devuelto de LIB-002 a Carlos.
INSERT INTO prestamos (
    libro_id, usuario_id, fecha_prestamo,
    fecha_limite, fecha_devolucion
)
SELECT l.id, u.id,
       DATE_SUB(NOW(), INTERVAL 10 DAY),
       DATE_SUB(CURDATE(), INTERVAL 3 DAY),
       DATE_SUB(NOW(), INTERVAL 4 DAY)
FROM libros l
CROSS JOIN usuarios u
WHERE l.codigo = 'LIB-002'
  AND u.correo = 'carlos@example.com';

-- Comprobar cantidades.
SELECT 'libros' AS tabla, COUNT(*) AS cantidad FROM libros
UNION ALL
SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL
SELECT 'prestamos', COUNT(*) FROM prestamos;