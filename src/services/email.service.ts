import nodemailer from "nodemailer";

export type EmailRecipient = {
  first_name: string;
  email: string;
};

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  private getResetPasswordHtml(
    userFirstName: string,
    resetLink: string,
  ): string {
    return `
    <!doctype html>
    <html lang="ro">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Resetare parolă</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafb; font-family: Inter, Arial, sans-serif; color: #343a40;">
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="background-color: #f8fafb; padding: 32px 16px;"
        >
          <tr>
            <td align="center">
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="max-width: 570px; background-color: #f1f5f5; border: 1px solid #dee2e6; border-radius: 12px; overflow: hidden;"
              >
                <tr>
                  <td style="padding: 28px 32px 20px; text-align: center;">
                    <h1 style="margin: 18px 0 8px; font-size: 24px; line-height: 1.3; color: #343a40;">
                      Resetare parolă
                    </h1>

                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6c757d;">
                      Salut ${userFirstName},
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 0 32px 32px;">
                    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7; color: #495057;">
                      Am primit o solicitare pentru resetarea parolei contului tău.
                      Dacă ai făcut această solicitare, poți seta o parolă nouă
                      folosind butonul de mai jos.
                    </p>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="padding: 16px 0 24px;">
                          <a
                            href="${resetLink}"
                            style="display: inline-block; padding: 13px 26px; border-radius: 8px; background-color: #00897b; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none;"
                          >
                            Setează o parolă nouă
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #6c757d;">
                      Din motive de securitate, acest link va expira în
                      <strong style="color: #495057;">15 minute</strong>.
                    </p>

                    <div style="height: 1px; background-color: #dee2e6;"></div>

                    <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.6; color: #6c757d;">
                      <strong style="color: #495057;">Nu ai solicitat această modificare?</strong><br />
                      Poți ignora acest email în siguranță. Contul tău rămâne protejat.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 20px 32px; text-align: center; background-color: #e9f1f0;">
                    <p style="margin: 0; font-size: 12px; color: #6c757d;">
                      © ${new Date().getFullYear()} reVinde
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
  }

  public async sendPasswordResetEmail(
    user: EmailRecipient,
    resetToken: string,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    const html = this.getResetPasswordHtml(user.first_name, resetLink);

    try {
      await this.transporter.sendMail({
        from: `"reVinde" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Resetarea parolei pentru contul tău reVinde",
        html: html,
      });
    } catch (error) {
      console.error(
        `[EmailService] Eroare la trimiterea emailului către ${user.email}:`,
        error,
      );
    }
  }
}
