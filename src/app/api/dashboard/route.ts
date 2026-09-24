import { dashboard } from "@/lib/progress";
import { ok, serverError } from "@/lib/api";

export async function GET() {
  try {
    return ok(dashboard());
  } catch (error) {
    return serverError("Failed to load dashboard", error);
  }
}
