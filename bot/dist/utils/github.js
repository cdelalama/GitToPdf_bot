"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGithubRepo = validateGithubRepo;
exports.extractGithubUrl = extractGithubUrl;
async function validateGithubRepo(url) {
    try {
        const match = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
        if (!match) {
            return { isValid: false, error: "Invalid GitHub URL format" };
        }
        const [, owner, repo] = match;
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
        console.log("Checking repository at:", apiUrl);
        const response = await fetch(apiUrl);
        // Para repos públicos, incluso sin autenticación podemos continuar
        if (response.status === 401 || response.status === 403) {
            console.log("Warning: Unauthenticated request to GitHub API");
            return { isValid: true }; // Asumimos que es válido y dejamos que el clone lo verifique
        }
        if (!response.ok) {
            if (response.status === 404) {
                return { isValid: false, error: "Repository not found" };
            }
            return { isValid: false, error: `GitHub API error: ${response.statusText}` };
        }
        const data = await response.json();
        if (data.private) {
            return { isValid: false, error: "Cannot access private repositories" };
        }
        return { isValid: true };
    }
    catch (error) {
        console.error("Error validating repository:", error);
        return { isValid: true }; // En caso de error de API, permitimos el intento de clonación
    }
}
// Función para extraer URLs de GitHub del texto
function extractGithubUrl(text) {
    // Remover @ si existe al principio
    text = text.replace(/^@/, '');
    // Regex mejorada para URLs de GitHub
    const githubRegex = /https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/;
    const matches = text.match(githubRegex);
    if (matches) {
        let url = matches[0];
        // Asegurarnos de que la URL es correcta
        url = url.replace(/\.git$/, ''); // Primero removemos .git si existe
        url = url + '.git'; // Luego lo añadimos de forma consistente
        console.log("Extracted GitHub URL:", url);
        return url;
    }
    return null;
}
