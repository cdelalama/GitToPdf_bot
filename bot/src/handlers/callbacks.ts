import { MyContext } from "../types/context";
import { InputFile } from "grammy";
import * as fs from "fs";
import path from "path";
import { githubToPdf } from "../modules/githubToPdf";
import { Database } from "../utils/database";
import { deleteMessages, deleteMessageAfterTimeout } from "../utils/messages";
import { dynamicConfig } from "../config/config";
import { handleError } from "../utils/errors";

// Control de procesos concurrentes
let currentProcesses = 0;

export async function handleGeneratePdf(ctx: MyContext): Promise<void> {
    let pdfPath: string | null = null;
    let fileStream: fs.ReadStream | null = null;
    let githubUrl: string | null = null;
    const startTime = Date.now();

    try {
        if (!ctx.callbackQuery?.data) {
            throw new Error('Invalid callback data');
        }

        // Verificar límite de procesos concurrentes
        const maxProcesses = await dynamicConfig.getMaxConcurrentProcesses();
        if (currentProcesses >= maxProcesses) {
            throw new Error('Too many concurrent processes. Please try again later.');
        }

        // Extraer URL de GitHub
        githubUrl = ctx.callbackQuery.data.split(':')[1];
        if (!githubUrl) {
            throw new Error('No GitHub URL provided');
        }

        // Validar URL
        if (!githubUrl.startsWith('https://github.com')) {
            throw new Error('⚠️ Please send a valid GitHub repository URL.');
        }

        // Incrementar contador de procesos
        currentProcesses++;

        // Obtener mensaje de procesamiento
        const processingMessage = await dynamicConfig.getProcessingMessage();
        
        // Notificar inicio del proceso
        await ctx.answerCallbackQuery(processingMessage);

        // Generar PDF
        pdfPath = await githubToPdf(githubUrl);

        // Verificar tamaño del PDF
        const stats = fs.statSync(pdfPath);
        const pdfSizeMb = stats.size / (1024 * 1024);
        const maxPdfSizeMb = await dynamicConfig.getMaxPdfSizeMb();
        if (pdfSizeMb > maxPdfSizeMb) {
            throw new Error(`PDF size (${pdfSizeMb.toFixed(2)}MB) exceeds maximum allowed size (${maxPdfSizeMb}MB)`);
        }

        // Preparar información del PDF
        const pdfInfo = `\n\nRepository: ${path.basename(githubUrl)}\nSize: ${pdfSizeMb.toFixed(2)}MB\nGeneration time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`;

        // Enviar documento
        fileStream = fs.createReadStream(pdfPath);
        const document = await ctx.replyWithDocument(new InputFile(fileStream, path.basename(pdfPath)), {
            caption: await dynamicConfig.getSuccessMessage() + pdfInfo
        });

        // Solo si el documento se envió correctamente, registrar éxito
        if (document) {
            await Database.supabase
                .from('pdf_generations')
                .insert([{
                    telegram_id: ctx.from?.id,
                    repository_url: githubUrl,
                    pdf_size: pdfSizeMb,
                    generation_time: Date.now() - startTime,
                    status: 'success'
                }]);
        }

    } catch (error) {
        // Registrar error en la base de datos
        if (ctx.from?.id && githubUrl) {
            await Database.supabase
                .from('pdf_generations')
                .insert([{
                    telegram_id: ctx.from.id,
                    repository_url: githubUrl,
                    status: 'error',
                    error_message: error instanceof Error ? error.message : 'Unknown error'
                }]);
        }
        await handleError(error, ctx, 'Generate PDF');
    } finally {
        // Limpiar recursos y decrementar contador
        if (fileStream) {
            fileStream.destroy();
        }
        if (pdfPath && fs.existsSync(pdfPath)) {
            try {
                fs.unlinkSync(pdfPath);
                console.log("Temporary PDF file deleted:", pdfPath);
            } catch (error) {
                console.error("Error deleting PDF file:", error);
            }
        }
        currentProcesses--;
    }
}

export async function handleCancel(ctx: MyContext): Promise<void> {
    try {
        await ctx.answerCallbackQuery('Operation cancelled');
        await ctx.deleteMessage();
    } catch (error) {
        await handleError(error, ctx, 'Cancel Operation');
    }
}

export async function handleApproveUser(ctx: MyContext): Promise<void> {
    try {
        if (!ctx.callbackQuery?.data) {
            throw new Error('Invalid callback data');
        }
        const userId = Number(ctx.callbackQuery.data.split(':')[1]);
        if (!userId) {
            throw new Error('No user ID provided');
        }

        // Actualizar estado del usuario a activo
        const { error: updateError } = await Database.supabase
            .from('users_git2pdf_bot')
            .update({ status: 'active' })
            .eq('telegram_id', userId);

        if (updateError) {
            throw new Error(`Failed to update user status: ${updateError.message}`);
        }

        // Obtener información del usuario
        const { data: userData } = await Database.supabase
            .from('users_git2pdf_bot')
            .select('username, first_name, last_name')
            .eq('telegram_id', userId)
            .single();

        // Notificar al admin que la acción fue exitosa
        await ctx.answerCallbackQuery('User approved successfully');

        // Actualizar mensaje original con la información de aprobación
        const approvalInfo = `✅ User Approved\n\nUser: ${userData?.username ? '@' + userData.username : userData?.first_name || 'Unknown'}\nID: ${userId}\nStatus: Active\nAction by: ${ctx.from?.username ? '@' + ctx.from.username : ctx.from?.first_name || 'Unknown'}`;
        await ctx.editMessageText(approvalInfo);

        // Notificar al usuario que ha sido aprobado
        try {
            const approvalMessage = await dynamicConfig.getApprovalMessage();
            await ctx.api.sendMessage(userId, approvalMessage);
        } catch (error) {
            console.error(`Failed to notify user ${userId} about approval:`, error);
        }

        // Notificar a otros admins
        const admins = await Database.getAdmins();
        const adminMessage = `User has been approved\n\n${approvalInfo}`;
        
        for (const admin of admins) {
            // No notificar al admin que realizó la acción
            if (admin.telegram_id !== ctx.from?.id) {
                try {
                    await ctx.api.sendMessage(admin.telegram_id, adminMessage);
                } catch (error) {
                    console.error(`Failed to notify admin ${admin.telegram_id}:`, error);
                }
            }
        }
    } catch (error) {
        await handleError(error, ctx, 'Approve User');
    }
}

// Función auxiliar para manejar el rechazo de usuario
async function handleUserRejection(userId: number, ctx: MyContext): Promise<void> {
    // 1. Actualizar estado del usuario
    const { error: updateError } = await Database.supabase
        .from('users_git2pdf_bot')
        .update({ 
            status: 'rejected',
            rejected_at: new Date().toISOString(),
            rejected_by: ctx.from?.id,
            rejection_reason: 'Admin rejection'
        })
        .eq('telegram_id', userId);

    if (updateError) {
        throw new Error(`Failed to update user status: ${updateError.message}`);
    }

    // 2. Limpiar datos de sesión si existen
    const { error: deleteSessionError } = await Database.supabase
        .from('user_sessions')
        .delete()
        .eq('telegram_id', userId);

    if (deleteSessionError) {
        console.error(`Failed to delete user session: ${deleteSessionError.message}`);
    }

    // 3. Registrar en historial
    const { error: historyError } = await Database.supabase
        .from('user_status_history')
        .insert([{
            telegram_id: userId,
            status: 'rejected',
            changed_by: ctx.from?.id,
            change_reason: 'Admin rejection'
        }]);

    if (historyError) {
        console.error(`Failed to record status history: ${historyError.message}`);
    }
}

export async function handleRejectUser(ctx: MyContext): Promise<void> {
    try {
        if (!ctx.callbackQuery?.data) {
            throw new Error('Invalid callback data');
        }
        const userId = Number(ctx.callbackQuery.data.split(':')[1]);
        if (!userId) {
            throw new Error('No user ID provided');
        }

        // Manejar el rechazo del usuario
        await handleUserRejection(userId, ctx);

        // Obtener información del usuario
        const { data: userData } = await Database.supabase
            .from('users_git2pdf_bot')
            .select('username, first_name, last_name')
            .eq('telegram_id', userId)
            .single();

        // Notificar al admin que la acción fue exitosa
        await ctx.answerCallbackQuery('User rejected successfully');

        // Actualizar mensaje original con la información de rechazo
        const rejectionInfo = `❌ User Rejected\n\nUser: ${userData?.username ? '@' + userData.username : userData?.first_name || 'Unknown'}\nID: ${userId}\nStatus: Rejected\nAction by: ${ctx.from?.username ? '@' + ctx.from.username : ctx.from?.first_name || 'Unknown'}\nTime: ${new Date().toISOString()}`;
        await ctx.editMessageText(rejectionInfo);

        // Notificar al usuario que ha sido rechazado
        try {
            const rejectionMessage = await dynamicConfig.getRejectionMessage();
            await ctx.api.sendMessage(userId, rejectionMessage);
        } catch (error) {
            console.error(`Failed to notify user ${userId} about rejection:`, error);
        }

        // Notificar a otros admins
        const admins = await Database.getAdmins();
        const adminMessage = `User has been rejected\n\n${rejectionInfo}`;
        
        for (const admin of admins) {
            // No notificar al admin que realizó la acción
            if (admin.telegram_id !== ctx.from?.id) {
                try {
                    await ctx.api.sendMessage(admin.telegram_id, adminMessage);
                } catch (error) {
                    console.error(`Failed to notify admin ${admin.telegram_id}:`, error);
                }
            }
        }
    } catch (error) {
        await handleError(error, ctx, 'Reject User');
    }
} 