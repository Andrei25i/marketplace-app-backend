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
        <div style="font-family: Montserrat, Helvetica, sans-serif; max-width: 600px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            
            <div style="background-color: #f9f9f9; padding: 20px 30px;">
                <h2 style="margin: 0; color: #333;">Solicitare pentru resetarea parolei</h2>
            </div>
            
            <div style="padding: 30px; line-height: 1.6;">
                <p>Salut ${userFirstName},</p>
                
                <p>Am primit o solicitare pentru a reseta parola contului tău asociat cu această adresă de email. Dacă tu ai făcut această cerere, poți seta o parolă nouă dând click pe butonul de mai jos:</p>
                
                <p style="margin: 30px 0; text-align: center;">
                    <a href="${resetLink}" 
                    style="background-color: #4376FB; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    Setează o parolă nouă
                    </a>
                </p>
                
                <p>Din motive de securitate, acest link va expira în <strong>15 minute</strong>.</p>
                
                <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                
                <p style="font-size: 0.9em; color: #555;">
                    <strong>Nu ai solicitat tu această modificare?</strong>
                    <br>
                    Dacă nu ai cerut resetarea parolei, poți ignora acest email în siguranță. Contul tău este protejat.
                </p>
            </div>
            
            <div style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; color: #888; font-size: 0.8em;">
                <p style="margin: 0;">© ${new Date().getFullYear()} reVinde. Toate drepturile rezervate.</p>
            </div>
        </div>
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
      console.log(`[EmailService] Link de resetare trimis către ${user.email}`);
    } catch (error) {
      console.error(
        `[EmailService] Eroare la trimiterea emailului către ${user.email}:`,
        error,
      );
    }
  }
}
