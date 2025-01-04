"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubToPdf = githubToPdf;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const child_process_1 = require("child_process");
const pdfkit_1 = __importDefault(require("pdfkit"));
const dynamicConfig_1 = require("../utils/dynamicConfig");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Ruta temporal para clonar repositorios
const TEMP_DIR = path_1.default.join(__dirname, "../../temp");
// Asegurar directorio temporal
if (!fs_1.default.existsSync(TEMP_DIR)) {
    fs_1.default.mkdirSync(TEMP_DIR, { recursive: true });
}
async function githubToPdf(repoUrl) {
    const repoName = path_1.default.basename(repoUrl, ".git");
    const repoPath = path_1.default.join(TEMP_DIR, repoName);
    const pdfPath = path_1.default.join(TEMP_DIR, `${repoName}.pdf`);
    try {
        // Clonar el repositorio
        console.log(`Cloning repository: ${repoUrl}`);
        await execAsync(`git clone ${repoUrl} ${repoPath}`);
        // Obtener tipos de archivo excluidos
        const excludedTypes = await dynamicConfig_1.DynamicConfig.get('EXCLUDED_FILE_TYPES', ['jpg', 'png', 'gif', 'mp4', 'zip', 'exe']);
        const maxFileSizeKb = await dynamicConfig_1.DynamicConfig.get('MAX_FILE_SIZE_KB', 1000);
        // Crear un PDF
        console.log(`Generating PDF: ${pdfPath}`);
        const doc = new pdfkit_1.default();
        const writeStream = fs_1.default.createWriteStream(pdfPath);
        doc.pipe(writeStream);
        // Función recursiva para procesar directorios
        async function processDirectory(dirPath, relativePath = '') {
            const files = fs_1.default.readdirSync(dirPath);
            for (const file of files) {
                const filePath = path_1.default.join(dirPath, file);
                const fileRelativePath = path_1.default.join(relativePath, file);
                const stats = fs_1.default.lstatSync(filePath);
                if (stats.isDirectory() && file !== '.git') {
                    // Procesar subdirectorios recursivamente
                    await processDirectory(filePath, fileRelativePath);
                }
                else if (stats.isFile()) {
                    // Verificar extensión y tamaño del archivo
                    const ext = path_1.default.extname(file).toLowerCase().replace('.', '');
                    const fileSizeKb = stats.size / 1024;
                    if (!excludedTypes.includes(ext) && fileSizeKb <= maxFileSizeKb) {
                        try {
                            const content = fs_1.default.readFileSync(filePath, "utf-8");
                            doc.addPage()
                                .font("Courier")
                                .fontSize(12)
                                .text(`File: ${fileRelativePath}\n\n${content}`);
                        }
                        catch (error) {
                            console.warn(`Could not read file ${fileRelativePath}: ${error.message}`);
                            doc.addPage()
                                .font("Courier")
                                .fontSize(12)
                                .text(`File: ${fileRelativePath}\n\nCould not read file contents (possibly binary or encoded file)`);
                        }
                    }
                }
            }
        }
        // Procesar el repositorio
        await processDirectory(repoPath);
        doc.end();
        await new Promise((resolve) => writeStream.on("finish", resolve));
        console.log(`PDF generated: ${pdfPath}`);
        return pdfPath;
    }
    catch (error) {
        console.error("Error generating PDF:", error);
        throw error;
    }
    finally {
        // Limpiar directorio temporal
        if (fs_1.default.existsSync(repoPath)) {
            fs_1.default.rmSync(repoPath, { recursive: true, force: true });
        }
    }
}
