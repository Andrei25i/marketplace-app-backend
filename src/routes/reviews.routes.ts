import { Router } from "express";
import { ReviewsController } from "../controllers/reviews.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { reviewWriteLimiter } from "../middlewares/reviewLimiter";
import { validate } from "../middlewares/validate.middleware";
import {
  createReviewBody,
  listReviewsQuery,
  reviewIdParams,
  sellerIdParams,
  updateReviewBody,
} from "../schemas/reviews.schema";

const router = Router();
const reviewsController = new ReviewsController();

router.get(
  "/seller/:sellerId",
  validate({ params: sellerIdParams, query: listReviewsQuery }),
  reviewsController.listForSeller,
);

router.get(
  "/seller/:sellerId/mine",
  authMiddleware,
  validate({ params: sellerIdParams }),
  reviewsController.getMineForSeller,
);
router.get(
  "/mine",
  authMiddleware,
  validate({ query: listReviewsQuery }),
  reviewsController.listWritten,
);

router.post(
  "/",
  authMiddleware,
  reviewWriteLimiter,
  validate({ body: createReviewBody }),
  reviewsController.create,
);
router.patch(
  "/:id",
  authMiddleware,
  reviewWriteLimiter,
  validate({ params: reviewIdParams, body: updateReviewBody }),
  reviewsController.update,
);
router.delete(
  "/:id",
  authMiddleware,
  reviewWriteLimiter,
  validate({ params: reviewIdParams }),
  reviewsController.remove,
);

export default router;
