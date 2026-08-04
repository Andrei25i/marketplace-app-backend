import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";

export class AuthController {
  private authService = new AuthService();

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
      const newUser = await this.authService.registerUser({
        first_name,
        last_name,
        email,
        phone_number,
        password,
        city,
      });

      return res.status(201).json({
        message: "Utilizator creat cu succes!",
        user: newUser,
      });
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
      const result = await this.authService.loginUser(email, password);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
        return res.status(401).json({ error: "Email sau parolă incorectă." });
      }

      console.error("Eroare la login:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };
}
