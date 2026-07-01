import fs from "fs";
import path from "path";

const filePath = path.resolve(process.cwd(), "src/components/Navbar.tsx");
const content = fs.readFileSync(filePath, "utf-8");
const lines = content.split("\n");

lines.forEach((line, index) => {
  if (line.includes("totalItems") || line.includes("ShoppingCartIcon") || line.includes("cartItems")) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
