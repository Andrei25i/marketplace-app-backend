import { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middleware";
import { ReviewsService } from "../services/reviews.service";
import type {
  CreateReviewInput,
  ListReviewsQuery,
  ReviewIdParams,
  SellerIdParams,
  UpdateReviewInput,
} from "../types/reviews.type";

const REVIEW_ERRORS: Record<string, [number, string]> = {
  SELF_REVIEW: [400, "Nu îți poți lăsa o recenzie ție însuți."],
  SELLER_NOT_FOUND: [404, "Vânzătorul nu a fost găsit."],
  ALREADY_REVIEWED: [
    409,
    "Ai lăsat deja o recenzie acestui vânzător. O poți modifica oricând.",
  ],
  NOT_FOUND: [404, "Recenzia nu a fost găsită."],
  FORBIDDEN: [403, "Poți modifica sau șterge doar recenziile scrise de tine."],
};

const sendReviewError = (res: Response, error: unknown, context: string) => {
  const mapped =
    error instanceof Error ? REVIEW_ERRORS[error.message] : undefined;

  if (mapped) {
    const [status, message] = mapped;
    return res.status(status).json({ error: message });
  }

  console.error(`${context}:`, error);
  return res.status(500).json({ error: "Eroare internă a serverului." });
};

export class ReviewsController {
  private reviewsService = new ReviewsService();

  private requireUser(req: Request, res: Response): string | null {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Neautorizat." });
      return null;
    }
    return userId;
  }

  listForSeller = async (req: Request, res: Response) => {
    const { sellerId } = getValidated<SellerIdParams>(req, "params");
    const query = getValidated<ListReviewsQuery>(req, "query");

    try {
      const page = await this.reviewsService.listForSeller(sellerId, query);
      return res.status(200).json(page);
    } catch (error) {
      return sendReviewError(
        res,
        error,
        "Eroare la listarea recenziilor vânzătorului",
      );
    }
  };

  getMineForSeller = async (req: Request, res: Response) => {
    const me = this.requireUser(req, res);
    if (!me) return;

    const { sellerId } = getValidated<SellerIdParams>(req, "params");

    try {
      const review = await this.reviewsService.getMineForSeller(me, sellerId);
      return res.status(200).json({ review });
    } catch (error) {
      return sendReviewError(
        res,
        error,
        "Eroare la preluarea recenziei proprii",
      );
    }
  };

  listWritten = async (req: Request, res: Response) => {
    const me = this.requireUser(req, res);
    if (!me) return;

    const query = getValidated<ListReviewsQuery>(req, "query");

    try {
      const page = await this.reviewsService.listWritten(me, query);
      return res.status(200).json(page);
    } catch (error) {
      return sendReviewError(
        res,
        error,
        "Eroare la listarea recenziilor scrise",
      );
    }
  };

  create = async (req: Request, res: Response) => {
    const me = this.requireUser(req, res);
    if (!me) return;

    const body = req.body as CreateReviewInput;

    try {
      const review = await this.reviewsService.create(me, body);
      return res.status(201).json(review);
    } catch (error) {
      return sendReviewError(res, error, "Eroare la crearea recenziei");
    }
  };

  update = async (req: Request, res: Response) => {
    const me = this.requireUser(req, res);
    if (!me) return;

    const { id } = getValidated<ReviewIdParams>(req, "params");
    const body = req.body as UpdateReviewInput;

    try {
      const review = await this.reviewsService.update(me, id, body);
      return res.status(200).json(review);
    } catch (error) {
      return sendReviewError(res, error, "Eroare la actualizarea recenziei");
    }
  };

  remove = async (req: Request, res: Response) => {
    const me = this.requireUser(req, res);
    if (!me) return;

    const { id } = getValidated<ReviewIdParams>(req, "params");

    try {
      const { sellerId } = await this.reviewsService.remove(me, id);
      return res
        .status(200)
        .json({ message: "Recenzia a fost ștearsă.", sellerId });
    } catch (error) {
      return sendReviewError(res, error, "Eroare la ștergerea recenziei");
    }
  };
}
