import { redirect } from "next/navigation";

export default function CompatibilityPage() {
  redirect("/barn?tab=compatibility");
}
