const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Créer le dossier uploads s'il n'existe pas
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration du stockage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Générer un nom de fichier unique
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        cb(null, nameWithoutExt + "-" + uniqueSuffix + ext);
    },
});

// Filtrer les types de fichiers autorisés
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ["image/png", "image/jpeg", "application/pdf", "text/plain"];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Type de fichier non autorisé !"), false);
    }
};

// Configuration de multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 15 * 1024 * 1024, // 15MB max
    },
});

module.exports = { upload };
