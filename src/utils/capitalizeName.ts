export const capitalizeName = (value: string): string =>
  value
    .trim()
    .toLocaleLowerCase("ro-RO")
    .replace(/(^|[\s-])\S/g, (letter) => letter.toLocaleUpperCase("ro-RO"));
