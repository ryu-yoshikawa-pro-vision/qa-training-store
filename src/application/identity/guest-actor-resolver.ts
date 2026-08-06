import type { ProductViewer } from "@/application/contracts";

/** Native Foundation identity: the first-half surface is Guest-only. */
export class GuestActorResolver {
  async getCurrentEntity(): Promise<null> {
    return null;
  }

  async getViewer(): Promise<ProductViewer> {
    return { kind: "guest" };
  }
}
