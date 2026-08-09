import { UserService } from "../services/user.service";
import { Request, Response } from "express";

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
        return res.status(404).json({ error: "Utilizatorul nu a fost găsit sau nu există." });
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
}
