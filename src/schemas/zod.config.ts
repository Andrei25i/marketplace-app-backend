import { z } from "zod";

z.config({
  customError: (issue) => {
    switch (issue.code) {
      case "invalid_type":
        return issue.input === undefined
          ? "Câmpul este obligatoriu."
          : "Valoarea are un format greșit.";
      case "invalid_value":
        return "Valoarea nu este permisă.";
      case "too_small":
        return "Valoarea este prea scurtă sau prea mică.";
      case "too_big":
        return "Valoarea este prea lungă sau prea mare.";
      case "invalid_format":
        return "Formatul valorii este invalid.";
      default:
        return "Valoare invalidă.";
    }
  },
});
