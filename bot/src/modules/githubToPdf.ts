import fs from "fs";
import path from "path";
import { exec, spawn } from "child_process";
import PDFDocument from "pdfkit";
import { dynamicConfig } from "../config/config";
import os from "os";

const execAsync = require('util').promisify(exec);

// Función para obtener un directorio temporal válido
async function getValidTempDir(): Promise<string> {
    const errors: string[] = [];
    
    // Lista de directorios a intentar en orden
    const dirsToTry = [
        {
            name: 'configured',
            getter: async () => {
                const tempDir = await dynamicConfig.getTempDir();
                return path.isAbsolute(tempDir) ? tempDir : path.join(process.cwd(), tempDir);
            }
        },
        {
            name: 'system',
            getter: async () => path.join(os.tmpdir(), 'git2pdf')
        },
        {
            name: 'home',
            getter: async () => path.join(os.homedir(), '.git2pdf', 'temp')
        }
    ];

    for (const { name, getter } of dirsToTry) {
        try {
            const tempDir = await getter();

            // En Windows, validar la ruta
            if (process.platform === 'win32') {
                // Verificar si es una ruta UNC
                if (tempDir.startsWith('\\\\')) {
                    throw new Error('UNC paths are not supported');
                }
                // Verificar caracteres inválidos
                if (/[<>:"|?*]/.test(tempDir)) {
                    throw new Error('Invalid characters in path');
                }
            }

            // Verificar acceso y espacio
            await verifyDirectoryAccess(tempDir);
            await checkDiskSpace(tempDir);

            console.log(`Using ${name} temporary directory: ${tempDir}`);
            return tempDir;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`${name}: ${errorMessage}`);
            continue;
        }
    }

    // Si llegamos aquí, ningún directorio funcionó
    throw new Error(`Could not find valid temporary directory. Errors:\n${errors.map(e => `- ${e}`).join('\n')}`);
}

// Función para verificar espacio en disco de forma segura
async function checkDiskSpace(dir: string): Promise<void> {
    try {
        const minDiskSpace = await dynamicConfig.getMinDiskSpaceMb();
        
        // Intentar usar statfs primero
        try {
            const drive = path.parse(dir).root;
            const stats = await fs.promises.statfs(process.platform === 'win32' ? drive : dir);
            const freeSpaceMb = (stats.bfree * stats.bsize) / (1024 * 1024);
            
            if (freeSpaceMb < minDiskSpace) {
                throw new Error(`Insufficient disk space. Required: ${minDiskSpace}MB, Available: ${freeSpaceMb.toFixed(2)}MB`);
            }
            return;
        } catch (statfsError) {
            // Si statfs falla, intentar con una alternativa
            console.warn('statfs not available, trying alternative disk space check');
        }

        // Método alternativo: intentar escribir un archivo de prueba
        const testSize = minDiskSpace * 1024 * 1024; // Convertir a bytes
        const testFile = path.join(dir, `.space-test-${Date.now()}`);
        
        try {
            // Intentar reservar espacio sin escribir realmente los datos
            const fd = await fs.promises.open(testFile, 'w');
            await fd.truncate(testSize);
            await fd.close();
            await fs.promises.unlink(testFile);
        } catch (error) {
            throw new Error(`Insufficient disk space. Required: ${minDiskSpace}MB`);
        }
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error checking disk space: ${error.message}`);
        }
        throw error;
    }
}

// Función para limpiar PDFs antiguos de forma segura
async function cleanupOldPdfs(pdfDir: string): Promise<void> {
    // Crear un archivo de lock para evitar limpiezas simultáneas
    const lockFile = path.join(pdfDir, '.cleanup.lock');
    
    try {
        // Intentar crear el archivo de lock
        try {
            await fs.promises.writeFile(lockFile, process.pid.toString(), { flag: 'wx' });
        } catch (error) {
            // Si el archivo existe, verificar si el proceso anterior sigue vivo
            try {
                const pid = parseInt(await fs.promises.readFile(lockFile, 'utf8'));
                try {
                    process.kill(pid, 0); // Verificar si el proceso existe
                    console.log('Cleanup already in progress by another process');
                    return;
                } catch {
                    // El proceso anterior ya no existe, podemos continuar
                    await fs.promises.writeFile(lockFile, process.pid.toString());
                }
            } catch {
                // Error leyendo el archivo de lock, reintentamos crear uno nuevo
                await fs.promises.writeFile(lockFile, process.pid.toString());
            }
        }

        // Obtener tiempo de retención configurado
        const retentionHours = await dynamicConfig.getPdfRetentionHours();
        const maxAgeMs = retentionHours * 60 * 60 * 1000;
        
        // Asegurar que el directorio existe
        if (!fs.existsSync(pdfDir)) {
            console.log('PDF directory does not exist yet, skipping cleanup');
            return;
        }

        const files = await fs.promises.readdir(pdfDir);
        const now = Date.now();
        let cleanedCount = 0;
        let errorCount = 0;

        for (const file of files) {
            // Ignorar el archivo de lock y archivos que no son PDFs
            if (file === '.cleanup.lock' || !file.endsWith('.pdf')) continue;

            const filePath = path.join(pdfDir, file);
            
            // Verificar que el archivo está realmente dentro del directorio PDF
            if (!isPathSafe(pdfDir, filePath)) {
                console.warn(`Skipping file outside PDF directory: ${file}`);
                continue;
            }

            try {
                const stats = await fs.promises.stat(filePath);
                
                // Verificar que es un archivo regular (no symlink)
                if (!stats.isFile()) {
                    console.warn(`Skipping non-file: ${file}`);
                    continue;
                }

                if (now - stats.mtimeMs > maxAgeMs) {
                    await fs.promises.unlink(filePath);
                    cleanedCount++;
                }
            } catch (error) {
                console.error(`Error processing file ${filePath}:`, error);
                errorCount++;
            }
        }

        if (cleanedCount > 0 || errorCount > 0) {
            console.log(`PDF cleanup results - Cleaned: ${cleanedCount}, Errors: ${errorCount}`);
        }
    } catch (error) {
        console.error('Error during PDF cleanup:', error);
    } finally {
        // Eliminar el archivo de lock
        try {
            await fs.promises.unlink(lockFile);
        } catch (error) {
            console.warn('Error removing cleanup lock file:', error);
        }
    }
}

// Función para limpiar directorios de operaciones antiguas
async function cleanupOldOperations(operationsDir: string): Promise<void> {
    const lockFile = path.join(operationsDir, '.cleanup-ops.lock');
    
    try {
        // Intentar obtener el lock
        try {
            await fs.promises.writeFile(lockFile, process.pid.toString(), { flag: 'wx' });
        } catch (error) {
            // Si el archivo existe, verificar si el proceso anterior sigue vivo
            try {
                const pid = parseInt(await fs.promises.readFile(lockFile, 'utf8'));
                try {
                    process.kill(pid, 0);
                    console.log('Operations cleanup already in progress');
                    return;
                } catch {
                    await fs.promises.writeFile(lockFile, process.pid.toString());
                }
            } catch {
                await fs.promises.writeFile(lockFile, process.pid.toString());
            }
        }

        // Obtener tiempo de retención
        const retentionHours = await dynamicConfig.getPdfRetentionHours();
        const maxAgeMs = retentionHours * 60 * 60 * 1000;
        
        if (!fs.existsSync(operationsDir)) {
            return;
        }

        const entries = await fs.promises.readdir(operationsDir, { withFileTypes: true });
        const now = Date.now();
        let cleanedCount = 0;
        let errorCount = 0;

        for (const entry of entries) {
            if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

            const dirPath = path.join(operationsDir, entry.name);
            try {
                const stats = await fs.promises.stat(dirPath);
                if (now - stats.mtimeMs > maxAgeMs) {
                    await fs.promises.rm(dirPath, { recursive: true, force: true });
                    cleanedCount++;
                }
            } catch (error) {
                console.error(`Error cleaning operation directory ${dirPath}:`, error);
                errorCount++;
            }
        }

        if (cleanedCount > 0 || errorCount > 0) {
            console.log(`Operations cleanup results - Cleaned: ${cleanedCount}, Errors: ${errorCount}`);
        }
    } finally {
        try {
            await fs.promises.unlink(lockFile);
        } catch (error) {
            console.warn('Error removing operations cleanup lock file:', error);
        }
    }
}

async function getLastCommitInfo(filePath: string, repoPath: string): Promise<string> {
    try {
        // Convertir a ruta relativa al repositorio
        const relativePath = path.relative(repoPath, filePath);
        
        // Verificar que el archivo está dentro del repo
        if (!isPathSafe(repoPath, filePath)) {
            throw new Error('File is outside repository');
        }

        // Ejecutar git log desde el directorio del repositorio sin cambiar el CWD
        const command = `git --git-dir=${escapeShellArg(path.join(repoPath, '.git'))} --work-tree=${escapeShellArg(repoPath)} log -1 --format="%h - %an, %ar : %s" -- ${escapeShellArg(relativePath)}`;
        
        const { stdout } = await execAsync(command);
        const commitInfo = stdout.trim();
        
        return commitInfo || 'No commit history available';
    } catch (error) {
        console.warn(`Could not get commit info for ${filePath}:`, error);
        return 'No commit history available';
    }
}

// Función para verificar permisos de directorio
async function verifyDirectoryAccess(dir: string): Promise<void> {
    try {
        // Verificar si el directorio existe
        if (fs.existsSync(dir)) {
            // Verificar permisos de escritura
            const testFile = path.join(dir, `test-${Date.now()}.tmp`);
            await fs.promises.writeFile(testFile, 'test');
            await fs.promises.unlink(testFile);
        } else {
            // Intentar crear el directorio
            await fs.promises.mkdir(dir, { recursive: true, mode: 0o755 });
        }

        // Verificar permisos del usuario actual
        const stats = await fs.promises.stat(dir);
        const currentUid = process.getuid?.() ?? -1;
        if (currentUid !== -1 && stats.uid !== currentUid) {
            throw new Error('Directory is not owned by current user');
        }
        } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Directory access error: ${error.message}`);
        }
        throw error;
    }
}

// Función para validar que una ruta está dentro del directorio base
function isPathSafe(basePath: string, targetPath: string): boolean {
    const resolvedBase = path.resolve(basePath);
    const resolvedTarget = path.resolve(targetPath);
    return resolvedTarget.startsWith(resolvedBase);
}

// Función para procesar directorios de forma segura
async function processDirectory(dirPath: string, relativePath: string = '', options: {
    repoPath: string;
    maxFiles: number;
    currentFiles: { count: number };
    doc: PDFKit.PDFDocument;
    fontSize: number;
    maxFileSizeKb: number;
    excludedTypes: string[];
    maxPdfSizeMb: number;
    includeCommitInfo: boolean;
    skippedFiles: { bySize: string[]; byType: string[] };
    currentPdfSize: { value: number };
}): Promise<void> {
    // Verificar límite de archivos
    if (options.currentFiles.count >= options.maxFiles) {
        throw new Error(`Maximum number of files (${options.maxFiles}) exceeded`);
    }

    // Verificar que el directorio está dentro del repo
    if (!isPathSafe(options.repoPath, dirPath)) {
        throw new Error(`Invalid directory path: ${dirPath}`);
    }

    try {
        const files = await fs.promises.readdir(dirPath);
        
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const fileRelativePath = path.join(relativePath, file);

            // Verificar que el archivo está dentro del repo
            if (!isPathSafe(options.repoPath, filePath)) {
                console.warn(`Skipping file outside repository: ${fileRelativePath}`);
                continue;
            }

            try {
                const stats = await fs.promises.lstat(filePath);

                if (stats.isSymbolicLink()) {
                    console.warn(`Skipping symbolic link: ${fileRelativePath}`);
                    continue;
                }

                if (stats.isDirectory() && file !== '.git') {
                    await processDirectory(filePath, fileRelativePath, options);
                } else if (stats.isFile()) {
                    options.currentFiles.count++;
                    if (options.currentFiles.count > options.maxFiles) {
                        throw new Error(`Maximum number of files (${options.maxFiles}) exceeded`);
                    }

                    const ext = path.extname(file).toLowerCase().replace('.', '');
                    const fileSizeKb = stats.size / 1024;

                    if (options.excludedTypes.includes(ext)) {
                        options.skippedFiles.byType.push(fileRelativePath);
                        continue;
                    }

                    if (fileSizeKb > options.maxFileSizeKb) {
                        console.warn(`Skipping large file: ${fileRelativePath} (${fileSizeKb.toFixed(2)}KB > ${options.maxFileSizeKb}KB)`);
                        options.skippedFiles.bySize.push(fileRelativePath);
                        continue;
                    }

                    try {
                        const content = await fs.promises.readFile(filePath, "utf-8");
                        
                        let commitInfo = '';
                        if (options.includeCommitInfo) {
                            commitInfo = await getLastCommitInfo(filePath, options.repoPath);
                            if (commitInfo) {
                                commitInfo = `\nLast commit: ${commitInfo}\n`;
                            }
                        }

                        const contentSizeBytes = Buffer.from(content).length + 
                            fileRelativePath.length + 
                            Buffer.from(commitInfo).length + 
                            100;
                        
                        options.currentPdfSize.value += contentSizeBytes;

                        if (options.currentPdfSize.value / (1024 * 1024) > options.maxPdfSizeMb) {
                            throw new Error(`PDF would exceed maximum allowed size of ${options.maxPdfSizeMb}MB`);
                        }

                        options.doc.addPage()
                           .font("Courier")
                           .fontSize(options.fontSize)
                           .text(`File: ${fileRelativePath}${commitInfo}\n\n${content}`);
                    } catch (error: any) {
                        if (error.message.includes('maximum allowed size')) {
                            throw error;
                        }
                        console.warn(`Could not read file ${fileRelativePath}: ${error.message}`);
                        options.doc.addPage()
                           .font("Courier")
                           .fontSize(options.fontSize)
                           .text(`File: ${fileRelativePath}\n\nCould not read file contents (possibly binary or encoded file)`);
                    }
                }
            } catch (error) {
                console.warn(`Error processing ${fileRelativePath}:`, error);
            }
        }
    } catch (error) {
        throw new Error(`Error processing directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Función para escapar argumentos de línea de comandos
function escapeShellArg(arg: string): string {
    if (process.platform === 'win32') {
        // En Windows, envolver en comillas dobles y escapar comillas internas
        return `"${arg.replace(/"/g, '\\"')}"`;
    } else {
        // En Unix, envolver en comillas simples y escapar comillas internas
        return `'${arg.replace(/'/g, "'\\''")}'`;
    }
}

// Función para matar un proceso y sus hijos
async function killProcessTree(pid: number): Promise<void> {
    try {
        if (process.platform === 'win32') {
            await execAsync(`taskkill /pid ${pid} /t /f`);
        } else {
            process.kill(-pid, 'SIGKILL');
        }
    } catch (error) {
        console.warn(`Error killing process ${pid}:`, error);
    }
}

export async function githubToPdf(repoUrl: string): Promise<string> {
    let tempPdfPath: string | null = null;
    let finalPdfPath: string | null = null;
    let operationDir: string | null = null;
    let doc: PDFKit.PDFDocument | null = null;
    let writeStream: fs.WriteStream | null = null;
    let gitProcess: { pid?: number } = {};

    try {
        // Obtener y validar directorio temporal base
        const TEMP_DIR = await getValidTempDir();
        
        // Crear subdirectorios específicos con un único mkdir
        const pdfDir = path.join(TEMP_DIR, 'pdfs');
        const operationsDir = path.join(TEMP_DIR, 'operations');
        const operationId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        operationDir = path.join(operationsDir, operationId);
        
        // Crear todos los directorios necesarios de una vez
        await Promise.all([
            verifyDirectoryAccess(TEMP_DIR),
            verifyDirectoryAccess(pdfDir),
            verifyDirectoryAccess(operationsDir),
            verifyDirectoryAccess(operationDir)
        ]);
        
        // Verificar espacio después de crear los directorios
        await checkDiskSpace(TEMP_DIR);
        
        // Limpiar siempre en el mismo orden para evitar deadlocks
        await cleanupOldOperations(operationsDir);  // Primero operaciones
        await cleanupOldPdfs(pdfDir);              // Luego PDFs

        const repoName = path.basename(repoUrl, ".git");
        const repoPath = path.join(operationDir, 'repo', repoName);
        tempPdfPath = path.join(operationDir, 'output', `${repoName}.pdf`);
        finalPdfPath = path.join(pdfDir, `${repoName}-${operationId}.pdf`);

        // Crear subdirectorios para repo y output con permisos específicos
        await Promise.all([
            fs.promises.mkdir(path.dirname(repoPath), { recursive: true, mode: 0o755 }),
            fs.promises.mkdir(path.dirname(tempPdfPath), { recursive: true, mode: 0o755 })
        ]);

        // Obtener timeout para clonación
        const cloneTimeout = await dynamicConfig.getGithubCloneTimeout();

        // Validar URL del repositorio
        if (!/^https:\/\/github\.com\/[^/]+\/[^/]+(?:\.git)?$/.test(repoUrl)) {
            throw new Error('Invalid GitHub repository URL');
        }

        // Asegurar que la URL termina en .git
        if (!repoUrl.endsWith('.git')) {
            repoUrl = `${repoUrl}.git`;
        }

        // Clonar el repositorio con mejor manejo de timeout
        console.log(`Cloning repository: ${repoUrl} (timeout: ${cloneTimeout}ms)`);
        const cloneCommand = `git clone --no-single-branch ${escapeShellArg(repoUrl)} ${escapeShellArg(repoPath)}`;
        
        const clonePromise = new Promise<void>((resolve, reject) => {
            const process = spawn('git', ['clone', '--no-single-branch', repoUrl, repoPath], { detached: true });
            gitProcess.pid = process.pid;
            
            process.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`Git clone failed with code ${code}`));
            });
            
            process.on('error', reject);
        });

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(async () => {
                if (gitProcess.pid) {
                    await killProcessTree(gitProcess.pid);
                }
                reject(new Error('Repository cloning timed out'));
            }, cloneTimeout);
        });

        await Promise.race([clonePromise, timeoutPromise]);

        // Obtener configuraciones
        const excludedTypes = await dynamicConfig.getExcludedFileTypes();
        const maxFileSizeKb = await dynamicConfig.getMaxFileSizeKb();
        const maxPdfSizeMb = await dynamicConfig.getMaxPdfSizeMb();
        const fontSize = await dynamicConfig.getPdfDefaultFontSize();
        const includeCommitInfo = await dynamicConfig.getPdfIncludeCommitInfo();

        // Crear un PDF con mejor manejo de recursos
        console.log(`Generating PDF: ${tempPdfPath}`);
        doc = new PDFDocument();
        writeStream = fs.createWriteStream(tempPdfPath);
        
        // Manejar errores del stream
        writeStream.on('error', (error) => {
            throw new Error(`Error writing PDF: ${error.message}`);
        });
        
        doc.pipe(writeStream);

        let skippedFiles = {
            bySize: [] as string[],
            byType: [] as string[]
        };

        // Procesar el repositorio con límites y validaciones
        const maxFiles = await dynamicConfig.getMaxFiles();
        const currentFiles = { count: 0 };
        const currentPdfSize = { value: 0 };

        await processDirectory(repoPath, '', {
            repoPath,
            maxFiles,
            currentFiles,
            doc,
            fontSize,
            maxFileSizeKb,
            excludedTypes,
            maxPdfSizeMb,
            includeCommitInfo,
            skippedFiles,
            currentPdfSize
        });

        // Añadir resumen de archivos omitidos al final del PDF
        if (skippedFiles.bySize.length > 0 || skippedFiles.byType.length > 0) {
            doc.addPage()
               .font("Courier")
               .fontSize(fontSize)
               .text("Skipped Files Summary:\n\n");

            if (skippedFiles.bySize.length > 0) {
                doc.text(`Files skipped due to size (>${maxFileSizeKb}KB):\n${skippedFiles.bySize.join('\n')}\n\n`);
            }
            if (skippedFiles.byType.length > 0) {
                doc.text(`Files skipped due to type:\n${skippedFiles.byType.join('\n')}`);
            }
        }

        doc.end();
        // Esperar a que el stream se cierre correctamente
        await new Promise<void>((resolve, reject) => {
            writeStream!.on("finish", resolve);
            writeStream!.on("error", reject);
        });
        console.log(`PDF generated: ${tempPdfPath}`);

        // Mover el PDF a su ubicación final de forma atómica
        const tempFinalPath = `${finalPdfPath}.tmp`;
        await fs.promises.copyFile(tempPdfPath, tempFinalPath);
        await fs.promises.rename(tempFinalPath, finalPdfPath);
        
        return finalPdfPath;
    } catch (error) {
        // Asegurar que el proceso git se mata si existe
        if (gitProcess.pid) {
            await killProcessTree(gitProcess.pid);
        }
        
        // Cerrar recursos en caso de error
        if (doc) {
            try {
                doc.end();
            } catch (closeError) {
                console.error('Error closing PDF document:', closeError);
            }
        }
        if (writeStream) {
            writeStream.destroy();
        }

        // Limpiar archivos en caso de error
        if (finalPdfPath && fs.existsSync(finalPdfPath)) {
            try {
                await fs.promises.unlink(finalPdfPath);
                console.log('Cleaned up incomplete PDF:', finalPdfPath);
            } catch (cleanupError) {
                console.error('Error cleaning up incomplete PDF:', cleanupError);
            }
        }

        console.error("Error generating PDF:", error);
        throw error;
    } finally {
        // Asegurar que los recursos se cierran
        if (doc) {
            try {
                doc.end();
            } catch {}
        }
        if (writeStream) {
            writeStream.destroy();
        }

        // Limpiar directorio de operación de forma segura
        if (operationDir && fs.existsSync(operationDir)) {
            try {
                await fs.promises.rm(operationDir, { recursive: true, force: true });
                console.log(`Cleaned up operation directory: ${operationDir}`);
            } catch (cleanupError) {
                console.error('Error cleaning up operation directory:', cleanupError);
            }
        }
    }
}




