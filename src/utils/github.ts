interface GitHubRepo {
    name: string;
    private: boolean;
    html_url: string;
    description: string | null;
}

export async function validateGithubRepo(url: string): Promise<{ isValid: boolean; error?: string }> {
    try {
        // Extraer owner y repo de la URL
        const match = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
        if (!match) {
            return { isValid: false, error: "Invalid GitHub URL format" };
        }

        const [, owner, repo] = match;
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
        
        console.log("Checking repository at:", apiUrl);
        
        const response = await fetch(apiUrl, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                // Si tienes un token de GitHub, añádelo aquí para evitar límites de rate
                ...(process.env.GITHUB_TOKEN ? {
                    'Authorization': `token ${process.env.GITHUB_TOKEN}`
                } : {})
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return { isValid: false, error: "Repository not found" };
            }
            if (response.status === 403) {
                return { isValid: false, error: "API rate limit exceeded" };
            }
            return { isValid: false, error: `GitHub API error: ${response.statusText}` };
        }

        const data = await response.json() as GitHubRepo;
        
        if (data.private) {
            return { isValid: false, error: "Cannot access private repositories" };
        }

        return { isValid: true };
        
    } catch (error) {
        console.error("Error validating repository:", error);
        return { 
            isValid: false, 
            error: "Failed to validate repository. Please check the URL and try again." 
        };
    }
}

// Función para extraer URLs de GitHub del texto
export function extractGithubUrl(text: string): string | null {
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