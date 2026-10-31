import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { UserService } from "../services/user.service";
import { sessionService } from "../services/session.service";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from "../utils/authCookies";
import { isUuid } from "../utils/isUuid";
import { getClientIp } from "../utils/clientIp";
import { disconnectSession, disconnectUser } from "../realtime/disconnect";

const MIN_PASSWORD_LENGTH = 6;

const clientInfo = (req: Request) => ({
  userAgent: req.get("user-agent"),
  ip: getClientIp(req),
});

export class AuthController {
  private authService = new AuthService();
  private userService = new UserService();

  register = async (req: Request, res: Response) => {
    const { first_name, last_name, email, phone_number, password, city } =
      req.body;

    if (
      !first_name ||
      !last_name ||
      !email ||
      !phone_number ||
      !password ||
      !city
    ) {
      return res
        .status(400)
        .json({ error: "Toate câmpurile marcate sunt obligatorii." });
    }

    try {
      const user = await this.authService.registerUser({
        first_name,
        last_name,
        email,
        phone_number,
        password,
        city,
      });

      const tokens = await sessionService.createSession(
        user.id,
        clientInfo(req),
      );
      setAuthCookies(res, tokens);

      return res
        .status(201)
        .json({ message: "Utilizator creat cu succes!", user });
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_EXISTS") {
        return res
          .status(409)
          .json({ error: "Acest email este deja înregistrat." });
      }

      console.error("Eroare la înregistrare:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email-ul și parola sunt obligatorii." });
    }

    try {
      const user = await this.authService.loginUser(email, password);
      const tokens = await sessionService.createSession(
        user.id,
        clientInfo(req),
      );
      setAuthCookies(res, tokens);

      return res.status(200).json({ user });
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
        return res.status(401).json({ error: "Email sau parolă incorectă." });
      }

      console.error("Eroare la login:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };

  refresh = async (req: Request, res: Response) => {
    try {
      const result = await sessionService.rotate(req.cookies?.[REFRESH_COOKIE]);

      if (!result.ok) {
        clearAuthCookies(res);
        return res.status(401).json({
          error: "Sesiunea a expirat. Autentifică-te din nou.",
          code: "REFRESH_INVALID",
        });
      }

      const user = await this.userService.getUserProfile(result.userId);

      if (!user) {
        clearAuthCookies(res);
        return res.status(401).json({
          error: "Utilizatorul nu mai există.",
          code: "REFRESH_INVALID",
        });
      }

      setAuthCookies(res, result.tokens);
      return res.status(200).json({ user });
    } catch (error) {
      console.error("Eroare la refresh:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };

  logout = async (req: Request, res: Response) => {
    try {
      const sessionId = await sessionService.revokeFromCookies(
        req.cookies?.[REFRESH_COOKIE],
        req.cookies?.[ACCESS_COOKIE],
      );
      if (sessionId) disconnectSession(sessionId);
    } catch (error) {
      console.error("Eroare la logout:", error);
    }

    clearAuthCookies(res);
    return res.status(204).end();
  };

  changePassword = async (req: Request, res: Response) => {
    const auth = req.user;
    if (!auth) {
      return res.status(401).json({ error: "Neautorizat." });
    }

    const { currentPassword, newPassword } = req.body ?? {};

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      !newPassword
    ) {
      return res
        .status(400)
        .json({ error: "Parola actuală și parola nouă sunt obligatorii." });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        error: `Parola nouă trebuie să aibă minim ${MIN_PASSWORD_LENGTH} caractere.`,
      });
    }

    if (newPassword === currentPassword) {
      return res
        .status(400)
        .json({ error: "Parola nouă trebuie să fie diferită de cea actuală." });
    }

    try {
      await this.authService.changePassword(
        auth.id,
        auth.sessionId,
        currentPassword,
        newPassword,
      );
      disconnectUser(auth.id, auth.sessionId);

      return res.status(200).json({
        message:
          "Parola a fost schimbată. Celelalte dispozitive au fost deconectate.",
      });
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_PASSWORD") {
        return res
          .status(400)
          .json({ error: "Parola actuală este incorectă." });
      }

      if (error instanceof Error && error.message === "USER_NOT_FOUND") {
        return res.status(404).json({ error: "Utilizatorul nu a fost găsit." });
      }

      console.error("Eroare la schimbarea parolei:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };

  listSessions = async (req: Request, res: Response) => {
    const auth = req.user;
    if (!auth) {
      return res.status(401).json({ error: "Neautorizat." });
    }

    try {
      const sessions = await sessionService.listForUser(
        auth.id,
        auth.sessionId,
      );
      return res.status(200).json({ sessions });
    } catch (error) {
      console.error("Eroare la listarea sesiunilor:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };

  revokeSession = async (req: Request, res: Response) => {
    const auth = req.user;
    if (!auth) {
      return res.status(401).json({ error: "Neautorizat." });
    }

    const { id } = req.params;

    if (typeof id !== "string" || !isUuid(id)) {
      return res.status(400).json({ error: "ID-ul sesiunii este invalid." });
    }

    try {
      const count = await sessionService.revokeForUser(auth.id, id);

      if (count === 0) {
        return res.status(404).json({ error: "Sesiunea nu a fost găsită." });
      }
      disconnectSession(id);

      if (id === auth.sessionId) {
        clearAuthCookies(res);
      }

      return res.status(204).end();
    } catch (error) {
      console.error("Eroare la revocarea sesiunii:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };

  revokeOtherSessions = async (req: Request, res: Response) => {
    const auth = req.user;
    if (!auth) {
      return res.status(401).json({ error: "Neautorizat." });
    }

    try {
      const revoked = await sessionService.revokeAllForUser(
        auth.id,
        auth.sessionId,
      );
      disconnectUser(auth.id, auth.sessionId);
      return res.status(200).json({ revoked });
    } catch (error) {
      console.error("Eroare la revocarea sesiunilor:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };

  forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ error: "Adresa de email este obligatorie." });
    }

    try {
      await this.authService.forgotPassword(email);

      return res.status(200).json({
        message:
          "Un link de resetare a parolei a fost trimis la adresa de email.",
      });
    } catch (error) {
      console.error("Eroare la forgot-password:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };

  resetPassword = async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ error: "Token-ul și noua parolă sunt necesare." });
    }

    if (
      typeof newPassword !== "string" ||
      newPassword.length < MIN_PASSWORD_LENGTH
    ) {
      return res.status(400).json({
        error: `Parola trebuie să aibă minim ${MIN_PASSWORD_LENGTH} caractere.`,
      });
    }

    try {
      const userId = await this.authService.resetPassword(token, newPassword);
      disconnectUser(userId);
      clearAuthCookies(res);

      return res
        .status(200)
        .json({ message: "Parola a fost resetată cu succes." });
    } catch (error) {
      if (error instanceof Error && error.message === "USER_NOT_FOUND") {
        return res.status(404).json({ error: "Utilizatorul nu a fost găsit." });
      }

      return res
        .status(400)
        .json({ error: "Link-ul de resetare este invalid sau a expirat." });
    }
  };
}
