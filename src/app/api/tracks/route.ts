import { trackProgress } from "@/lib/progress";
import { ok, serverError } from "@/lib/api";

export async function GET() {
  try {
    return ok(trackProgress());
  } catch (error) {
    return serverError("Failed to load tracks", error);
  }
}
