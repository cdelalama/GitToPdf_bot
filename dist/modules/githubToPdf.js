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
        // Crear un PDF
        console.log(`Generating PDF: ${pdfPath}`);
        const doc = new pdfkit_1.default();
        const writeStream = fs_1.default.createWriteStream(pdfPath);
        doc.pipe(writeStream);
        const files = fs_1.default.readdirSync(repoPath);
        for (const file of files) {
            const filePath = path_1.default.join(repoPath, file);
            if (fs_1.default.lstatSync(filePath).isFile()) {
                const content = fs_1.default.readFileSync(filePath, "utf-8");
                doc.addPage().font("Courier").fontSize(12).text(`${file}:\n\n${content}`);
            }
        }
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
