import { redirect } from "next/navigation";

export default function HorsesPage() {
  redirect("/barn?tab=horses");
}
