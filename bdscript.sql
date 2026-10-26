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