import nodemailer from 'nodemailer';
import logger from './logger';

interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}

interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
}

class EmailService {
    private transporter: nodemailer.Transporter | null = null;
    private isConfigured: boolean = false;
    private fromAddress: string;

    constructor() {
        this.fromAddress = process.env.EMAIL_FROM || 'noreply@allooral.com';
        this.initializeTransporter();
    }

    private initializeTransporter(): void {
        const host = process.env.SMTP_HOST;
        const port = parseInt(process.env.SMTP_PORT || '587', 10);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (!host || !user || !pass) {
            logger.warn('Email service not configured: missing SMTP credentials');
            logger.warn('Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables');
            this.isConfigured = false;
            return;
        }

        const config: EmailConfig = {
            host,
            port,
            secure: port === 465,
            auth: {
                user,
                pass,
            },
        };

        this.transporter = nodemailer.createTransport(config);
        this.isConfigured = true;
        logger.info('Email service configured successfully');
    }

    async sendEmail(options: EmailOptions): Promise<boolean> {
        if (!this.isConfigured || !this.transporter) {
            logger.error('Email service not configured, cannot send email');
            return false;
        }

        try {
            const info = await this.transporter.sendMail({
                from: this.fromAddress,
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
            });

            logger.info(`Email sent: ${info.messageId}`);
            return true;
        } catch (error) {
            logger.error('Failed to send email:', error);
            return false;
        }
    }

    async sendPasswordResetEmail(
        email: string,
        resetToken: string,
        userName?: string
    ): Promise<boolean> {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        // SPA-friendly link: keep path on '/', pass state via query params.
        const resetUrl = `${frontendUrl}/?mode=reset&email=${encodeURIComponent(email)}&token=${encodeURIComponent(resetToken)}`;
        const expirationMinutes = 15;

        const subject = 'Redefinição de Senha - Allo Oral Clinic';

        const text = `
Olá${userName ? ` ${userName}` : ''},

Recebemos uma solicitação para redefinir a senha da sua conta no Allo Oral Clinic.

Para redefinir sua senha, acesse o link abaixo:
${resetUrl}

Este link expira em ${expirationMinutes} minuto(s).

Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá inalterada.

Atenciosamente,
Equipe Allo Oral Clinic
        `.trim();

        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redefinição de Senha</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
        }
        .button:hover {
            opacity: 0.9;
        }
        .warning {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .footer {
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            margin-top: 30px;
        }
        .link-text {
            word-break: break-all;
            font-size: 12px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🦷 Allo Oral Clinic</h1>
    </div>
    <div class="content">
        <p>Olá${userName ? ` <strong>${userName}</strong>` : ''},</p>
        
        <p>Recebemos uma solicitação para redefinir a senha da sua conta no Allo Oral Clinic.</p>
        
        <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Redefinir Minha Senha</a>
        </p>
        
        <p class="link-text">
            Ou copie e cole este link no seu navegador:<br>
            ${resetUrl}
        </p>
        
        <div class="warning">
            <strong>⚠️ Atenção:</strong> Este link expira em <strong>${expirationMinutes} minuto(s)</strong>.
        </div>
        
        <p>Se você não solicitou esta redefinição de senha, ignore este email. Sua senha permanecerá inalterada e sua conta continuará segura.</p>
        
        <p>Atenciosamente,<br>
        <strong>Equipe Allo Oral Clinic</strong></p>
    </div>
    <div class="footer">
        <p>Este é um email automático. Por favor, não responda.</p>
        <p>© ${new Date().getFullYear()} Allo Oral Clinic. Todos os direitos reservados.</p>
    </div>
</body>
</html>
        `.trim();

        return this.sendEmail({
            to: email,
            subject,
            text,
            html,
        });
    }

    async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
        const subject = 'Bem-vindo ao Allo Oral Clinic!';

        const text = `
Olá ${userName},

Bem-vindo ao Allo Oral Clinic!

Sua conta foi criada com sucesso. Você já pode acessar o sistema e começar a gerenciar seus pacientes e oportunidades.

Acesse: ${process.env.FRONTEND_URL || 'http://localhost:5173'}

Atenciosamente,
Equipe Allo Oral Clinic
        `.trim();

        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🦷 Bem-vindo ao Allo Oral Clinic!</h1>
    </div>
    <div class="content">
        <p>Olá <strong>${userName}</strong>,</p>
        
        <p>Sua conta foi criada com sucesso! Agora você pode acessar o sistema e começar a gerenciar seus pacientes e oportunidades de forma eficiente.</p>
        
        <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">Acessar o Sistema</a>
        </p>
        
        <p>Se precisar de ajuda, não hesite em entrar em contato conosco.</p>
        
        <p>Atenciosamente,<br>
        <strong>Equipe Allo Oral Clinic</strong></p>
    </div>
</body>
</html>
        `.trim();

        return this.sendEmail({
            to: email,
            subject,
            text,
            html,
        });
    }

    async verifyConnection(): Promise<boolean> {
        if (!this.isConfigured || !this.transporter) {
            return false;
        }

        try {
            await this.transporter.verify();
            logger.info('Email service connection verified');
            return true;
        } catch (error) {
            logger.error('Email service connection failed:', error);
            return false;
        }
    }

    isServiceConfigured(): boolean {
        return this.isConfigured;
    }
}

// Singleton instance
export const emailService = new EmailService();
