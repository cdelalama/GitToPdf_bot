import fs from "fs";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";
import PDFDocument from "pdfkit";

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

        // Crear un PDF
        console.log(`Generating PDF: ${pdfPath}`);
        const doc = new PDFDocument();
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        const files = fs.readdirSync(repoPath);
        for (const file of files) {
            const filePath = path.join(repoPath, file);
            if (fs.lstatSync(filePath).isFile()) {
                const content = fs.readFileSync(filePath, "utf-8");
                doc.addPage().font("Courier").fontSize(12).text(`${file}:\n\n${content}`);
            }
        }

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
