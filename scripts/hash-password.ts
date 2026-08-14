import { hashPassword } from "./hash-password-core.ts";

const password = process.argv[2];

if (!password) {
  console.error("Usage: node scripts/hash-password.ts <password>");
  process.exit(1);
}

console.log(await hashPassword(password));
