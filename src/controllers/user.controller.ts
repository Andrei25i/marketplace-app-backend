import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import { clearAuthCookies } from "../utils/authCookies";
import { disconnectUser } from "../realtime/disconnect";
import { ChatEvents } from "../realtime/chat.events";
import { fieldError, getValidated } from "../middlewares/validate.middleware";
import type {
  DeleteAccountInput,
  UpdateProfileDTO,
  UserIdParams,
} from "../types/user.type";

export class UserController {
  private userService = new UserService();
  private chatEvents = new ChatEvents();

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
    const { id } = getValidated<UserIdParams>(req, "params");

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
    if (!loggedUserId) {
      return res.status(401).json({ error: "Neautorizat." });
    }

    const { password } = req.body as DeleteAccountInput;

    try {
      const removed = await this.userService.deleteAccount(
        loggedUserId,
        password,
      );
      disconnectUser(loggedUserId);

      for (const { conversationId, otherUserId } of removed) {
        this.chatEvents.conversationHidden(otherUserId, conversationId);
      }

      clearAuthCookies(res);

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
          .json(
            fieldError(
              "password",
              "Parola incorectă. Ștergerea contului a eșuat.",
            ),
          );
      }

      console.error("Eroare la ștergerea contului:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };

  updateProfile = async (req: Request, res: Response) => {
    const loggedUserId = req.user?.id;
    if (!loggedUserId) {
      return res.status(401).json({ error: "Neautorizat." });
    }

    const body = req.body as UpdateProfileDTO;

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
          .json(
            fieldError(
              "email",
              "Acest email este deja utilizat de un alt cont.",
            ),
          );
      }

      console.error("Eroare la actualizarea profilului:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };
}
