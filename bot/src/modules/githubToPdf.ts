import fs from "fs";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";
import PDFDocument from "pdfkit";
import { DynamicConfig } from "../utils/dynamicConfig";

const execAsync = promisify(exec);

// Ruta temporal para clonar repositorios
const TEMP_DIR = path.join(__dirname, "../../temp");

// Asegurar directorio temporal
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export async function githubToPdf(repoUrl: string): Promise<string> {
    const repoName = path.basename(repoUrl, ".git");
    const repoPath = path.join(TEMP_DIR, repoName);
    const pdfPath = path.join(TEMP_DIR, `${repoName}.pdf`);

    try {
        // Clonar el repositorio
        console.log(`Cloning repository: ${repoUrl}`);
        await execAsync(`git clone ${repoUrl} ${repoPath}`);

        // Obtener tipos de archivo excluidos
        const excludedTypes = await DynamicConfig.get('EXCLUDED_FILE_TYPES', ['jpg', 'png', 'gif', 'mp4', 'zip', 'exe']);
        const maxFileSizeKb = await DynamicConfig.get('MAX_FILE_SIZE_KB', 1000);

        // Crear un PDF
        console.log(`Generating PDF: ${pdfPath}`);
        const doc = new PDFDocument();
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        // Función recursiva para procesar directorios
        async function processDirectory(dirPath: string, relativePath: string = '') {
            const files = fs.readdirSync(dirPath);
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const fileRelativePath = path.join(relativePath, file);
                const stats = fs.lstatSync(filePath);

                if (stats.isDirectory() && file !== '.git') {
                    // Procesar subdirectorios recursivamente
                    await processDirectory(filePath, fileRelativePath);
                } else if (stats.isFile()) {
                    // Verificar extensión y tamaño del archivo
                    const ext = path.extname(file).toLowerCase().replace('.', '');
                    const fileSizeKb = stats.size / 1024;

                    if (!excludedTypes.includes(ext) && fileSizeKb <= maxFileSizeKb) {
                        try {
                            const content = fs.readFileSync(filePath, "utf-8");
                            doc.addPage()
                               .font("Courier")
                               .fontSize(12)
                               .text(`File: ${fileRelativePath}\n\n${content}`);
                        } catch (error: any) {
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
    } catch (error) {
        console.error("Error generating PDF:", error);
        throw error;
    } finally {
        // Limpiar directorio temporal
        if (fs.existsSync(repoPath)) {
            fs.rmSync(repoPath, { recursive: true, force: true });
        }
    }
}




