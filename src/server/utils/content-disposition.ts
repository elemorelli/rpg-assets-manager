const UNSAFE_FALLBACK_CHARACTERS = /[^\x20-\x7e]|["\\]/g;
const RFC_5987_RESERVED_CHARACTERS = /['()*]/g;
const HEX_RADIX = 16;

const percentEncodeCharacter = (character: string): string =>
  `%${character.charCodeAt(0).toString(HEX_RADIX).toUpperCase()}`;

// RFC 6266: the quoted "filename" is an ASCII fallback, "filename*" carries the real UTF-8 name.
export const buildAttachmentDisposition = (fileName: string): string => {
  const asciiFallback = fileName.replace(UNSAFE_FALLBACK_CHARACTERS, "_");
  const utf8Encoded = encodeURIComponent(fileName).replace(
    RFC_5987_RESERVED_CHARACTERS,
    percentEncodeCharacter,
  );

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`;
};
