import { UserService } from "../services/user.service";
import { Request, Response } from "express";
import { UpdateProfileDTO } from "../types/user.types";

export class UserController {
  private userService = new UserService();

  getMe = async (req: Request, res: Response) => {
    const loggedUserId = req.user?.id;

    if (!loggedUserId) {
      return res.status(401).json({ error: "Neautorizat." });
    }

    try {
      const user = await this.userService.getUserProfile(loggedUserId);

      if (!user) {
        return res
          .status(404)
          .json({ error: "Utilizatorul nu a fost găsit sau nu există." });
      }

      return res.status(200).json(user);
    } catch (error) {
      console.error("Eroare la preluarea profilului:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };

  getPublicUser = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res
        .status(400)
        .json({ error: "ID-ul utilizatorului este invalid." });
    }

    try {
      const user = await this.userService.getPublicProfile(id);

      if (!user) {
        return res
          .status(404)
          .json({ error: "Utilizatorul nu a fost găsit sau nu există." });
      }

      return res.status(200).json(user);
    } catch (error) {
      console.error("Eroare la preluarea profilului public:", error);
      return res.status(500).json({ error: "Eroare la preluarea profilului." });
    }
  };

  deleteAccount = async (req: Request, res: Response) => {
    const loggedUserId = req.user?.id;
    const { password } = req.body;

    if (!loggedUserId) {
      return res.status(401).json({ error: "Neautorizat." });
    }

    if (!password) {
      return res.status(400).json({
        error: "Parola este necesară pentru a confirma ștergerea contului.",
      });
    }

    try {
      await this.userService.deleteAccount(loggedUserId, password);

      return res
        .status(200)
        .json({ message: "Contul a fost șters cu succes." });
    } catch (error) {
      if (error instanceof Error && error.message === "NOT_FOUND") {
        return res.status(404).json({ error: "Utilizatorul nu a fost găsit." });
      }

      if (error instanceof Error && error.message === "INVALID_PASSWORD") {
        return res
          .status(400)
          .json({ error: "Parola incorectă. Ștergerea contului a eșuat." });
      }

      console.error("Eroare la ștergerea contului:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };

  updateProfile = async (req: Request, res: Response) => {
    const loggedUserId = req.user?.id;
    const body: UpdateProfileDTO = req.body;

    if (!loggedUserId) {
      return res.status(401).json({ error: "Neautorizat." });
    }

    const hasDataToUpdate =
      body.first_name ||
      body.last_name ||
      body.email ||
      body.phone_number ||
      body.city;

    if (!hasDataToUpdate) {
      return res.status(400).json({
        error:
          "Nu ați furnizat date noi pentru actualizare. Nicio acțiune nu a fost efectuată.",
      });
    }

    try {
      const updatedUser = await this.userService.updateProfile(
        loggedUserId,
        body,
      );
      return res.status(200).json(updatedUser);
    } catch (error) {
      if (error instanceof Error && error.message === "NOT_FOUND") {
        return res.status(404).json({ error: "Utilizatorul nu a fost găsit." });
      }

      if (error instanceof Error && error.message === "EMAIL_IN_USE") {
        return res
          .status(409)
          .json({ error: "Acest email este deja utilizat de un alt cont." });
      }

      console.error("Eroare la actualizarea profilului:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };
}
